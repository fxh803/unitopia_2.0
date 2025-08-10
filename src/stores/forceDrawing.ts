import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as fabric from 'fabric'

export const useForceDrawingStore = defineStore('forceDrawing', () => {
  const canvasRef = ref<(() => fabric.Canvas | null) | null>(null)
  const animationId = ref<number | null>(null) // 添加动画ID引用

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

    // 创建圆形作为 force 点
    const forcePoint = new fabric.Circle({
      left: x,
      top: y,
      radius: 15,
      fill: '#ff6b6b',
      stroke: '#d63031',
      strokeWidth: 2,
      dataType: 'force',
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
    const blinkSpeed = 2 // 闪烁速度（每秒完整闪烁次数）

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
          if (opacity <= 0.3) {
            opacity = 0.3
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
    stopBlinkAnimation
  }
})
