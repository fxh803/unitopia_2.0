import { defineStore } from 'pinia'
import { useColorPickerStore } from '~/stores/colorpicker'  
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useSelectedModeStore } from '~/stores/selectedMode' 
import { Rect, Ellipse } from 'fabric'
export const useShapeDrawingStore = defineStore('shapeDrawing', () => {
    const colorPickerStore = useColorPickerStore()
    const selectedModeStore = useSelectedModeStore() 
    const canvasModeStore = useCanvasModeStore()
    const isDrawingShape = ref(false)
    const shapeStart = ref<{ x: number, y: number } | null>(null)
    const previewShape = ref<any>(null)
    const canvasRef = ref<(() => Canvas | null) | null>(null)

    // 设置 canvas 引用
    function setCanvas(canvas: () => Canvas | null) {
        canvasRef.value = canvas
    }
    function onShapeMouseDown(e: MouseEvent) {
      if (canvasModeStore.mode !== 'rect' && canvasModeStore.mode !== 'ellipse') return
      const canvasInstance = canvasRef.value?.()
      if (!canvasInstance) return
      isDrawingShape.value = true
      const pointer = canvasInstance.getPointer(e)
      shapeStart.value = { x: pointer.x, y: pointer.y }
      // 创建预览形状
      const strokeColor = selectedModeStore.isContainerMode ? '#000' : colorPickerStore.selectedColor
      if (canvasModeStore.mode === 'rect') {
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
      } else if (canvasModeStore.mode === 'ellipse') {
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
          originY: 'top',
        })
      }
      if (previewShape.value) {
        canvasInstance.add(previewShape.value)
      }
    }
  
    function onShapeMouseMove(e: MouseEvent) {
      if (!isDrawingShape.value || !shapeStart.value || !previewShape.value) return
      const canvasInstance = canvasRef.value?.()
      if (!canvasInstance) return
      const pointer = canvasInstance.getPointer(e)
      const startX = shapeStart.value.x
      const startY = shapeStart.value.y
      if (canvasModeStore.mode === 'rect') {
        previewShape.value.set({
          left: Math.min(startX, pointer.x),
          top: Math.min(startY, pointer.y),
          width: Math.abs(pointer.x - startX),
          height: Math.abs(pointer.y - startY),
        })
      } else if (canvasModeStore.mode === 'ellipse') {
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
      const canvasInstance = canvasRef.value?.()
      if (!canvasInstance) return
      isDrawingShape.value = false
      const pointer = canvasInstance.getPointer(e)
      const startX = shapeStart.value.x
      const startY = shapeStart.value.y
      const strokeColor = selectedModeStore.isContainerMode ? '#000' : colorPickerStore.selectedColor
      let shapeObj = null
      if (canvasModeStore.mode === 'rect') {
        shapeObj = new Rect({
          left: Math.min(startX, pointer.x),
          top: Math.min(startY, pointer.y),
          width: Math.abs(pointer.x - startX),
          height: Math.abs(pointer.y - startY),
          fill: 'rgba(0,0,0,0)',
          stroke: strokeColor,
          strokeWidth: 3,
          selectable: false,
          evented: false,
        })
      } else if (canvasModeStore.mode === 'ellipse') {
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
          evented: false,
        })
      }
      if (shapeObj) {
        // 为形状对象设置dataType属性
        shapeObj.set('dataType', selectedModeStore.selectedMode);
        canvasInstance.add(shapeObj)
        // 应用当前模式的透明度规则
        selectedModeStore.handleModeSwitch(selectedModeStore.selectedMode);
      }
      // 移除预览
      canvasInstance.remove(previewShape.value)
      previewShape.value = null
      shapeStart.value = null
      canvasInstance.requestRenderAll()
    }
  
    function addShapeEventListeners() {
      const canvasInstance = canvasRef.value?.()
      if (!canvasInstance) return
      const el = canvasInstance.upperCanvasEl
      el.addEventListener('mousedown', onShapeMouseDown)
      el.addEventListener('mousemove', onShapeMouseMove)
      el.addEventListener('mouseup', onShapeMouseUp)
    }
    function removeShapeEventListeners() {
      const canvasInstance = canvasRef.value?.()
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
      setCanvas
    }
}) 