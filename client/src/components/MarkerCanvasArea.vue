<script setup lang="ts">
import { Canvas, PencilBrush, Group } from 'fabric'
import { ref, onMounted, onBeforeUnmount, nextTick, watch, computed } from 'vue'
import { useResizeHandleStore } from '~/stores/resizeHandle'
import { useMarkerCanvasModeStore } from '~/stores/markerCanvasMode'
import { useMarkerObjectActionsStore } from '~/stores/markerObjectActions'
import { useBrushSizeStore } from '~/stores/brushsize'
import { useMarkerShapeDrawingStore } from '~/stores/markerShapeDrawing'
import { useColorPickerStore } from '~/stores/colorpicker'

const colorPickerStore = useColorPickerStore()
const resizeHandleStore = useResizeHandleStore()
const markerCanvasModeStore = useMarkerCanvasModeStore()
const markerObjectActionsStore = useMarkerObjectActionsStore()
const {
  updateActionBtnPosition,
  updateActionBtnVisble,
  hideBtns,
  setCurrentPathObj
} = markerObjectActionsStore
const brushSizeStore = useBrushSizeStore()

// 形状绘制store
const markerShapeDrawingStore = useMarkerShapeDrawingStore()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const canvasContainerRef = ref<HTMLDivElement | null>(null)
const canvasWidth = ref(0)
const canvasHeight = ref(0)
let canvas: Canvas | null = null

// 实时预览图
const previewDataUrl = ref<string>('')
const previewGroup = ref<Group | null>(null)

async function updatePreview() {
  // 获取当前画布的所有对象
  if (!canvas) return

  // 获取画布上的所有对象
  const allObjects = canvas.getObjects()
  //新建一个fabricjs的group，将所有objectsgroup一起
  const cloneObjects = await Promise.all(allObjects.map(async (obj) => {
    return obj.clone()
  }))
  previewGroup.value = new Group(cloneObjects)
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = 60
  tempCanvas.height = 60

  const tempFabricCanvas = new Canvas(tempCanvas, {
    width: 60,
    height: 60,
    backgroundColor: '#ffffff'
  })
  const originWidth = previewGroup.value.width
  const originHeight = previewGroup.value.height
  // 计算缩放比例，确保对象适合缩略图 
  const scaleX = 50 / Math.max(originWidth, 1)
  const scaleY = 50 / Math.max(originHeight, 1)
  const scale = Math.min(scaleX, scaleY, 1) // 不超过原始大小
  //把克隆对象放到画布正中央，做好缩放，并导出给previewDataUrl
  previewGroup.value.set('left', 30)
  previewGroup.value.set('top', 30)
  previewGroup.value.set('scaleX', scale)
  previewGroup.value.set('scaleY', scale)
  previewGroup.value.set('originX', 'center')
  previewGroup.value.set('originY', 'center')
  previewGroup.value.set('opacity', 1)
  tempFabricCanvas.add(previewGroup.value)
  tempFabricCanvas.renderAll()
  previewDataUrl.value = tempFabricCanvas.toDataURL({ format: 'png', multiplier: 1, enableRetinaScaling: false as any })


}

// 更新画布尺寸
function updateCanvasSize() {
  
  if (canvasEl.value && canvas) { 
    const rect = canvasContainerRef.value.getBoundingClientRect()
    const newWidth = rect.width-16
    const newHeight = rect.height-16 
    if (newWidth !== canvasWidth.value || newHeight !== canvasHeight.value) {
      canvasWidth.value = newWidth
      canvasHeight.value = newHeight
      const dpr = window.devicePixelRatio || 1
      canvasEl.value.width = canvasWidth.value * dpr
      canvasEl.value.height = canvasHeight.value * dpr
      canvas.setWidth(canvasWidth.value)
      canvas.setHeight(canvasHeight.value)
      canvas.renderAll()
    }
  }
}

// 监听store中左侧宽度的变化
watch(() => resizeHandleStore.leftWidth, () => {
  setTimeout(() => {
    updateCanvasSize()
  }, 0)
})
// 监听颜色变化，更新画笔颜色
watch(() => colorPickerStore.selectedColor, (color) => {
  // 更新画笔颜色（仅在Marker模式下）
  if (canvas && canvas.freeDrawingBrush) {
    canvas.freeDrawingBrush.color = color
  }
})
// 监听画笔宽度变化
watch(() => brushSizeStore.brushWidth, (newWidth) => {
  if (canvas && (markerCanvasModeStore.mode === 'draw' || markerCanvasModeStore.mode === 'erase')) {
    const dpr = window.devicePixelRatio || 1
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = newWidth * dpr
    }
  }
})

