import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useBezierDrawingStore } from '~/stores/bezierDrawing'
import { useBackgroundStore } from '~/stores/background'
import { useCanvasModeStore } from '~/stores/canvasMode'

export const useCanvasStore = defineStore('canvas', () => {
  const canvasRef = ref<(() => Canvas | null) | null>(null)
  const containerColor = ref([130, 130, 130, 0.7])
  
  // 导入其他 store
  const selectedModeStore = useSelectedModeStore()
  const bezierDrawingStore = useBezierDrawingStore()
  const backgroundStore = useBackgroundStore()
  const canvasModeStore = useCanvasModeStore()

  // 设置 canvas 引用
  function setCanvas(canvas: () => Canvas | null) {
    canvasRef.value = canvas
  }

  function setDrawedObjectDataType(e) {
    // 监听绘制完成事件，为绘制的路径设置dataType
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return 
    // object:added 事件中，对象在 e.target 中
    const path = e.target; 
    if (path) {
      // 如果是贝塞尔模式，创建多段贝塞尔曲线
      if (canvasModeStore.mode === 'bezier') {
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

  function adjustLayer() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return
    
    // 获取画布上的所有对象
    const objects = canvasInstance.getObjects()
    
    // 按 dataType 分组对象
    const backgroundObjects = []
    const containerObjects = []
    const otherObjects = []
    
    objects.forEach(obj => {
      const dataType = obj.get('dataType')
      if (dataType === 'background') {
        backgroundObjects.push(obj)
      } else if (dataType === 'container') {
        containerObjects.push(obj)
      } else {
        otherObjects.push(obj)
      }
    })
    
    // 将 background 对象移动到最底层
    backgroundObjects.forEach(obj => {
      canvasInstance.sendObjectToBack(obj, true)
    })
    
    // 将 container 对象移动到 background 之上，其他对象之下
    containerObjects.forEach(obj => {
      // 先移动到最底层
      canvasInstance.sendObjectToBack(obj, true)
      // 然后根据 background 对象的数量，将 container 对象向前移动相应次数
      if (backgroundObjects.length > 0) {
        for (let i = 0; i < backgroundObjects.length; i++) {
          canvasInstance.bringObjectForward(obj)
        }
      }
    })
    
    // 其他对象保持相对层级在顶层
    // 不需要额外操作，因为它们在 container 对象之上
    
    // 重新渲染画布
    canvasInstance.renderAll()
    
    console.log('层级调整完成:', {
      background: backgroundObjects.length,
      container: containerObjects.length,
      other: otherObjects.length
    })
  }

  return {
    canvasRef,
    containerColor,
    setCanvas,
    setDrawedObjectDataType,
    adjustLayer
  }
})
