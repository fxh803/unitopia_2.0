<script setup lang="ts">
import { Canvas, PencilBrush } from 'fabric'
import { ref, watch, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useObjectActionsStore } from '~/stores/objectActions'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useBrushSizeStore } from '~/stores/brushsize'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useCanvasStore } from '~/stores/canvas'
import { useShapeDrawingStore } from '~/stores/shapeDrawing'
import { useBezierDrawingStore } from '~/stores/bezierDrawing'
import { useForceDrawingStore } from '~/stores/forceDrawing'
import { useAnimationStore } from '~/stores/animation'
import { useBackgroundStore } from '~/stores/background'
import { useDataScaleStore } from '~/stores/dataScale'
const animationStore = useAnimationStore()
const { collaging, result_data } = storeToRefs(animationStore)

// paperCanvas重新挂载的key
const paperCanvasKey = ref(0)

// 监听collaging状态变化，在rerun时重新挂载paperCanvas
watch(collaging, (newVal, oldVal) => {
  // 当从false变为true时（开始rerun），重新挂载paperCanvas
  if (!oldVal && newVal) {
    paperCanvasKey.value++
  }
})

const selectedModeStore = useSelectedModeStore()
const { selectedMode } = storeToRefs(selectedModeStore)
const dataScaleStore = useDataScaleStore()

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
const canvasStore = useCanvasStore()
const { mode } = storeToRefs(canvasModeStore)
const { closePathConfirm } = storeToRefs(canvasStore)
const { setMode } = canvasModeStore
const { 
  setDrawedObjectDataType, 
  adjustLayer, 
  removeObjectsByMarkerId,
  isDropOnEmitter,
  getBezierApproxLength,
  calculateBezierPoint,
  getEmitterSampledPoints,
  addMarkers,
  handleEmitterDrop,
  handleMarkerDrop,
  handleDragOver,
  handleDrop,
  addCanvasEventListeners,
  removeCanvasEventListeners
} = canvasStore

const objectActionsStore = useObjectActionsStore()


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

// 获取每个工具栏的第一个按钮模式
const getFirstButtonMode = (mode: 'container' | 'emitter' | 'force' | null): 'draw' | 'bezier' | 'force' | null => {
  switch (mode) {
    case 'container':
      return 'draw'
    case 'emitter':
      return 'bezier'
    case 'force':
      return 'force'
    default:
      return null
  }
}

watch(selectedMode, (newMode, oldMode) => {
  if (newMode !== oldMode || newMode === null) {
    setMode(null)
    if (selectedMode.value === null) { //当画布模式为null
      if (canvas) {
        canvas.getObjects().forEach(obj => {
          if (obj.get('dataType') === 'marker') {
            obj.selectable = true;
            obj.evented = true;
          }
        });
        canvas.selection = true;
        canvas.renderAll();
      }
    } else {
      // 当切换到新的工具栏时，自动激活第一个按钮
      nextTick(() => {
        const firstButtonMode = getFirstButtonMode(newMode)
        if (firstButtonMode) {
          setMode(firstButtonMode)
        }
      })
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

// 监听路径闭合确认对话框状态，临时禁用绘制
watch(() => closePathConfirm.value.show, (pathConfirmOpen) => {
  if (!canvas) return
  
  if (pathConfirmOpen) {
    // 保存当前的绘制模式状态
    const wasDrawingMode = canvas.isDrawingMode
    canvas.set('wasDrawingMode', wasDrawingMode)
    // 临时禁用绘制
    canvas.isDrawingMode = false
  } else {
    // 恢复之前的绘制模式状态
    const wasDrawingMode = canvas.get('wasDrawingMode')
    if (wasDrawingMode !== undefined) {
      canvas.isDrawingMode = wasDrawingMode
      canvas.set('wasDrawingMode', undefined)
    }
  }
})



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
    canvasStore.setCanvas(() => canvas)
    dataScaleStore.setCanvas(() => canvas)
    
    // 初始化空白幻灯片
    initializeEmptySlide()
    addCanvasEventListeners()
    
    // 初始化时自动激活第一个工具栏的第一个按钮
    await nextTick()
    const initialMode = selectedMode.value
    if (initialMode) {
      const firstButtonMode = getFirstButtonMode(initialMode)
      if (firstButtonMode) {
        setMode(firstButtonMode)
      }
    }
  }

})


</script>

<template>
  <section class="bg-gray-900 flex h-full min-h-0 min-w-0 w-full">
    <!-- 主画布区域 -->
    <div ref="canvasAreaRef"
      class="p-2 border-r border-[#e6e6e6] bg-[#f5f5f5] flex flex-1 flex-row min-h-0 min-w-0 items-center justify-center relative overflow-hidden canvas-with-grid"
      @dragover="handleDragOver" @drop="(e) => handleDrop(e, canvasEl)">
      <!-- 一级工具栏：模式选择 - 放在头部 -->
      <FirstToolbar />
      <!-- 新增canvas-wrapper，包裹canvas和button -->
      <div ref="canvasWrapperRef" class="canvas-wrapper" style="position: relative;">
        <!-- 画布本体 -->
        <canvas ref="canvasEl" class="border border-[#e6e6e6] rounded-2xl" />
        <paperCanvas v-if="collaging || result_data.length > 0" :key="paperCanvasKey" />
        <!-- 对象操作按钮 -->
        <ObjectActionButtons />
        <!-- Marker 悬浮信息面板 -->
        <hoverInfoPanel />
        <!-- 路径闭合确认对话框 -->
        <ClosePathConfirm 
          :confirm-state="canvasStore.closePathConfirm"
          :on-confirm="canvasStore.handleClosePathConfirm"
        />
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
    <!-- 拼贴系列面板 - 移动到右侧 -->
    <CollageSeriesPanel />
  </section>
</template>

<style scoped>
.canvas-with-grid {
  background-image: url('/transparency_grid.svg');
  background-size: 500px 500px;
  background-repeat: repeat;
  background-position: 0 0;
}
</style>
