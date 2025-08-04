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
const selectedModeStore = useSelectedModeStore()
const {selectedMode, isContainerMode} = storeToRefs(selectedModeStore) 

const brushSizeStore = useBrushSizeStore()
const { brushWidth } = storeToRefs(brushSizeStore) 

const collageSeriesStore = useCollageSeriesStore()
const { collageSeries, currentSlideIndex } = storeToRefs(collageSeriesStore)
const {  
  initializeEmptySlide, 
  updateCurrentSlide, 
  addNewSlide, 
  handleCollageSeriesSelect, 
  handleDeleteCollageSeries,
  setupCanvasChangeListener
} = collageSeriesStore

const canvasModeStore = useCanvasModeStore()
const { mode } = storeToRefs(canvasModeStore)
const { setMode, clearCanvas } = canvasModeStore

const objectActionsStore = useObjectActionsStore()
const { showDeleteBtn,
  deleteBtnPosition,
  showClosePathBtn,
  closePathBtnPosition,
  isPathClosed } = storeToRefs(objectActionsStore)

const {
  updateDeleteBtnPosition,
  deleteActiveObject,
  updateClosePathBtnPosition,
  togglePathClosed,
  hideBtns
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
    else{
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
  }, 100)

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
    // 初始化空白幻灯片
    initializeEmptySlide()
    // 设置画布变化监听器
    setupCanvasChangeListener()
  }
  window.addEventListener('resize', updateCanvasSize)

  if (!canvas) return
  // 事件监听
  const handleSelection = () => {
    updateDeleteBtnPosition()
    updateClosePathBtnPosition()
  }
  canvas.on({
    'selection:created': handleSelection,
    'selection:updated': handleSelection,
    'selection:cleared': hideBtns,
    'object:moving': hideBtns,
    'object:scaling': hideBtns,
    'object:rotating': hideBtns,
    'object:modified': () => {
      updateDeleteBtnPosition()
      updateClosePathBtnPosition()
    },
  })
  canvas.renderAll() 
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
        <!-- 删除按钮 -->
        <button v-if="showDeleteBtn" class="delete-btn" :style="deleteBtnPosition" @click="deleteActiveObject">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path
              d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
            <path fill-rule="evenodd"
              d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
          </svg>
        </button>
        <!-- 画布本体 -->
        <canvas ref="canvasEl" class="border border-[#e6e6e6] rounded-2xl" />
        <!-- 封闭路径按钮 -->
        <button
          v-if="showClosePathBtn"
          class="close-path-btn"
          :style="closePathBtnPosition"
          @click="togglePathClosed"
        >
          <svg v-if="!isPathClosed" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <!-- 蓝色圆圈+对勾 -->
            <circle cx="8" cy="8" r="7" stroke="white" stroke-width="2" fill="none"/>
            <path d="M4 8l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <!-- 红色圆圈+叉 -->
            <circle cx="8" cy="8" r="7" stroke="white" stroke-width="2" fill="none"/>
            <path d="M5 5l6 6M11 5l-6 6" stroke="white" stroke-width="2" fill="none"/>
          </svg>
        </button>
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

<style scoped>
.delete-btn {
  position: absolute;
  z-index: 10;
  background-color: #f87171;
  /* red-400 */
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transform: translate(-50%, -50%);
  transition: all 0.2s ease;
  pointer-events: none;
  /* 让事件穿透按钮，到达下面的控制点 */
}

.delete-btn>svg {
  pointer-events: all;
  /* 让SVG图标本身可以响应点击 */
}

.delete-btn:hover {
  background-color: #ef4444;
  /* red-500 */
  transform: translate(-50%, -50%) scale(1.1);
}
.close-path-btn {
  position: absolute;
  z-index: 10;
  background-color: #60a5fa; /* blue-400 */
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transform: translate(-50%, -50%);
  transition: all 0.2s ease;
  pointer-events: all;
}
.close-path-btn:hover {
  background-color: #2563eb; /* blue-600 */
  transform: translate(-50%, -50%) scale(1.1);
}
</style>
