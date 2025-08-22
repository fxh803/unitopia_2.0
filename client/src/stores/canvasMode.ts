import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useColorPickerStore } from '~/stores/colorpicker'
import { useBrushSizeStore } from '~/stores/brushsize'
import { useBezierDrawingStore } from '~/stores/bezierDrawing'
import { useForceDrawingStore } from '~/stores/forceDrawing'
import { useBackgroundStore } from '~/stores/background'
export const useCanvasModeStore = defineStore('canvasMode', () => {
  const mode = ref<'draw' | 'move' | 'erase' | 'rect' | 'ellipse' | 'bezier' | 'force' | null>(null)
  const canvasRef = ref<(() => Canvas | null) | null>(null)

  // 导入其他 store
  const selectedModeStore = useSelectedModeStore()
  const colorPickerStore = useColorPickerStore()
  const brushSizeStore = useBrushSizeStore()
  const bezierDrawingStore = useBezierDrawingStore()
  const forceDrawingStore = useForceDrawingStore()
  const backgroundStore = useBackgroundStore()
  // 设置 canvas 引用
  function setCanvas(canvas: () => Canvas | null) {
    canvasRef.value = canvas
  }

  function setMode(m: 'draw' | 'move' | 'erase' | 'rect' | 'ellipse' | 'bezier' | 'force') {
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
    } else if (m === 'rect' || m === 'ellipse') {
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
    } else if (m === 'bezier') {
      canvasInstance.isDrawingMode = true;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; });
      if (canvasInstance.freeDrawingBrush) {
        // 贝塞尔模式使用半透明蓝色
        canvasInstance.freeDrawingBrush.color = 'rgba(0, 123, 255, 0.1)';
        canvasInstance.freeDrawingBrush.width = brushSizeStore.brushWidth * dpr;
      }
    } else if (m === 'force') {
      canvasInstance.isDrawingMode = false;
      canvasInstance.selection = false;
      canvasInstance.getObjects().forEach(obj => { obj.selectable = false; obj.evented = false; }); 
    }
    canvasInstance.renderAll();
  }

  
  function setDrawedObjectDataType(e) {
    // 监听绘制完成事件，为绘制的路径设置dataType
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return 
    // object:added 事件中，对象在 e.target 中
    const path = e.target; 
    if (path) {
      // 如果是贝塞尔模式，创建多段贝塞尔曲线
      if (mode.value === 'bezier') {
        // 检查是否正在创建贝塞尔曲线，防止递归调用
        if (!bezierDrawingStore.isCreatingBezier) {
          bezierDrawingStore.createBezierFromPath(path)
        }
        return
      }
      if (backgroundStore.creatingBackground) {
        path.set('dataType', 'background')
        return
      }
      if(path.get('dataType') === 'marker'){ 
        return
      }
      // 根据当前选择的模式设置dataType
      path.set('dataType', selectedModeStore.selectedMode);

      // 应用当前模式的透明度规则
      selectedModeStore.handleModeSwitch(selectedModeStore.selectedMode);
    }
  }

  return {
    mode,
    setMode,
    setCanvas,
    setDrawedObjectDataType,
    canvasRef
  }
}) 