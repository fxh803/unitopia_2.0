<script setup lang="ts">
import { Canvas, PencilBrush, Group } from 'fabric'
import * as fabric from 'fabric'
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useObjectActionsStore } from '~/stores/objectActions'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useBrushSizeStore } from '~/stores/brushsize'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useShapeDrawingStore } from '~/stores/shapeDrawing' 
import { useBezierDrawingStore } from '~/stores/bezierDrawing'
import { useForceDrawingStore } from '~/stores/forceDrawing'
import { useAnimationStore } from '~/stores/animation'
import { useBackgroundStore } from '~/stores/background'
const animationStore = useAnimationStore()
const { collaging, result_data } = storeToRefs(animationStore)
const selectedModeStore = useSelectedModeStore()
const { selectedMode, isContainerMode } = storeToRefs(selectedModeStore)
 
const brushSizeStore = useBrushSizeStore()
const { brushWidth } = storeToRefs(brushSizeStore)

const collageSeriesStore = useCollageSeriesStore()
const { collageSeries, currentSlideIndex, stopListen } = storeToRefs(collageSeriesStore)
const {
  initializeEmptySlide,
  updateCurrentSlide,
  addNewSlide,
  handleCollageSeriesSelect,
  handleDeleteCollageSeries
} = collageSeriesStore

const canvasModeStore = useCanvasModeStore()
const { mode } = storeToRefs(canvasModeStore)
const { setMode, setDrawedObjectDataType, adjustLayer } = canvasModeStore

const objectActionsStore = useObjectActionsStore()
const {
  updateActionBtnPosition,
  updateActionBtnVisble,
  hideBtns,
  setCurrentPathObj,
} = objectActionsStore

const shapeDrawingStore = useShapeDrawingStore()
const { isDrawingShape, shapeStart, previewShape } = storeToRefs(shapeDrawingStore)
const {
  addShapeEventListeners,
  removeShapeEventListeners
} = shapeDrawingStore

const forceDrawingStore = useForceDrawingStore()
const { addForcePointListener, removeForcePointListener, startBlinkAnimation, stopBlinkAnimation } = forceDrawingStore
const bezierDrawingStore = useBezierDrawingStore()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const canvasAreaRef = ref<HTMLDivElement | null>(null)
const canvasWrapperRef = ref<HTMLDivElement | null>(null)
const canvasSize = ref(400)
let canvas: Canvas | null = null

const backgroundStore = useBackgroundStore()
function getDpr() {
  return window.devicePixelRatio || 1
}

function resizeCanvasForDPR() {
  if (!canvas || !canvasEl.value) return
  const dpr = getDpr()
  const size = canvasSize.value
  canvasEl.value.width = size * dpr
  canvasEl.value.height = size * dpr
  canvas.setWidth(size)
  canvas.setHeight(size)
  // canvas.setZoom(dpr)
  canvas.renderAll()
}

function updateCanvasSize() {
  const parent = canvasAreaRef.value
  if (parent) {
    const rect = parent.getBoundingClientRect()
    // 减少边距，给画布更多空间
    const size = Math.floor(Math.min(rect.width, rect.height) - 20)
    canvasSize.value = Math.max(size, 200) // 增加最小尺寸
    if (canvas) {
      resizeCanvasForDPR()
    }
  }
}
function addCanvasEventListeners() {
  canvas.on({
    'selection:created': () => {
      setCurrentPathObj()
      updateActionBtnVisble()
      updateActionBtnPosition()

    },
    'selection:updated': () => {
      setCurrentPathObj()
      updateActionBtnVisble()
      updateActionBtnPosition()

    },
    'selection:cleared': hideBtns,
    'object:moving': hideBtns,
    'object:scaling': hideBtns,
    'object:rotating': hideBtns,
    'object:modified': () => {
      setCurrentPathObj()
      updateActionBtnVisble()
      updateActionBtnPosition() 
      updateCurrentSlide()
    },
    'object:added': (e) => {
      setDrawedObjectDataType(e) 
      updateCurrentSlide()
      adjustLayer()
    },
    'object:removed': () => { 
      updateCurrentSlide()
    }
  })
}
function removeCanvasEventListeners() {
  canvas.off('selection:created')
  canvas.off('selection:updated')
  canvas.off('selection:cleared')
  canvas.off('object:moving')
  canvas.off('object:scaling')
  canvas.off('object:rotating')
  canvas.off('object:modified')
  canvas.off('object:added')
  canvas.off('object:removed')
}
watch(collaging, (newVal) => {
  if (newVal) {
    removeCanvasEventListeners()
  } else {
    addCanvasEventListeners()
  }
})
watch(stopListen, (newVal) => {
  if (!newVal) {
    addCanvasEventListeners()
  } else {
    removeCanvasEventListeners()
  }
})
watch(selectedMode, (newMode, oldMode) => {
  if (newMode !== oldMode || newMode === null) {
    setMode(null)
    if(selectedMode.value === null){
        canvas?.getObjects().forEach(obj => {
          if(obj.get('dataType') === 'marker'){
            obj.selectable = true;
            obj.evented = true;
          }
        });
        canvas?.renderAll();
    }
  }
  if (newMode === 'force') {
    startBlinkAnimation()
  } else {
    stopBlinkAnimation()
  }
})
// 监听 mode 变化，自动清理 shape 预览和事件
watch(mode, () => {
  if (!canvas) return
  if (mode.value !== 'rect' && mode.value !== 'ellipse') {
    removeShapeEventListeners();
  }
  else {
    addShapeEventListeners();
  }
  if (mode.value === 'force') {
    addForcePointListener()
  }
  else {
    removeForcePointListener()
  }
})


