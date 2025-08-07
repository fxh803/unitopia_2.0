<script setup lang="ts">
import { Canvas, PencilBrush } from 'fabric'
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { storeToRefs } from 'pinia' 
import { useObjectActionsStore } from '~/stores/objectActions'
import { useColorPickerStore } from '~/stores/colorpicker'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useBrushSizeStore } from '~/stores/brushsize'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useShapeDrawingStore } from '~/stores/shapeDrawing'
import { useOverviewStore } from '~/stores/overview'
const selectedModeStore = useSelectedModeStore()
const {selectedMode, isContainerMode} = storeToRefs(selectedModeStore) 

const overviewStore = useOverviewStore()
const { updateMarkerObjects } = overviewStore
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
const { setMode, clearCanvas, setDrawedObjectDataType } = canvasModeStore

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

const canvasEl = ref<HTMLCanvasElement | null>(null)
const canvasAreaRef = ref<HTMLDivElement | null>(null)
const canvasWrapperRef = ref<HTMLDivElement | null>(null)
const canvasSize = ref(400)
let canvas: Canvas | null = null

const colorPickerStore = useColorPickerStore()

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
  canvas.setZoom(dpr)
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
function addCanvasEventListeners(){
  canvas.on({
    'selection:created': ()=>{
      setCurrentPathObj()
      updateActionBtnVisble()
    updateActionBtnPosition()
    
    },
    'selection:updated': ()=>{
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
      updateMarkerObjects()
      updateCurrentSlide()
    },
    'object:added': (e) => {
      setDrawedObjectDataType(e)
      updateMarkerObjects()
      updateCurrentSlide()
    },
    'object:removed': () => {
      updateMarkerObjects()
      updateCurrentSlide()
    }
  })
}
function removeCanvasEventListeners(){
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
watch (stopListen, (newVal) => {
  if (!newVal) {
    addCanvasEventListeners()
  } else {
    removeCanvasEventListeners()
  }
})
watch(selectedMode, (newMode, oldMode) => {
  if (newMode !== oldMode || newMode === null) {
    setMode(mode.value)
  }
})
// 监听 mode 变化，自动清理 shape 预览和事件
watch(mode, () => {
  if (!canvas) return
  if (mode.value !== 'rect' && mode.value !== 'ellipse') {
    removeShapeEventListeners();
    if (previewShape.value) {
      canvas.remove(previewShape.value)
      previewShape.value = null
    }
  }
  else {
    addShapeEventListeners();
  }
})
// 监听颜色变化，更新画笔颜色
watch(() => colorPickerStore.selectedColor, (color) => {
  // 更新画笔颜色（仅在Marker模式下）
  if (canvas && canvas.freeDrawingBrush && !isContainerMode.value) {
    canvas.freeDrawingBrush.color = color
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
    overviewStore.setCanvas(() => canvas)
    // 初始化空白幻灯片
    initializeEmptySlide()
    addCanvasEventListeners()
  }
  window.addEventListener('resize', updateCanvasSize)
 
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateCanvasSize)
  removeShapeEventListeners()
})

</script>

<template>
  <section class="bg-gray-900 flex h-full min-h-0 min-w-0 w-full">
    <!-- 拼贴系列面板 - 移动到左侧 -->
    <CollageSeriesPanel />
    <!-- 主画布区域 -->
    <div ref="canvasAreaRef"
      class="p-2 border-r border-[#e6e6e6] bg-[#E5E5E5] flex flex-1 flex-row min-h-0 min-w-0 items-center justify-center relative overflow-hidden">
      <!-- 新增canvas-wrapper，包裹canvas和button -->
      <div ref="canvasWrapperRef" style="position: relative;">
        <!-- 画布本体 -->
        <canvas ref="canvasEl" class="border border-[#e6e6e6] rounded-2xl" />
        <!-- 对象操作按钮 -->
        <ObjectActionButtons />
      </div>
      <!-- 一级工具栏：模式选择 -->
      <FirstToolbar />
      <!-- Container工具栏：仅在container模式下显示 -->
      <ContainerToolbar v-if="selectedMode === 'container'" />
      <!-- Marker工具栏：仅在marker模式下显示 -->
      <MarkerToolbar v-if="selectedMode === 'marker'" />
      <!-- 画笔粗细调节面板，仅在绘制/擦除模式下显示 -->
      <BrushSizePanel v-if="mode === 'draw' || mode === 'erase'" />
    </div>
  </section>
</template>
