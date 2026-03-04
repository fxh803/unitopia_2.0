<script setup lang="ts">
import { Canvas, PencilBrush } from 'fabric'
import * as fabric from 'fabric'
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMarkerCanvasModeStore } from '~/stores/markerCanvasMode'
import { useMarkerObjectActionsStore } from '~/stores/markerObjectActions'
import { useBrushSizeStore } from '~/stores/brushsize'
import { useMarkerShapeDrawingStore } from '~/stores/markerShapeDrawing'
import { useColorPickerStore } from '~/stores/colorpicker'
import { useMarkerCanvasStore } from '~/stores/markerCanvas'
import { useMarkInstanceStore } from '~/stores/markInstance'

const colorPickerStore = useColorPickerStore()
const { isColorPickerOpen } = storeToRefs(colorPickerStore)
const markerCanvasModeStore = useMarkerCanvasModeStore()
const markerObjectActionsStore = useMarkerObjectActionsStore()
const brushSizeStore = useBrushSizeStore()
const { isMarkerBrushSizePanelOpen } = storeToRefs(brushSizeStore)
// 形状绘制store
const markerShapeDrawingStore = useMarkerShapeDrawingStore()

// Marker Canvas store
const markerCanvasStore = useMarkerCanvasStore()
const { closePathConfirm, previewDataUrl } = storeToRefs(markerCanvasStore)
const { askToClosePath, handleClosePathConfirm, addMarkerCanvasEventListeners, removeMarkerCanvasEventListeners, setSuppressClosePath } =
  markerCanvasStore

// Mark 实例 store：用于根据当前选中实例加载 / 恢复画布
const markInstanceStore = useMarkInstanceStore()
const { markInstances, selectedMarkForDetail } = storeToRefs(markInstanceStore)

const canvasEl = ref<HTMLCanvasElement | null>(null)
const canvasContainerRef = ref<HTMLDivElement | null>(null)
const canvasWidth = ref(0)
const canvasHeight = ref(0)
let canvas: Canvas | null = null
function loadCurrentMarkCanvas() {
  if (!canvas) return
  const sel = selectedMarkForDetail.value
  if (!sel) {
    canvas.clear()
    canvas.backgroundColor = '#fffef8'
    canvas.renderAll()
    return
  }

  // 根据选中的类型，决定使用父实例还是子实例的画布数据
  let markerJson: any | null = null

  if (sel.type === 'instance') {
    const inst = markInstances.value.find(m => m.id === sel.markId)
    markerJson = inst?.markerJsonData ?? null
  } else {
    const parent = markInstances.value.find(m => m.id === sel.parentMarkId)
    const child = parent?.children.find(c => c.id === sel.childId)
    // 优先使用 child 自己的 jsonData，若没有则回退用父实例的
    if (child?.markerJsonData) {
      markerJson = child.markerJsonData
    } else if (parent?.markerJsonData) {
      markerJson = parent.markerJsonData
    }
  }

  if (!markerJson) {
    canvas.clear()
    canvas.backgroundColor = '#fffef8'
    canvas.renderAll()
    return
  }
  // 批量恢复对象时不弹出闭合路径确认对话框
  setSuppressClosePath(true)
  // 我们在 store 里保存的是 objects 数组，这里组装成 Fabric 需要的 JSON
  const jsonForLoad = Array.isArray(markerJson)
    ? { version: '5.0.0', objects: markerJson }
    : markerJson

  canvas.loadFromJSON(jsonForLoad, () => {
    setTimeout(() => {
      if (!canvas) return
      canvas.backgroundColor = '#fffef8'
      canvas.renderAll()
      setSuppressClosePath(false)
    }, 50)
  })
}
// 监听颜色变化，更新画笔颜色
watch(() => colorPickerStore.selectedColor, (color) => {
  // 更新画笔颜色（仅在Marker模式下）
  if (canvas && canvas.freeDrawingBrush) {
    canvas.freeDrawingBrush.color = color
  }
})
// 监听画笔宽度变化
watch(() => brushSizeStore.markerBrushWidth, (newWidth) => {
  if (canvas && (markerCanvasModeStore.mode === 'draw' || markerCanvasModeStore.mode === 'erase')) {
    const dpr = window.devicePixelRatio || 1
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = newWidth * dpr
    }
  }
})