// 画笔宽度变化时同步到画布
watch(brushWidth, (val) => {
  if (canvas && (mode.value === 'draw' || mode.value === 'erase')) {
    const dpr = getDpr()
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = val * dpr
    }
  }
})

// 处理拖拽预览图到主画布
function handleDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()

  if (!canvas || !e.dataTransfer) return

  const groupJsonData = e.dataTransfer.getData('application/json')
  const markerId = e.dataTransfer.getData('text/plain')
  if (!groupJsonData) return


  try {
    const groupJson = JSON.parse(groupJsonData)
    
    // 计算拖拽位置相对于画布的偏移
    const canvasRect = canvasEl.value?.getBoundingClientRect()
    if (!canvasRect) return

    const dropX = e.clientX - canvasRect.left
    const dropY = e.clientY - canvasRect.top 

    try { 
      // 使用 fabric.util.enlivenObjects 重新创建对象 (Fabric.js 6.x 返回 Promise)
      // 确保传递的是对象数组，每个对象都有 type 属性
      const objects = await fabric.util.enlivenObjects(groupJson, 'fabric') 
      
      if (objects && objects.length > 0) {
        const group = new Group(objects) 
        // 先设置所有属性（包括dataType），然后再添加到画布
        group.set({
          left: dropX,
          top: dropY,
          selectable: true,
          evented: true,
          dataType: 'marker',
          hasControls: false,
          originX: 'center',
          originY: 'center',
          markerId: markerId
        })
        
        // 调节对象大小，最大高/宽为50，保持宽高比
        const maxSize = 50
        const currentWidth = group.width || group.getScaledWidth()
        const currentHeight = group.height || group.getScaledHeight()
        
        if (currentWidth > 0 && currentHeight > 0) {
          const scaleX = maxSize / Math.max(currentWidth, currentHeight)
          const scaleY = scaleX // 保持宽高比
          
          group.set({
            scaleX: scaleX,
            scaleY: scaleY
          })
        }
        
        // 添加到主画布（此时所有属性都已设置好）
        canvas.add(group)
        // 强制更新对象
        group.setCoords()
        canvas.renderAll()
         
      } else {
        console.warn('enlivenObjects返回的对象为空或无效')
      }
      
    } catch (enlivenError) {
      console.error('使用enlivenObjects创建对象时出错:', enlivenError)
       
    }
  } catch (parseError) {
    console.error('解析拖拽数据失败:', parseError)
  }
}

onMounted(async () => {
  await nextTick()
  // 延迟一下确保DOM完全渲染
  setTimeout(() => {
    updateCanvasSize()
  }, 200)

  if (canvasEl.value) {
    canvas = new Canvas(canvasEl.value, {
      backgroundColor: '#ffffff',
      isDrawingMode: false,
      selection: false,
      width: canvasSize.value,
      height: canvasSize.value,
    })
    const dpr = getDpr()
    const brush = new PencilBrush(canvas)
    brush.color = '#000'
    brush.width = brushWidth.value * dpr
    canvas.freeDrawingBrush = brush

    // 设置 canvas 引用
    canvasModeStore.setCanvas(() => canvas)
    collageSeriesStore.setCanvas(() => canvas)
    objectActionsStore.setCanvas(() => canvas)
    shapeDrawingStore.setCanvas(() => canvas)
    selectedModeStore.setCanvas(() => canvas) 
    bezierDrawingStore.setCanvas(() => canvas)
    forceDrawingStore.setCanvas(() => canvas)
    backgroundStore.setCanvas(() => canvas)
    // 初始化空白幻灯片
    initializeEmptySlide()
    addCanvasEventListeners()
  }

})


</script>

<template>
  <section class="bg-gray-900 flex h-full min-h-0 min-w-0 w-full">
    <!-- 拼贴系列面板 - 移动到左侧 -->
    <CollageSeriesPanel />
    <!-- 主画布区域 -->
    <div ref="canvasAreaRef"
      class="p-2 border-r border-[#e6e6e6] bg-[#E5E5E5] flex flex-1 flex-row min-h-0 min-w-0 items-center justify-center relative overflow-hidden"
      @dragover="handleDragOver" @drop="handleDrop">
      <!-- 一级工具栏：模式选择 - 放在头部 -->
      <FirstToolbar />
      <!-- 新增canvas-wrapper，包裹canvas和button -->
      <div ref="canvasWrapperRef" class="canvas-wrapper" style="position: relative;">
        <!-- 画布本体 -->
        <canvas ref="canvasEl" class="border border-[#e6e6e6] rounded-2xl" />
        <paperCanvas v-if="collaging || result_data.length > 0" />
        <!-- 对象操作按钮 -->
        <ObjectActionButtons />
      </div>
      <!-- Container工具栏：仅在container模式下显示 -->
      <ContainerToolbar v-if="selectedMode === 'container'" />
      <!-- Emitter工具栏：仅在emitter模式下显示 -->
      <EmitterToolbar v-if="selectedMode === 'emitter'" />
      <!-- Force工具栏：仅在force模式下显示 -->
      <ForceToolbar v-if="selectedMode === 'force'" />
      <!-- 画笔粗细调节面板，仅在绘制/擦除模式下显示 -->
      <BrushSizePanel v-if="mode === 'draw' || mode === 'erase'" />
    </div>
  </section>
</template>
