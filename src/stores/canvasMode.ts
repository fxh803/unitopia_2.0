import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCanvasModeStore = defineStore('canvasMode', () => {
  const mode = ref<'draw' | 'move' | 'erase' | 'rect' | 'ellipse' | null>(null)
  const canvasRef = ref<(() => Canvas | null) | null>(null)

  // 设置 canvas 引用
  function setCanvas(canvas: () => Canvas | null) {
    canvasRef.value = canvas
  }
  function setMode(m: 'draw' | 'move' | 'erase' | 'rect' | 'ellipse', isContainerMode: boolean, selectedColor: string, brushWidth: number) {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return
    // 再次点击同模式，取消激活
    if (mode.value === m) {
      mode.value = null;
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => {
        obj.selectable = false;
        obj.evented = false;
      });
      canvasInstance.discardActiveObject();
      canvasInstance.renderAll();

      return;
    }
    mode.value = m;
    // 统一先取消所有选中
    canvasInstance.discardActiveObject();
    // 统一设置
    const dpr = window.devicePixelRatio || 1
    if (m === 'draw') {
      canvasInstance.isDrawingMode = true;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
      if (canvasInstance.freeDrawingBrush) {
        // Container模式下使用黑色，Marker模式下使用选择的颜色
        canvasInstance.freeDrawingBrush.color = isContainerMode ? '#000000' : selectedColor;
        canvasInstance.freeDrawingBrush.width = brushWidth * dpr;
      }
    } else if (m === 'erase') {
      canvasInstance.isDrawingMode = true;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
      if (canvasInstance.freeDrawingBrush) {
        canvasInstance.freeDrawingBrush.color = '#ffffff';
        canvasInstance.freeDrawingBrush.width = brushWidth * dpr;
      }
    } else if (m === 'move') {
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = true;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = true; obj.evented = true; });
    } else if (m === 'rect' || m === 'ellipse') {
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
    }

    canvasInstance.renderAll();
  }
  
  function clearCanvas() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return
    // 复制一份对象数组，避免遍历时出错
    const objects = canvasInstance.getObjects().concat();
    objects.forEach(obj => {
      canvasInstance.remove(obj);
    });
    canvasInstance.discardActiveObject();
    canvasInstance.renderAll();
    // 背景色会自动保留，无需重新设置
  }
    
      
    
      return {mode, setMode, setCanvas, clearCanvas }
}) 