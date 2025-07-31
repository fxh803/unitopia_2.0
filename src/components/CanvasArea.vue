<script setup lang="ts">
import { Canvas, PencilBrush, Rect, Ellipse } from 'fabric'
import BrushSizePanel from './BrushSizePanel.vue'
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

import { useCanvasMode } from '~/composables/canvas/useCanvasMode'
import { useShapeDrawing } from '~/composables/canvas/useShapeDrawing'
import { useHistory } from '~/composables/canvas/useHistory'
import { useObjectActions } from '~/composables/canvas/useObjectActions'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const canvasAreaRef = ref<HTMLDivElement | null>(null)
const canvasWrapperRef = ref<HTMLDivElement | null>(null)
const brushWidth = ref(3)
const canvasSize = ref(400)
let canvas: Canvas | null = null

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

function clearCanvas() {
  if (canvas) {
    // 复制一份对象数组，避免遍历时出错
    const objects = canvas.getObjects().concat();
    objects.forEach(obj => {
      canvas!.remove(obj);
    });
    canvas.discardActiveObject();
    canvas.renderAll();
    // 背景色会自动保留，无需重新设置
  }
}

const mode = ref<'draw' | 'move' | 'erase' | 'rect' | 'ellipse' | null>(null)

// 形状绘制
const { isDrawingShape, shapeStart, previewShape, addShapeEventListeners, removeShapeEventListeners } = useShapeDrawing(() => canvas, mode)
// 模式切换
const { setMode } = useCanvasMode(() => canvas, mode, brushWidth, getDpr, removeShapeEventListeners, addShapeEventListeners, previewShape)
// 历史管理
const { 
  history, 
  currentSlideIndex,
  isSliding,
  initializeEmptySlide, 
  updateCurrentSlide, 
  addNewSlide, 
  handleHistorySelect, 
  handleDeleteHistory,
  setupCanvasChangeListener
} = useHistory(() => canvas)
// 对象操作
const {
  showDeleteBtn,
  deleteBtnPosition,
  showClosePathBtn,
  closePathBtnPosition,
  currentPathObj,
  updateDeleteBtnPosition,
  deleteActiveObject,
  updateClosePathBtnPosition,
  isPathClosed,
  togglePathClosed,
  hideBtns,
} = useObjectActions(() => canvas)

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
  removeShapeEventListeners()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateCanvasSize)
  removeShapeEventListeners()
})

</script>

<template>
  <section class="bg-gray-900 flex h-full min-h-0 min-w-0 w-full">
    <!-- 幻灯片历史区 - 移动到左侧 -->
    <HistoryPanel 
      :history="history" 
      :current-slide-index="currentSlideIndex"
      @select="handleHistorySelect" 
      @delete="handleDeleteHistory"
      @add-new="addNewSlide"
    />
    <!-- 主画布区域 -->
    <div ref="canvasAreaRef"
      class="p-2 border-r border-[#e6e6e6] bg-[#E5E5E5] flex flex-1 flex-row min-h-0 min-w-0 items-center justify-center relative overflow-hidden">
      <!-- 新增canvas-wrapper，包裹canvas和button -->
      <div ref="canvasWrapperRef" class="canvas-wrapper" style="position: relative; display: inline-block;">
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
      <!-- 工具栏 -->
      <CanvasToolbar :mode="mode" :set-mode="setMode" :on-clear="clearCanvas" />
      <!-- 画笔粗细调节面板，仅在绘制/擦除模式下显示 -->
      <BrushSizePanel v-if="mode === 'draw' || mode === 'erase'" :width="brushWidth"
        @update:width="brushWidth = $event" />
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
