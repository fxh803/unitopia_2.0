import { ref } from 'vue'
import type { Ref } from 'vue'
import type { Canvas } from 'fabric'
import { Rect, Ellipse } from 'fabric'

export function useShapeDrawing(canvas: () => Canvas | null, mode: Ref<string | null>) {
  const isDrawingShape = ref(false)
  const shapeStart = ref<{ x: number, y: number } | null>(null)
  const previewShape = ref<any>(null)

  function onShapeMouseDown(e: MouseEvent) {
    if (mode.value !== 'rect' && mode.value !== 'ellipse') return
    const canvasInstance = canvas()
    if (!canvasInstance) return
    isDrawingShape.value = true
    const pointer = canvasInstance.getPointer(e)
    shapeStart.value = { x: pointer.x, y: pointer.y }
    // 创建预览形状
    if (mode.value === 'rect') {
      previewShape.value = new Rect({
        left: pointer.x,
        top: pointer.y,
        width: 1,
        height: 1,
        fill: 'rgba(0,0,0,0)',
        stroke: '#000',
        strokeWidth: 3,
        selectable: false
      })
    } else if (mode.value === 'ellipse') {
      previewShape.value = new Ellipse({
        left: pointer.x,
        top: pointer.y,
        rx: 1,
        ry: 1,
        fill: 'rgba(0,0,0,0)',
        stroke: '#000',
        strokeWidth: 3,
        selectable: false,
        originX: 'left',
        originY: 'top',
      })
    }
    if (previewShape.value) {
      canvasInstance.add(previewShape.value)
    }
  }

  function onShapeMouseMove(e: MouseEvent) {
    if (!isDrawingShape.value || !shapeStart.value || !previewShape.value) return
    const canvasInstance = canvas()
    if (!canvasInstance) return
    const pointer = canvasInstance.getPointer(e)
    const startX = shapeStart.value.x
    const startY = shapeStart.value.y
    if (mode.value === 'rect') {
      previewShape.value.set({
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y),
        width: Math.abs(pointer.x - startX),
        height: Math.abs(pointer.y - startY),
      })
    } else if (mode.value === 'ellipse') {
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

  function onShapeMouseUp(e: MouseEvent) {
    if (!isDrawingShape.value || !shapeStart.value || !previewShape.value) return
    const canvasInstance = canvas()
    if (!canvasInstance) return
    isDrawingShape.value = false
    const pointer = canvasInstance.getPointer(e)
    const startX = shapeStart.value.x
    const startY = shapeStart.value.y
    let shapeObj = null
    if (mode.value === 'rect') {
      shapeObj = new Rect({
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y),
        width: Math.abs(pointer.x - startX),
        height: Math.abs(pointer.y - startY),
        fill: 'rgba(0,0,0,0)',
        stroke: '#000',
        strokeWidth: 3,
        selectable: false,
        evented: false,
      })
    } else if (mode.value === 'ellipse') {
      shapeObj = new Ellipse({
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y),
        rx: Math.abs(pointer.x - startX) / 2,
        ry: Math.abs(pointer.y - startY) / 2,
        fill: 'rgba(0,0,0,0)',
        stroke: '#000',
        strokeWidth: 3,
        originX: 'left',
        originY: 'top',
        selectable: false,
        evented: false,
      })
    }
    if (shapeObj) {
      canvasInstance.add(shapeObj)
    }
    // 移除预览
    canvasInstance.remove(previewShape.value)
    previewShape.value = null
    shapeStart.value = null
    canvasInstance.requestRenderAll()
  }

  function addShapeEventListeners() {
    const canvasInstance = canvas()
    if (!canvasInstance) return
    const el = canvasInstance.upperCanvasEl
    el.addEventListener('mousedown', onShapeMouseDown)
    el.addEventListener('mousemove', onShapeMouseMove)
    el.addEventListener('mouseup', onShapeMouseUp)
  }
  function removeShapeEventListeners() {
    const canvasInstance = canvas()
    if (!canvasInstance) return
    const el = canvasInstance.upperCanvasEl
    el.removeEventListener('mousedown', onShapeMouseDown)
    el.removeEventListener('mousemove', onShapeMouseMove)
    el.removeEventListener('mouseup', onShapeMouseUp)
  }

  return {
    isDrawingShape,
    shapeStart,
    previewShape,
    addShapeEventListeners,
    removeShapeEventListeners,
  }
} 