onMounted(async () => {
  await nextTick()
  setTimeout(() => {
    if (canvasEl.value && canvasContainerRef.value) {
      const rect = canvasContainerRef.value.getBoundingClientRect()
      const initialWidth = rect.width-16
      const initialHeight = rect.height-16
      canvasWidth.value = initialWidth
      canvasHeight.value = initialHeight
      canvas = new Canvas(canvasEl.value, {
        backgroundColor: '#ffffff',
        isDrawingMode: false,
        selection: true,
        width: canvasWidth.value,
        height: canvasHeight.value,
      })
      const brush = new PencilBrush(canvas)
      brush.color = '#000000'
      brush.width = brushSizeStore.brushWidth * (window.devicePixelRatio || 1)
      canvas.freeDrawingBrush = brush
      markerCanvasModeStore.setCanvas(() => canvas)
      markerObjectActionsStore.setCanvas(() => canvas)

      // 设置形状绘制store的canvas引用
      markerShapeDrawingStore.setMarkerCanvas(() => canvas)


      // 其他事件监听
      canvas.on('object:added', (e) => {
        updatePreview()
      })
      canvas.on('selection:created', () => {
        setCurrentPathObj()
        updateActionBtnVisble()
        updateActionBtnPosition()
      })
      canvas.on('selection:updated', () => {
        setCurrentPathObj()
        updateActionBtnVisble()
        updateActionBtnPosition()
      })
      canvas.on('selection:cleared', hideBtns)
      canvas.on('object:moving', hideBtns)
      canvas.on('object:scaling', hideBtns)
      canvas.on('object:rotating', hideBtns)
      canvas.on('object:modified', () => {
        setCurrentPathObj()
        updateActionBtnVisble()
        updateActionBtnPosition()
        updatePreview()
      })
      canvas.on('object:removed', updatePreview)

      // 添加形状绘制事件监听器
      markerShapeDrawingStore.addMarkerShapeEventListeners()

      canvas.renderAll()
    }
  }, 200)
})

onBeforeUnmount(() => {
  // 移除形状绘制事件监听器
  markerShapeDrawingStore.removeMarkerShapeEventListeners()

  if (canvas) {
    canvas.off('object:added')
    canvas.off('selection:created')
    canvas.off('selection:updated')
    canvas.off('selection:cleared')
    canvas.off('object:moving')
    canvas.off('object:scaling')
    canvas.off('object:rotating')
    canvas.off('object:modified')
    canvas.off('object:removed')
    canvas.dispose()
  }
})
</script>

<template>
  <!-- 画布区域 -->
  <div ref="canvasContainerRef" class="flex justify-center items-center bg-gray-100 min-h-0 w-full h-full relative overflow-hidden">
    <canvas ref="canvasEl" class="w-full h-full border border-gray-300 rounded-lg shadow-sm" />

    <!-- 实时预览图 - 左上角 -->
    <div v-if="previewDataUrl"
      draggable="false"
      class="absolute top-5 left-5 z-10 bg-white/80 border border-gray-300 rounded shadow-sm p-1">
      <img :src="previewDataUrl" alt="" class="block w-30px h-30px h-auto rounded" />
    </div>

    <!-- 工具栏 - 底部居中，卡片样式 -->
    <div class="absolute left-1/2 bottom-5 -translate-x-1/2 z-10">
      <div class="px-2 py-1 border border-[#e6e6e6] rounded-xl bg-white shadow">
        <MarkerToolbar />
      </div>
    </div>

    <!-- 画笔大小调节面板 - 左上角（避开预览图） -->
    <BrushSizePanel v-if="markerCanvasModeStore.mode === 'draw' || markerCanvasModeStore.mode === 'erase'"/>

    <!-- 对象操作按钮 -->
    <MarkerObjectActionButtons />
  </div>
</template>

<style scoped>
.sub-canvas-area {
  min-height: 0;
}
</style>
