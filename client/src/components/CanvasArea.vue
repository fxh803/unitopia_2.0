<script setup lang="ts">
import { Canvas, PencilBrush } from 'fabric'
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
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
const selectedModeStore = useSelectedModeStore()
const { selectedMode, isContainerMode } = storeToRefs(selectedModeStore)
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
const { setMode } = canvasModeStore
const { 
  setDrawedObjectDataType, 
  adjustLayer, 
  containerColor,
  removeObjectsByMarkerId,
  isDropOnEmitter,
  getBezierApproxLength,
  calculateBezierPoint,
  getEmitterSampledPoints,
  addMarkers,
  handleEmitterDrop,
  handleMarkerDrop,
  handleDragOver,
  handleDrop
} = canvasStore

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
    },
    'mouse:over': (e) => {
      // 鼠标悬停在对象上时添加偏透明蓝色效果
      if (e.target && e.target.get('dataType') === 'container') {
        e.target.set('opacity', 0.7)
        canvas.renderAll()
      } 
      if (e.target && e.target.get('dataType') === 'emitter') {
        // emitter是group，需要遍历其中的子对象设置透明度
        e.target.getObjects().forEach((childObj: any) => {
          childObj.set('opacity', 0.5)
        })
        canvas.renderAll()
      }
    },
    'mouse:out': (e) => {
      // 鼠标离开对象时恢复原始透明度
      if (e.target && e.target.get('dataType') === 'container') {
        e.target.set('opacity', 1)      
        canvas.renderAll()
      }
      if (e.target && e.target.get('dataType') === 'emitter') {
        // emitter是group，需要遍历其中的子对象恢复透明度
        e.target.getObjects().forEach((childObj: any) => {
          childObj.set('opacity', 1)
        })
        canvas.renderAll()
      }
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
  canvas.off('mouse:over')
  canvas.off('mouse:out')
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
    if (selectedMode.value === null) {
      canvas?.getObjects().forEach(obj => {
        if (obj.get('dataType') === 'marker') {
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
  }

})


</script>

<template>
  <section class="bg-gray-900 flex h-full min-h-0 min-w-0 w-full">
    <!-- 主画布区域 -->
    <div ref="canvasAreaRef"
      class="p-2 border-r border-[#e6e6e6] bg-[#ffffff] flex flex-1 flex-row min-h-0 min-w-0 items-center justify-center relative overflow-hidden canvas-with-grid"
      @dragover="handleDragOver" @drop="(e) => handleDrop(e, canvasEl)">
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
