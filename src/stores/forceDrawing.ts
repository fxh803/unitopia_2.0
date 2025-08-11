import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as fabric from 'fabric'

export const useForceDrawingStore = defineStore('forceDrawing', () => {
  const canvasRef = ref<(() => fabric.Canvas | null) | null>(null)
  const animationId = ref<number | null>(null) // 添加动画ID引用
  const forceType = ref<'fieldForce' | 'pointForce' | null>(null)
  // 设置 canvas 引用
  function setCanvas(canvas: () => fabric.Canvas | null) {
    canvasRef.value = canvas
  }

  // 添加 force 点点击监听器
  function addForcePointListener() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // 移除之前的事件监听器
    canvasInstance.off('mouse:down')

    // 添加新的点击事件监听器
    canvasInstance.on('mouse:down', (options) => {
      if (options.pointer) {
        const pointer = canvasInstance.getPointer(options.e)
        addForcePoint(pointer.x, pointer.y)
      }
    })
  }

  // 移除 force 点点击监听器
  function removeForcePointListener() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return
    canvasInstance.off('mouse:down')
  }

  // 添加 force 点
  function addForcePoint(x: number, y: number) {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // 如果存在场力，先清除场力
    clearFieldForce()

    // 创建圆形作为 force 点
    const forcePoint = new fabric.Circle({
      left: x,
      top: y,
      radius: 15,
      fill: '#ff8c00', // 改为橙色填充
      stroke: '#ffb366', // 改为偏白的橙色边框
      strokeWidth: 2,
      dataType: 'force',
      forceType: 'pointForce',
      selectable: false,
      evented: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      originX: 'center',
      originY: 'center'
    })

    // 添加到画布
    canvasInstance.add(forcePoint)
    canvasInstance.renderAll()

    // 启动闪烁动画
    startBlinkAnimation()

    console.log('Force point added at:', x, y)
    forceType.value = 'pointForce'
  }

  // 添加场力
  async function addFieldForce() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // 如果存在点力，先清除点力
    clearAllForcePoints()

    // 获取画布中心位置
    const centerX = canvasInstance.width! / 2
    const centerY = canvasInstance.height! / 2

    try {
      // 先获取 SVG 文件内容
      const response = await fetch('/field_force.svg')
      const svgString = await response.text()
      
      // 使用 Fabric.js v6 的新 API 加载 SVG
      const loadedSVG = await fabric.loadSVGFromString(svgString)
      const svgObject = fabric.util.groupSVGElements(loadedSVG.objects)
      
             // 计算画布和SVG对象的尺寸比例
       const canvasWidth = canvasInstance.width!
       const canvasHeight = canvasInstance.height!
       const svgWidth = 300
       const svgHeight = 300
       
       // 计算缩放比例，使SVG对象占据画布的大部分空间（比如80%）
       const scaleX = (canvasWidth * 1) / svgWidth
       const scaleY = (canvasHeight * 1) / svgHeight
       
       // 设置 SVG 对象的属性
       svgObject.set({
         left: centerX,
         top: centerY,
         originX: 'center',
         originY: 'center',
         dataType: 'force',
         forceType: 'fieldForce',
         selectable: false,
         evented: false,
         lockScalingX: true,
         lockScalingY: true,
         lockMovementX: true,  // 锁定X轴移动
         lockMovementY: true,  // 锁定Y轴移动
         scaleX: scaleX,
         scaleY: scaleY,
         visible: true,
         centeredScaling: true
       })

      // 添加到画布
      canvasInstance.add(svgObject)
      canvasInstance.centerObject(svgObject)
      canvasInstance.renderAll()

      console.log('Field force added successfully')
      forceType.value = 'fieldForce'
    } catch (error) {
      console.error('Failed to load SVG:', error)
      throw error
    }
  }

  // 清除场力
  function clearFieldForce() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // 清理所有 fieldForce 类型的对象
    canvasInstance.getObjects().forEach(obj => {
      if (obj.forceType === 'fieldForce') {
        canvasInstance.remove(obj)
      }
    })

    canvasInstance.renderAll()
    console.log('Field force cleared')
    forceType.value = null
  }

  // 清除所有 force 点
  function clearAllForcePoints() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // 停止动画
    stopBlinkAnimation()

    // 清理所有 force 类型的对象
    canvasInstance.getObjects().forEach(obj => {
      if (obj.dataType === 'force') {
        canvasInstance.remove(obj)
      }
    })

    canvasInstance.renderAll()
    forceType.value = null
    console.log('All force points cleared')
  }

  // 启动闪烁动画
  function startBlinkAnimation() {
    // 停止之前的动画
    if (animationId.value) {
      cancelAnimationFrame(animationId.value)
    }

    let opacity = 1
    let increasing = false
    let lastTime = performance.now()
    const targetFPS = 60 // 目标帧率
    const frameInterval = 1000 / targetFPS // 每帧的时间间隔（毫秒）
    const blinkSpeed = 0.5// 闪烁速度（每秒完整闪烁次数）

    const animate = (currentTime: number) => {
      const canvasInstance = canvasRef.value?.()
      if (!canvasInstance) return

      // 计算时间差
      const deltaTime = currentTime - lastTime

      // 控制帧率，确保动画速度一致
      if (deltaTime >= frameInterval) {
        // 计算这一帧应该改变的不透明度
        const opacityChange = (blinkSpeed * deltaTime) / 1000

        if (increasing) {
          opacity += opacityChange
          if (opacity >= 1) {
            opacity = 1
            increasing = false
          }
        } else {
          opacity -= opacityChange
          if (opacity <= 0.6) {
            opacity = 0.6
            increasing = true
          }
        }

        // 只对force类型的对象应用动画
        canvasInstance.getObjects().forEach(obj => {
          if (obj.dataType === 'force') {
            obj.set('opacity', opacity)
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

  // 停止闪烁动画
  function stopBlinkAnimation() {
    if (animationId.value) {
      cancelAnimationFrame(animationId.value)
      animationId.value = null
    }
  }

  return {
    setCanvas,
    addForcePoint,
    clearAllForcePoints,
    addForcePointListener,
    removeForcePointListener,
    startBlinkAnimation,
    stopBlinkAnimation,
    addFieldForce,
    clearFieldForce,
    forceType
  }
})
