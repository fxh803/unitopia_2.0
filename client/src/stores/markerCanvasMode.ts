import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useColorPickerStore } from '~/stores/colorpicker'
import { useBrushSizeStore } from '~/stores/brushsize'

export const useSubCanvasModeStore = defineStore('subCanvasMode', () => {
  const mode = ref<'draw' | 'move' | 'erase' | null>(null)
  const canvasRef = ref<(() => Canvas | null) | null>(null)

  // 导入其他 store
  const colorPickerStore = useColorPickerStore()
  const brushSizeStore = useBrushSizeStore()

  // 设置 canvas 引用
  function setCanvas(canvas: () => Canvas | null) {
    canvasRef.value = canvas
  }

  // 设置模式
  function setMode(m: 'draw' | 'move' | 'erase' | null) {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // 再次点击同模式，取消激活
    if (mode.value === m) {
      mode.value = null
      canvasInstance.isDrawingMode = false
      canvasInstance.selection = false
      canvasInstance.getObjects().forEach(obj => {
        obj.selectable = false
        obj.evented = false
      })
      canvasInstance.discardActiveObject()
      canvasInstance.renderAll()
      return
    }

    mode.value = m

    // 统一先取消所有选中
    canvasInstance.discardActiveObject()

    if (m === 'draw') {
      // 绘制模式
      canvasInstance.isDrawingMode = true
      canvasInstance.selection = false
      canvasInstance.getObjects().forEach(obj => { 
        obj.selectable = false
        obj.evented = false
      })
      const dpr = window.devicePixelRatio || 1
      if (canvasInstance.freeDrawingBrush) {
        // 使用选择的颜色
        canvasInstance.freeDrawingBrush.color = colorPickerStore.selectedColor
        canvasInstance.freeDrawingBrush.width = brushSizeStore.brushWidth * dpr
      }
    } else if (m === 'erase') {
      // 橡皮擦模式
      canvasInstance.isDrawingMode = true
      canvasInstance.selection = false
      canvasInstance.getObjects().forEach(obj => { 
        obj.selectable = false
        obj.evented = false
      })
      const dpr = window.devicePixelRatio || 1
      if (canvasInstance.freeDrawingBrush) {
        canvasInstance.freeDrawingBrush.color = '#ffffff'
        canvasInstance.freeDrawingBrush.width = brushSizeStore.brushWidth * dpr
      }
    } else if (m === 'move') {
      // 移动模式
      canvasInstance.isDrawingMode = false
      canvasInstance.selection = true
      
      // 只允许marker对象可交互
      canvasInstance.getObjects().forEach(obj => {
        const objType = obj.get('dataType')
        if (objType === 'marker') {
          obj.set('selectable', true)
          obj.set('evented', true)
        } else {
          obj.set('selectable', false)
          obj.set('evented', false)
        }
      })
    }

    canvasInstance.renderAll()
  }

  // 为绘制的对象设置数据类型
  function setDrawedObjectDataType(e: any) {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    const path = e.target
    if (path) {
      // 设置数据类型为marker
      path.set('dataType', 'marker')
      console.log('setDrawedObjectDataType: 设置数据类型为marker')
      // 生成唯一的 markerId
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substr(2, 9)
      const markerId = `marker-${timestamp}-${randomId}`
      path.set('markerId', markerId)

    }
  }

  // 清除所有marker对象
  function clearMarkers() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    const objects = canvasInstance.getObjects().concat()
    objects.forEach(obj => {
      if (obj.get('dataType') === 'marker') {
        canvasInstance.remove(obj)
      }
    })
    canvasInstance.discardActiveObject()
    canvasInstance.renderAll()
  }

  // 获取当前画布实例
  function getCanvas() {
    return canvasRef.value?.()
  }

  return {
    mode,
    setMode,
    setCanvas,
    setDrawedObjectDataType,
    clearMarkers,
    getCanvas,
    canvasRef
  }
})
