import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as fabric from 'fabric'

export const useBezierDrawingStore = defineStore('bezierDrawing', () => {
  const canvasRef = ref<(() => fabric.Canvas | null) | null>(null)
  const isCreatingBezier = ref(false) // 添加标志位防止递归
  const animationId = ref<number | null>(null) // 添加动画ID引用

  // 设置 canvas 引用
  function setCanvas(canvas: () => fabric.Canvas | null) {
    canvasRef.value = canvas
  }

  // 从路径中采样点并创建多段贝塞尔曲线
  function createBezierFromPath(path: fabric.Path) {
    if (isCreatingBezier.value) return // 防止递归调用

    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance || !path.path) return

    isCreatingBezier.value = true // 设置标志位

    try {
      // 获取路径上的点
      const points = path.path
      console.log(points)
      const sampledPoints = samplePathPoints(points, 20)

      if (sampledPoints.length < 4) {
        isCreatingBezier.value = false
        return
      }

      // 创建多段贝塞尔曲线
      createMultiSegmentBezier(sampledPoints)

      // 移除原始路径
      canvasInstance.remove(path)
      canvasInstance.renderAll()
    } finally {
      isCreatingBezier.value = false // 确保标志位被重置
    }
  }

  // 从路径中采样指定数量的点
  function samplePathPoints(path: any[], targetCount: number) {
    const points: { x: number, y: number }[] = []

    // 提取所有路径点
    const allPoints: { x: number, y: number }[] = []

    path.forEach((segment: any) => {
      if (segment[0] === 'M' || segment[0] === 'L') {
        // 移动到点或直线到点
        allPoints.push({ x: segment[1], y: segment[2] })
      } else if (segment[0] === 'Q') {
        // 二次贝塞尔曲线
        allPoints.push({ x: segment[1], y: segment[2] })
        allPoints.push({ x: segment[3], y: segment[4] })
      } else if (segment[0] === 'C') {
        // 三次贝塞尔曲线
        allPoints.push({ x: segment[1], y: segment[2] })
        allPoints.push({ x: segment[3], y: segment[4] })
        allPoints.push({ x: segment[5], y: segment[6] })
      }
    })

    if (allPoints.length === 0) return []

    // 均匀采样
    const step = Math.max(1, (allPoints.length - 1) / (targetCount - 1))
    for (let i = 0; i < targetCount; i++) {
      const index = Math.min(Math.floor(i * step), allPoints.length - 1)
      points.push(allPoints[index])
    }

    return points
  }

  // 创建多段贝塞尔曲线
  function createMultiSegmentBezier(points: { x: number, y: number }[]) {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // 检查是否已存在 emitter，如果存在则先清除
    const existingEmitter = canvasInstance.getObjects().find(obj => obj.dataType === 'emitter')
    if (existingEmitter) {
      canvasInstance.remove(existingEmitter)
      canvasInstance.renderAll()
    }

    const bezierPaths: fabric.Path[] = []

    // 每4个点创建一段贝塞尔曲线
    for (let i = 0; i <= points.length - 4; i += 3) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2]
      const p4 = points[i + 3]

      // 创建三次贝塞尔曲线
      const bezierPath = new fabric.Path(
        `M ${p1.x} ${p1.y} C ${p2.x} ${p2.y} ${p3.x} ${p3.y} ${p4.x} ${p4.y}`,
        {
          stroke: '#0066cc',
          strokeWidth: 8,
          fill: '',
          strokeDashArray: [10, 10], // 添加虚线样式：5像素实线，5像素空白
          // dataType: 'emitter' // 设置dataType为emitter
        }
      )

      bezierPaths.push(bezierPath)
    }

    // 创建group包含所有贝塞尔曲线段
    if (bezierPaths.length > 0) {
      const bezierGroup = new fabric.Group(bezierPaths, {
        dataType: 'emitter',
        selectable: false,
        evented: false,
        hasControls: false
      })
      
      // 将group添加到画布
      canvasInstance.add(bezierGroup) 
      canvasInstance.renderAll()

      // 启动虚线动画
      startDashAnimation()
    }
  }

  // 启动虚线动画
  function startDashAnimation() {
    // 停止之前的动画
    if (animationId.value) {
      cancelAnimationFrame(animationId.value)
    }

    let offset = 0
    let lastTime = performance.now()
    const targetFPS = 60 // 目标帧率
    const frameInterval = 1000 / targetFPS // 每帧的时间间隔（毫秒）
    const pixelsPerSecond = 30 // 每秒移动的像素数

    const animate = (currentTime: number) => {
      const canvasInstance = canvasRef.value?.()
      if (!canvasInstance) return

      // 计算时间差
      const deltaTime = currentTime - lastTime
      
      // 控制帧率，确保动画速度一致
      if (deltaTime >= frameInterval) {
        // 计算这一帧应该移动的距离
        const pixelsPerFrame = (pixelsPerSecond * deltaTime) / 1000
        
        // 更新偏移量
        offset -= pixelsPerFrame
        
        // 只对emitter类型的对象应用动画
        canvasInstance.getObjects().forEach(obj => {
          if (obj.dataType === 'emitter') {
            obj.getObjects().forEach((groupObj: any) => {
              if (groupObj.type === 'path') {
                groupObj.set('strokeDashOffset', offset)
              }
            })
          }
        })

        canvasInstance.renderAll()
        lastTime = currentTime
      }

      // 继续动画循环
      animationId.value = requestAnimationFrame(animate)
    }

    animate()
  }

  // 停止虚线动画
  function stopDashAnimation() {
    if (animationId.value) {
      cancelAnimationFrame(animationId.value)
      animationId.value = null
    }
  }

  // 清理所有贝塞尔曲线（可选功能）
  function clearAllBezierCurves() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // 停止动画
    stopDashAnimation()

    // 清理所有绘制的线条
    canvasInstance.getObjects().forEach(obj => {
      if (obj.dataType === 'emitter') {
        canvasInstance.remove(obj)
      }
    })

    canvasInstance.renderAll()
  }

  return {
    setCanvas,
    clearAllBezierCurves,
    createBezierFromPath,
    isCreatingBezier,
    startDashAnimation,
    stopDashAnimation
  }
})
