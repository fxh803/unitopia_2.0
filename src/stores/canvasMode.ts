import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useColorPickerStore } from '~/stores/colorpicker'
import { useBrushSizeStore } from '~/stores/brushsize'

export const useCanvasModeStore = defineStore('canvasMode', () => {
  const mode = ref<'draw' | 'move' | 'erase' | 'rect' | 'ellipse' | null>(null)
  const canvasRef = ref<(() => Canvas | null) | null>(null)

  // 导入其他 store
  const selectedModeStore = useSelectedModeStore()
  const colorPickerStore = useColorPickerStore()
  const brushSizeStore = useBrushSizeStore()

  // 设置 canvas 引用
  function setCanvas(canvas: () => Canvas | null) {
    canvasRef.value = canvas
  }
  function setMode(m: 'draw' | 'move' | 'erase' | 'rect' | 'ellipse') {
    console.log('setmode',m)
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
        canvasInstance.freeDrawingBrush.color = selectedModeStore.isContainerMode ? '#000000' : colorPickerStore.selectedColor;
        canvasInstance.freeDrawingBrush.width = brushSizeStore.brushWidth * dpr;
      }
      
      // 监听绘制完成事件，为绘制的路径设置dataType
      canvasInstance.on('path:created', (e) => {
        const path = e.path;
        if (path) {
          // 根据当前选择的模式设置dataType
          path.set('dataType', selectedModeStore.selectedMode);
          // 应用当前模式的透明度规则
          selectedModeStore.handleModeSwitch(selectedModeStore.selectedMode);
        }
      });
    } else if (m === 'erase') {
      canvasInstance.isDrawingMode = true;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
      if (canvasInstance.freeDrawingBrush) {
        canvasInstance.freeDrawingBrush.color = '#ffffff';
        canvasInstance.freeDrawingBrush.width = brushSizeStore.brushWidth * dpr;
      }
    } else if (m === 'move') {
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = true;
      // 根据selectedMode设置对象的可交互性
      if (selectedModeStore.selectedMode) {
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
      } else {
        // 如果没有选择模式，所有对象都不可以交互
        canvasInstance.getObjects().forEach(obj => { obj.set('selectable', false); obj.set('evented', false); });
      }
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