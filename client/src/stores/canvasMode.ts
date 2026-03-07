import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Canvas } from 'fabric'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useBrushSizeStore } from '~/stores/brushsize'
import { useCanvasStore } from '~/stores/canvas'
export const useCanvasModeStore = defineStore('canvasMode', () => {
  const mode = ref<'draw' | 'move' | 'erase' | 'rect' | 'ellipse' | 'bezier' | 'force' | 'segmentPoint' | null>(null)
  const canvasRef = ref<(() => Canvas | null) | null>(null)
  // 导入其他 store
  const selectedModeStore = useSelectedModeStore()
  const brushSizeStore = useBrushSizeStore()
  // 设置 canvas 引用
  function setCanvas(canvas: () => Canvas | null) {
    canvasRef.value = canvas
  }

  function setMode(m: 'draw' | 'move' | 'erase' | 'rect' | 'ellipse' | 'bezier' | 'force' | 'segmentPoint' | null) {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // 检查闭合路径确认面板是否打开
    const canvasStore = useCanvasStore()
    if (canvasStore.closePathConfirm.show) {
      return
    }
    // 再次点击同模式，取消激活
    if (mode.value === m) {
      mode.value = null;
    }else{
      mode.value = m;
    }
    
    // 统一先取消所有选中
    canvasInstance.discardActiveObject();
    // 统一设置
    const dpr = window.devicePixelRatio || 1
    if (mode.value === 'draw') {
      canvasInstance.isDrawingMode = true;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
      if (canvasInstance.freeDrawingBrush) { 
        canvasInstance.freeDrawingBrush.color = 'rgba(' + canvasStore.containerColor.join(',') + ')'  ;
        canvasInstance.freeDrawingBrush.width = brushSizeStore.brushWidth * dpr;
      }
    } else if (mode.value === 'erase') {
      canvasInstance.isDrawingMode = true;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
      if (canvasInstance.freeDrawingBrush) {
        canvasInstance.freeDrawingBrush.color = '#fffef8';
        canvasInstance.freeDrawingBrush.width = brushSizeStore.brushWidth * dpr;
      }
    } else if (mode.value === 'move') {
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = true;
      // 根据selectedMode设置对象的可交互性 
      canvasInstance.getObjects().forEach(obj => {
        const objType = obj.get('dataType');
        if (objType === selectedModeStore.selectedMode) {
          obj.set('selectable', true);
          obj.set('evented', true); 
        } else {
          obj.set('selectable', false);
          obj.set('evented', false);
        }
      });
    } else if (mode.value === 'rect' || mode.value === 'ellipse') {
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
    } else if (mode.value === 'bezier') {
      canvasInstance.isDrawingMode = true;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
      if (canvasInstance.freeDrawingBrush) {
        // 贝塞尔模式使用半透明蓝色
        canvasInstance.freeDrawingBrush.color = 'rgba(0, 123, 255, 0.1)';
        canvasInstance.freeDrawingBrush.width = brushSizeStore.brushWidth * dpr;
      }
    } else if (mode.value === 'force') {
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; }); 
    } else if (mode.value === 'segmentPoint') {
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
    } else {
      canvasInstance.isDrawingMode = false;
      canvasInstance.getObjects().forEach(obj => {  
        obj.selectable = false; 
        obj.evented = false; 
      }); 
    }
    canvasInstance.renderAll();
  }



  return {
    mode,
    setMode,
    setCanvas,
    canvasRef
  }
}) 