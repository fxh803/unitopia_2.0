import { watch } from 'vue'
import type { Ref } from 'vue'
import type { Canvas } from 'fabric'

export function useCanvasMode(canvas: () => Canvas | null, mode: Ref<string | null>, brushWidth: Ref<number>, getDpr: () => number, removeShapeEventListeners: () => void, addShapeEventListeners: () => void, previewShape: Ref<any>) {
  function setMode(m: 'draw' | 'move' | 'erase' | 'rect' | 'ellipse') {
    const canvasInstance = canvas()
    if (!canvasInstance) return
    // 再次点击同模式，取消激活
    if (mode.value === m) {
      mode.value = null;
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => {
        obj.selectable = false;
      });
      canvasInstance.discardActiveObject();
      canvasInstance.renderAll();
      removeShapeEventListeners();
      if (previewShape.value) {
        canvasInstance.remove(previewShape.value)
        previewShape.value = null
      }
      return;
    }
    mode.value = m;
    // 统一先取消所有选中
    canvasInstance.discardActiveObject();
    // 统一设置
    const dpr = getDpr()
    if (m === 'draw') {
      canvasInstance.isDrawingMode = true;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
      if (canvasInstance.freeDrawingBrush) {
        canvasInstance.freeDrawingBrush.color = '#000';
        canvasInstance.freeDrawingBrush.width = brushWidth.value * dpr;
      }
      removeShapeEventListeners();
    } else if (m === 'erase') {
      canvasInstance.isDrawingMode = true;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
      if (canvasInstance.freeDrawingBrush) {
        canvasInstance.freeDrawingBrush.color = '#ffffff';
        canvasInstance.freeDrawingBrush.width = brushWidth.value * dpr;
      }
      removeShapeEventListeners();
    } else if (m === 'move') {
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = true;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = true; obj.evented = true; });
      removeShapeEventListeners();
    } else if (m === 'rect' || m === 'ellipse') {
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
      addShapeEventListeners();
    }
    if (previewShape.value) {
      canvasInstance.remove(previewShape.value)
      previewShape.value = null
    }
    canvasInstance.renderAll();
  }

  // 监听 mode 变化，自动清理 shape 预览和事件
  watch(mode, () => {
    const canvasInstance = canvas()
    if (!canvasInstance) return
    if (mode.value !== 'rect' && mode.value !== 'ellipse') {
      removeShapeEventListeners();
      if (previewShape.value) {
        canvasInstance.remove(previewShape.value)
        previewShape.value = null
      }
    }
  })

  return { setMode }
} 