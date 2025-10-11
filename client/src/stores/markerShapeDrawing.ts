import { defineStore } from 'pinia'
import { useColorPickerStore } from '~/stores/colorpicker'
import { useMarkerCanvasModeStore } from '~/stores/markerCanvasMode'
import { Rect, Ellipse } from 'fabric'

export const useMarkerShapeDrawingStore = defineStore('markerShapeDrawing', () => {
  const colorPickerStore = useColorPickerStore()
  const markerCanvasModeStore = useMarkerCanvasModeStore()
  
  const isDrawingShape = ref(false)
  const shapeStart = ref<{ x: number, y: number } | null>(null)
  const previewShape = ref<any>(null)
  const markerCanvasRef = ref<(() => Canvas | null) | null>(null)

  // 设置 marker canvas 引用
  function setMarkerCanvas(canvas: () => Canvas | null) {
    markerCanvasRef.value = canvas
  }

  // 开始绘制形状
  function onMarkerShapeMouseDown(e: MouseEvent) {
    if (markerCanvasModeStore.mode !== 'rect' && markerCanvasModeStore.mode !== 'ellipse') return
    
    const canvasInstance = markerCanvasRef.value?.()
    if (!canvasInstance) return
    
    isDrawingShape.value = true
    const pointer = canvasInstance.getPointer(e)
    shapeStart.value = { x: pointer.x, y: pointer.y }
    
    // 创建预览形状
    const strokeColor = colorPickerStore.selectedColor
    if (markerCanvasModeStore.mode === 'rect') {
      previewShape.value = new Rect({
        left: pointer.x,
        top: pointer.y,
        width: 1,
        height: 1,
        fill: 'rgba(0,0,0,0)',
        stroke: strokeColor,
        strokeWidth: 3,
        selectable: false
      })
    } else if (markerCanvasModeStore.mode === 'ellipse') {
      previewShape.value = new Ellipse({
        left: pointer.x,
        top: pointer.y,
        rx: 1,
        ry: 1,
        fill: 'rgba(0,0,0,0)',
        stroke: strokeColor,
        strokeWidth: 3,
        selectable: false,
        originX: 'left',
        originY: 'top'
      })
    }
    
    if (previewShape.value) {
      canvasInstance.add(previewShape.value)
    }
  }

  // 绘制过程中移动鼠标
  function onMarkerShapeMouseMove(e: MouseEvent) {
    if (!isDrawingShape.value || !shapeStart.value || !previewShape.value) return
    
    const canvasInstance = markerCanvasRef.value?.()
    if (!canvasInstance) return
    
    const pointer = canvasInstance.getPointer(e)
    const startX = shapeStart.value.x
    const startY = shapeStart.value.y
    
    if (markerCanvasModeStore.mode === 'rect') {
      previewShape.value.set({
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y),
        width: Math.abs(pointer.x - startX),
        height: Math.abs(pointer.y - startY),
      })
    } else if (markerCanvasModeStore.mode === 'ellipse') {
      previewShape.value.set({
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y),
        rx: Math.abs(pointer.x - startX) / 2,
        ry: Math.abs(pointer.y - startY) / 2,
        originX: 'left',
        originY: 'top',
      })
    }
    
    canvasInstance.requestRenderAll()
  }

  // 完成形状绘制
  function onMarkerShapeMouseUp(e: MouseEvent) {
    if (!isDrawingShape.value || !shapeStart.value || !previewShape.value) return
    
    const canvasInstance = markerCanvasRef.value?.()
    if (!canvasInstance) return
    
    isDrawingShape.value = false
    const pointer = canvasInstance.getPointer(e)
    const startX = shapeStart.value.x
    const startY = shapeStart.value.y
    const strokeColor = colorPickerStore.selectedColor
    let shapeObj = null
    
    if (markerCanvasModeStore.mode === 'rect') {
      shapeObj = new Rect({
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y),
        width: Math.abs(pointer.x - startX),
        height: Math.abs(pointer.y - startY),
        fill: 'rgba(0,0,0,0)',
        stroke: strokeColor,
        strokeWidth: 3,
        selectable: false,
        evented: false
      })
    } else if (markerCanvasModeStore.mode === 'ellipse') {
      shapeObj = new Ellipse({
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y),
        rx: Math.abs(pointer.x - startX) / 2,
        ry: Math.abs(pointer.y - startY) / 2,
        fill: 'rgba(0,0,0,0)',
        stroke: strokeColor,
        strokeWidth: 3,
        originX: 'left',
        originY: 'top',
        selectable: false,
        evented: false
      })
    }
    
    if (shapeObj) {
      // 添加到画布
      canvasInstance.add(shapeObj)
    }
    
    // 移除预览形状
    canvasInstance.remove(previewShape.value)
    previewShape.value = null
    shapeStart.value = null
    canvasInstance.requestRenderAll()
  }

  // 添加事件监听器
  function addMarkerShapeEventListeners() {
    const canvasInstance = markerCanvasRef.value?.()
    if (!canvasInstance) return
    
    const el = canvasInstance.upperCanvasEl
    el.addEventListener('mousedown', onMarkerShapeMouseDown)
    el.addEventListener('mousemove', onMarkerShapeMouseMove)
    el.addEventListener('mouseup', onMarkerShapeMouseUp)
  }

  // 移除事件监听器
  function removeMarkerShapeEventListeners() {
    const canvasInstance = markerCanvasRef.value?.()
    if (!canvasInstance) return
    
    const el = canvasInstance.upperCanvasEl
    el.removeEventListener('mousedown', onMarkerShapeMouseDown)
    el.removeEventListener('mousemove', onMarkerShapeMouseMove)
    el.removeEventListener('mouseup', onMarkerShapeMouseUp)
  }



  return {
    // 状态
    isDrawingShape,
    shapeStart,
    previewShape,
    
    // 方法
    setMarkerCanvas,
    addMarkerShapeEventListeners,
    removeMarkerShapeEventListeners
  }
})
