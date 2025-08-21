<script setup lang="ts">
import { Canvas, PencilBrush, Group } from 'fabric'
import { ref, onMounted, onBeforeUnmount, nextTick, watch, computed } from 'vue'
import { useResizeHandleStore } from '~/stores/resizeHandle'
import { useSubCanvasModeStore } from '~/stores/markerCanvasMode'
import { useSubObjectActionsStore } from '~/stores/markerObjectActions'
import { useBrushSizeStore } from '~/stores/brushsize'

const resizeHandleStore = useResizeHandleStore()
const subCanvasModeStore = useSubCanvasModeStore()
const subObjectActionsStore = useSubObjectActionsStore()
const brushSizeStore = useBrushSizeStore()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const canvasContainerRef = ref<HTMLDivElement | null>(null)
const canvasWidth = ref(0)
const canvasHeight = ref(0)
let canvas: Canvas | null = null

// 实时预览图
const previewDataUrl = ref<string>('') 

async function updatePreview() {
  // 获取当前画布的所有对象
  if (!canvas) return
  
  // 获取画布上的所有对象
  const allObjects = canvas.getObjects() 
  //新建一个fabricjs的group，将所有objectsgroup一起
  const cloneObjects = await Promise.all(allObjects.map(async (obj) => {
    return obj.clone()
  }))
    const group = new Group(cloneObjects)
    const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 60
      tempCanvas.height = 60

      const tempFabricCanvas = new Canvas(tempCanvas, {
        width: 60,
        height: 60,
        backgroundColor: '#ffffff'
      }) 
      const originWidth = group.width
      const originHeight = group.height
      // 计算缩放比例，确保对象适合缩略图 
      const scaleX = 50 / Math.max(originWidth, 1)
      const scaleY = 50 / Math.max(originHeight, 1)
      const scale = Math.min(scaleX, scaleY, 1) // 不超过原始大小
      //把克隆对象放到画布正中央，做好缩放，并导出给previewDataUrl
      group.set('left', 30)
      group.set('top', 30)
      group.set('scaleX', scale)
      group.set('scaleY', scale)
      group.set('originX', 'center')
      group.set('originY', 'center')
      group.set('opacity', 1)
      tempFabricCanvas.add(group)
      tempFabricCanvas.renderAll()
      previewDataUrl.value = tempFabricCanvas.toDataURL({ format: 'png', multiplier: 1, enableRetinaScaling: false as any })
   
  
}

// 计算画布容器的实际尺寸
const containerWidth = computed(() => {
  const parentWidth = window.innerWidth - resizeHandleStore.leftWidth
  return parentWidth - 1
})

const containerHeight = computed(() => {
  if (canvasContainerRef.value) {
    const rect = canvasContainerRef.value.getBoundingClientRect()
    return rect.height - 32
  }
  return 300
})

// 更新画布尺寸
function updateCanvasSize() {
  if (canvasEl.value && canvas) {
    const newWidth = containerWidth.value - 32
    const newHeight = containerHeight.value
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

// 监听画笔宽度变化
watch(() => brushSizeStore.brushWidth, (newWidth) => {
  if (canvas && (subCanvasModeStore.mode === 'draw' || subCanvasModeStore.mode === 'erase')) {
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
      const initialWidth = containerWidth.value - 32
      const initialHeight = containerHeight.value
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
      subCanvasModeStore.setCanvas(() => canvas)
      subObjectActionsStore.setCanvas(() => canvas)


      // 其他事件监听
      canvas.on('object:added', (e) => {
        subCanvasModeStore.setDrawedObjectDataType(e)
        updatePreview()
      })
      canvas.on('selection:created', subObjectActionsStore.setCurrentPathObj)
      canvas.on('selection:updated', subObjectActionsStore.setCurrentPathObj)
      canvas.on('selection:cleared', subObjectActionsStore.hideBtns)
      canvas.on('object:moving', subObjectActionsStore.hideBtns)
      canvas.on('object:scaling', subObjectActionsStore.hideBtns)
      canvas.on('object:rotating', subObjectActionsStore.hideBtns)
      canvas.on('object:modified', () => {
        subObjectActionsStore.setCurrentPathObj()
        subObjectActionsStore.updateActionBtnVisble()
        subObjectActionsStore.updateActionBtnPosition()
        updatePreview()
      })
      canvas.on('object:removed', updatePreview)
      canvas.renderAll() 
    }
  }, 200)
})

onBeforeUnmount(() => {
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
    <div ref="canvasContainerRef" class="p-4 bg-gray-100 min-h-0 w-full h-full relative">
      <canvas 
        ref="canvasEl" 
        class="w-full h-full border border-gray-300 rounded-lg shadow-sm"
      />

      <!-- 实时预览图 - 左上角 -->
      <div v-if="previewDataUrl" class="absolute top-5 left-5 z-10 bg-white/80 border border-gray-300 rounded shadow-sm p-1">
        <img :src="previewDataUrl" alt="" class="block w-30px h-30px h-auto rounded" />
      </div>
      
      <!-- 新的横向工具栏 - 右上角 -->
      <div class="absolute top-5 right-6 z-10">
        <MarkerToolbar />
      </div>
      
      <!-- 画笔大小调节面板 - 左上角（避开预览图） -->
      <BrushSizePanel v-if="subCanvasModeStore.mode === 'draw' || subCanvasModeStore.mode === 'erase'" canvasType="sub" />
      
      <!-- 对象操作按钮 -->
      <MarkerObjectActionButtons />
    </div>
</template>

<style scoped>
.sub-canvas-area {
  min-height: 0;
}
</style>
