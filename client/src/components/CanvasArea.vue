<script setup lang="ts">
import { Canvas, PencilBrush, FabricImage } from 'fabric'
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
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
import { sendPointToSegmentPoint } from '~/composables/server'
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

const brushSizeStore = useBrushSizeStore()
const { brushWidth, isMainBrushSizePanelOpen } = storeToRefs(brushSizeStore)

const collageSeriesStore = useCollageSeriesStore()
const { stopListen, currentOverviewIndex, overviews } = storeToRefs(collageSeriesStore)
const {
  initializeEmptySlide
} = collageSeriesStore

const canvasModeStore = useCanvasModeStore()
const canvasStore = useCanvasStore()
const { mode } = storeToRefs(canvasModeStore)
const { closePathConfirm, isSegmentLoading } = storeToRefs(canvasStore)
const { setMode } = canvasModeStore
const {
  adjustLayer,
  handleDragOver,
  handleDrop,
  addCanvasEventListeners,
  removeCanvasEventListeners
} = canvasStore

const objectActionsStore = useObjectActionsStore()


const shapeDrawingStore = useShapeDrawingStore()
const {
  addShapeEventListeners,
  removeShapeEventListeners
} = shapeDrawingStore

const forceDrawingStore = useForceDrawingStore()
const { addForcePointListener, removeForcePointListener, startBlinkAnimation, stopBlinkAnimation } = forceDrawingStore
const bezierDrawingStore = useBezierDrawingStore()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const canvasAreaRef = ref<HTMLDivElement | null>(null)
// 画布宽高分开控制，不再强制 1:1
const canvasWidth = ref(400)
const canvasHeight = ref(400)
let canvas: Canvas | null = null

const backgroundStore = useBackgroundStore()
import { useContainerStore } from '~/stores/container'
const containerStore = useContainerStore()

// 检查是否有背景
const hasBackground = computed(() => {
  if (overviews.value.length === 0) return false
  const currentOverview = overviews.value[currentOverviewIndex.value]
  if (!currentOverview) return false
  return backgroundStore.getCurrentOverviewBackground(currentOverview.overviewId) !== null
})


function getDpr() {
  return window.devicePixelRatio || 1
}

function resizeCanvasForDPR() {
  if (!canvas || !canvasEl.value) return
  const dpr = getDpr()
  const width = canvasWidth.value
  const height = canvasHeight.value
  canvasEl.value.width = width * dpr
  canvasEl.value.height = height * dpr
  canvas.setWidth(width)
  canvas.setHeight(height)
  // canvas.setZoom(dpr)
  canvas.renderAll()
}

function handleLibraryContainerDrop(e: DragEvent) {
  if (!canvas) return
  const id = e.dataTransfer?.getData('library-container-id')
  if (!id) return

  const item = containerStore.containers.find(c => c.id === id)
  if (!item || !item.source) return

  // 计算鼠标在实际 canvas 内部的坐标（考虑 canvas 居中和缩放）
  let centerX = canvas.getWidth() / 2
  let centerY = canvas.getHeight() / 2
  if (canvasEl.value) {
    const rect = canvasEl.value.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      const relX = (e.clientX - rect.left) / rect.width
      const relY = (e.clientY - rect.top) / rect.height
      centerX = relX * canvas.getWidth()
      centerY = relY * canvas.getHeight()
    }
  }

  FabricImage.fromURL(item.source)
    .then(fabricImg => {
      if (!canvas) return

      fabricImg.set({
        left: centerX,
        top: centerY,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        dataType: 'container',
      })

      const canvasWidth = canvas.getWidth() || 400
      const canvasHeight = canvas.getHeight() || 400
      const maxWidth = canvasWidth * 0.8
      const maxHeight = canvasHeight * 0.8

      const scaleX = maxWidth / fabricImg.width!
      const scaleY = maxHeight / fabricImg.height!
      const scale = Math.min(scaleX, scaleY, 1)

      fabricImg.set({
        scaleX: scale,
        scaleY: scale,
      })

      canvas.add(fabricImg)
      adjustLayer()
      canvas.renderAll()
    })
    .catch(error => {
      console.error('从库中加载 Container 失败:', error)
    })
}

