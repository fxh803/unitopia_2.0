import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useColorPickerStore } from '~/stores/colorpicker'
import { useBrushSizeStore } from '~/stores/brushsize'

export const useMarkerCanvasModeStore = defineStore('markerCanvasMode', () => {
  const mode = ref<'draw' | 'move' | 'erase' | 'rect' | 'ellipse' | null>(null)
  const canvasRef = ref<(() => Canvas | null) | null>(null)

  // 导入其他 store
  const colorPickerStore = useColorPickerStore()
  const brushSizeStore = useBrushSizeStore()

  // 设置 canvas 引用
  function setCanvas(canvas: () => Canvas | null) {
    canvasRef.value = canvas
  }

  // 设置模式
  function setMode(m: 'draw' | 'move' | 'erase' | 'rect' | 'ellipse' | null) {
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
      
      // marker 画布上所有对象都可交互
      canvasInstance.getObjects().forEach(obj => {
        obj.set('selectable', true)
        obj.set('evented', true)
      })
    } else if (m === 'rect' || m === 'ellipse') {
      // 形状绘制模式
      canvasInstance.isDrawingMode = false
      canvasInstance.selection = false
      
      // 禁用所有对象的交互
      canvasInstance.getObjects().forEach(obj => {
        obj.set('selectable', false)
        obj.set('evented', false)
      })
    }

    canvasInstance.renderAll()
  }


  // 清除所有对象（marker画布专用）
  function clearMarkers() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // marker 画布上的所有对象都是 marker，直接清除
    canvasInstance.clear()
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
    clearMarkers,
    getCanvas,
    canvasRef
  }
})