// 监听颜色选择器、路径闭合确认对话框和画笔大小面板状态，临时禁用绘制


watch([isColorPickerOpen, () => closePathConfirm.value.show, isMarkerBrushSizePanelOpen], ([colorPickerOpen, pathConfirmOpen, brushSizePanelOpen]) => {
  if (!canvas) return
  
  const shouldStopDrawing = colorPickerOpen || pathConfirmOpen || brushSizePanelOpen
  
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

// 当选中的 Mark 发生变化时，自动根据其保存的 markerJsonData 恢复画布
watch(
  () => selectedMarkForDetail.value,
  () => {
    // 需要等 canvas 初始化完成
    if (!canvas) return
    loadCurrentMarkCanvas()
  },
)

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
    markerObjectActionsStore.deleteActiveObject()
  }
}

onMounted(async () => {
  await nextTick()
  setTimeout(() => {
    if (canvasEl.value && canvasContainerRef.value) {
      const rect = canvasContainerRef.value.getBoundingClientRect()
      const initialWidth = rect.width
      const initialHeight = rect.height
      canvasWidth.value = initialWidth
      canvasHeight.value = initialHeight
      canvas = new Canvas(canvasEl.value, {
        backgroundColor: '#fffef8',
        isDrawingMode: false,
        selection: true,
        width: canvasWidth.value,
        height: canvasHeight.value,
      })
      const brush = new PencilBrush(canvas)
      brush.color = '#000000'
      brush.width = brushSizeStore.markerBrushWidth * (window.devicePixelRatio || 1)
      canvas.freeDrawingBrush = brush
      markerCanvasModeStore.setCanvas(() => canvas)
      markerObjectActionsStore.setCanvas(() => canvas)
      markerCanvasStore.setCanvas(() => canvas)

      // 设置形状绘制store的canvas引用
      markerShapeDrawingStore.setMarkerCanvas(() => canvas)

      // 添加画布事件监听器
      addMarkerCanvasEventListeners()

      // 添加形状绘制事件监听器
      markerShapeDrawingStore.addMarkerShapeEventListeners()

      // 添加键盘事件监听
      document.addEventListener('keydown', handleKeyDown)

      canvas.renderAll()

      // 初始挂载时，根据当前选中的 Mark 恢复一次画布内容
      loadCurrentMarkCanvas()
    }
  }, 200)
})


onBeforeUnmount(() => {
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyDown)
  
  // 移除形状绘制事件监听器
  markerShapeDrawingStore.removeMarkerShapeEventListeners()
  
  // 移除画布事件监听器
  removeMarkerCanvasEventListeners()

  if (canvas) {
    canvas.dispose()
  }
})
</script>

<template>
  <!-- 画布区域 -->
  <div ref="canvasContainerRef" class="flex justify-center items-center bg-gray-100 min-h-0 w-full h-full relative overflow-hidden">
    <canvas ref="canvasEl" class="w-full h-full border-r border-gray-200" />

    <!-- 实时预览图 - 左上角 -->
    <!-- <div v-if="previewDataUrl"
      draggable="false"
      class="absolute top-5 left-5 z-10 bg-white/80 border border-gray-300 rounded shadow-sm p-1">
      <img :src="previewDataUrl" alt="" class="block w-30px h-30px h-auto rounded" />
    </div> -->

    <!-- 对象操作按钮 -->
    <MarkerObjectActionButtons />
    
    <!-- 路径闭合确认对话框 -->
    <ClosePathConfirm 
      :confirm-state="closePathConfirm"
      :on-confirm="handleClosePathConfirm"
    />
  </div>
</template>

<style scoped>
.sub-canvas-area {
  min-height: 0;
}
</style>