function updateCanvasSize() {
  const parent = canvasAreaRef.value
  if (parent) {
    const rect = parent.getBoundingClientRect()
    // 按父容器宽高分别计算尺寸，不再强制正方形
    const paddingX = 150
    const paddingY = 20
    const width = Math.floor(rect.width - paddingX)
    const height = Math.floor(rect.height - paddingY)
    canvasWidth.value = Math.max(width, 200)
    canvasHeight.value = Math.max(height, 200)
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
// Segment Point 点击处理
let segmentPointListener: ((e: any) => void) | null = null

function addSegmentPointListener() {
  if (!canvas || segmentPointListener) return
  
  segmentPointListener = async (e: any) => {
    if (mode.value !== 'segmentPoint') return
    if (!e.pointer) return
    
    // 立即重置 mode，避免重复点击
    setMode(null)
    
    const point = {
      x: e.pointer.x,
      y: e.pointer.y
    }
    
    // 显示加载动画
    canvasStore.setSegmentLoading(true)
    
    try {
      // 调用后端接口
      const result = await sendPointToSegmentPoint(canvas, point)
      
      if (result) {
      // 将返回的mask添加到画布
      const imageDataUrl = result.mask.startsWith('data:') 
        ? result.mask 
        : `data:image/png;base64,${result.mask}`
      
      FabricImage.fromURL(imageDataUrl).then((fabricImg) => {
        if (!canvas) return
        fabricImg.set({
          left: result.bbox.x,
          top: result.bbox.y,
          originX: 'left',
          originY: 'top',
          selectable: true,
          evented: true,
          dataType: 'container'
        })
        
        canvas.add(fabricImg)
        canvas.renderAll()
      }).catch((error) => {
        console.error('Mask加载失败:', error)
      })
      }
    } finally {
      // 隐藏加载动画
      canvasStore.setSegmentLoading(false)
    }
  }
  
  canvas.on('mouse:down', segmentPointListener)
}

function removeSegmentPointListener() {
  if (!canvas || !segmentPointListener) return
  canvas.off('mouse:down', segmentPointListener)
  segmentPointListener = null
}

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
  
  // 处理 segmentPoint 模式的点击事件
  if (mode.value === 'segmentPoint') {
    addSegmentPointListener()
  } else {
    removeSegmentPointListener()
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

// 监听路径闭合确认对话框和画笔大小面板状态，临时禁用绘制
watch([() => closePathConfirm.value.show, isMainBrushSizePanelOpen], ([pathConfirmOpen, brushSizePanelOpen]) => {
  if (!canvas) return

  const shouldStopDrawing = pathConfirmOpen || brushSizePanelOpen

  if (shouldStopDrawing) {
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

// 处理键盘删除事件
const handleKeyDown = (e: KeyboardEvent) => {
  // Delete 或 Backspace 键删除选中的对象
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // 如果焦点在输入框、文本域等可编辑元素上，不阻止默认行为，允许正常删除文本
    const target = e.target as HTMLElement
    const isEditable = target.tagName === 'INPUT' ||
                       target.tagName === 'TEXTAREA' ||
                       target.isContentEditable ||
                       target.closest('input') ||
                       target.closest('textarea') ||
                       target.closest('[contenteditable="true"]')

    if (isEditable) {
      return // 允许在输入框中正常使用 backspace/delete
    }

    e.preventDefault()
    objectActionsStore.deleteActiveObject()
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
      backgroundColor: '#fffef8',
      isDrawingMode: false,
      selection: false,
      width: canvasWidth.value,
      height: canvasHeight.value,
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
    // dataScaleStore.setCanvas(() => canvas)

    // 初始化空白幻灯片
    initializeEmptySlide()
    addCanvasEventListeners()

    // 添加键盘事件监听
    document.addEventListener('keydown', handleKeyDown)

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

onBeforeUnmount(() => {
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyDown)
  // 移除 segmentPoint 监听
  removeSegmentPointListener()
})


</script>

<template>
  <section class="bg-[var(--primary-light-color)] flex h-full min-h-0 min-w-0 w-full">
    <!-- 主画布区域 -->
    <div
      ref="canvasAreaRef"
      data-tutorial="canvas-editor"
      class="p-2 pl-7 border-r border-[var(--border-color)] bg-[var(--primary-light-color)] flex flex-1 flex-row min-h-0 min-w-0 items-center justify-center relative overflow-hidden canvas-with-grid"
      @dragover="handleDragOver"
      @drop="(e) => { handleLibraryContainerDrop(e); if (canvasEl) handleDrop(e, canvasEl) }">
      <!-- 工具栏容器：垂直居中，包含所有工具栏 -->
      <div class="absolute left-0 z-10 flex flex-col items-start gap-2" style="top: 50%; transform: translateY(-50%);">
        <!-- 一级工具栏：模式选择 -->
        <FirstToolbar />
        <!-- Container工具栏：仅在container模式下显示 -->
        <ContainerToolbar v-if="selectedMode === 'container'" />
        <!-- Emitter工具栏：仅在emitter模式下显示 -->
        <EmitterToolbar v-if="selectedMode === 'emitter'" />
        <!-- Force工具栏：仅在force模式下显示 -->
        <ForceToolbar v-if="selectedMode === 'force'" />
      </div>
      
      <!-- Segment Buttons 面板 - 独立于工具栏，可拖拽 -->
      <div 
        v-if="selectedMode === 'container' && hasBackground" 
        class="absolute inset-0 z-[60] pointer-events-none"
      >
        <SegmentButtons />
      </div>
      
      <!-- 新增canvas-wrapper，包裹canvas和button -->
      <div ref="canvasWrapperRef" class="canvas-wrapper" style="position: relative;">
        <!-- 画布本体 -->
        <canvas ref="canvasEl" class="border border-[var(--border-color)] rounded-2xl" />
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
        
        <!-- Segment 加载动画 -->
        <div 
          v-if="isSegmentLoading" 
          class="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center z-50 pointer-events-auto"
        >
          <div class="segment-loading-grid">
            <div v-for="i in 100" :key="i" class="segment-loading-dot" :style="{ animationDelay: `${(i % 10) * 0.1 + Math.floor(i / 10) * 0.1}s` }"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.canvas-with-grid {
  background-color: var(--primary-light-color);
  background-image: url('/transparency_grid.svg');
  background-size: 500px 500px;
  background-repeat: repeat;
  background-position: 0 0;
}

/* Segment 加载动画 */
.segment-loading-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
  gap: 2px;
  width: 100%;
  height: 100%;
  padding: 8px;
}

.segment-loading-dot {
  width: 100%;
  height: 100%;
  max-width: 6px;
  max-height: 6px;
  background-color: white;
  border-radius: 50%;
  animation: segmentDotBlink 1.5s ease-in-out infinite;
  opacity: 0.3;
  margin: auto;
}

@keyframes segmentDotBlink {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}
</style>
