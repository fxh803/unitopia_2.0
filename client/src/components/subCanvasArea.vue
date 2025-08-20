<script setup lang="ts">
import { Canvas, PencilBrush } from 'fabric'
import { ref, onMounted, onBeforeUnmount, nextTick, watch, computed } from 'vue'
import { useResizeHandleStore } from '~/stores/resizeHandle'

const resizeHandleStore = useResizeHandleStore()
const canvasEl = ref<HTMLCanvasElement | null>(null)
const canvasContainerRef = ref<HTMLDivElement | null>(null)
const canvasWidth = ref(0)
const canvasHeight = ref(0)
let canvas: Canvas | null = null

// 计算画布容器的实际尺寸
const containerWidth = computed(() => {
  // 获取父容器（DataEditor）的宽度，减去左侧容器的宽度
  const parentWidth = window.innerWidth - resizeHandleStore.leftWidth
  // 减去DataEditor的右边框宽度
  return parentWidth - 1 // 1px是border-r的宽度
})

const containerHeight = computed(() => {
  // 获取容器高度，减去padding和分隔线
  if (canvasContainerRef.value) {
    const rect = canvasContainerRef.value.getBoundingClientRect()
    return rect.height - 32 // 减去padding
  }
  return 300 // 默认高度
})

// 更新画布尺寸
function updateCanvasSize() {
  console.log('updateCanvasSize')
  console.log('容器宽度变化:', containerWidth.value, '容器高度:', containerHeight.value)
  
  if (canvasEl.value && canvas) {
    // 使用计算出的容器尺寸
    const newWidth = containerWidth.value - 32 // 减去padding
    const newHeight = containerHeight.value
    
    // 只有当尺寸真正发生变化时才更新
    if (newWidth !== canvasWidth.value || newHeight !== canvasHeight.value) {
      console.log('尺寸发生变化，更新画布:', newWidth, 'x', newHeight)
      canvasWidth.value = newWidth
      canvasHeight.value = newHeight
      
      const dpr = window.devicePixelRatio || 1
      canvasEl.value.width = canvasWidth.value * dpr
      canvasEl.value.height = canvasHeight.value * dpr
      canvas.setWidth(canvasWidth.value)
      canvas.setHeight(canvasHeight.value)
      canvas.renderAll()
      console.log('画布已更新到新尺寸:', canvasWidth.value, 'x', canvasHeight.value)
    }
  }
}

// 监听store中左侧宽度的变化
watch(() => resizeHandleStore.leftWidth, () => {
  console.log('左侧宽度变化，更新画布尺寸')
  // 延迟一下确保DOM已更新
  setTimeout(() => {
    updateCanvasSize()
  }, 0)
})

onMounted(async () => {
  await nextTick()
  
  // 延迟确保DOM完全渲染后再获取尺寸和创建画布
  setTimeout(() => {
    if (canvasEl.value && canvasContainerRef.value) {
      // 使用计算出的初始尺寸
      const initialWidth = containerWidth.value - 32
      const initialHeight = containerHeight.value
      console.log('初始画布区域尺寸:', initialWidth, 'x', initialHeight)
      
      canvasWidth.value = initialWidth
      canvasHeight.value = initialHeight
      
      // 创建画布
      canvas = new Canvas(canvasEl.value, {
        backgroundColor: '#ffffff',
        isDrawingMode: false,
        selection: true,
        width: canvasWidth.value,
        height: canvasHeight.value,
      })

      // 设置画笔
      const brush = new PencilBrush(canvas)
      brush.color = '#000'
      brush.width = 2
      canvas.freeDrawingBrush = brush
      
      console.log('画布已创建，监听store变化')
    }
  }, 300) // 增加延迟时间确保DOM完全渲染
})

onBeforeUnmount(() => {
  if (canvas) {
    canvas.dispose()
  }
})
</script>

<template>
    <!-- 画布区域 -->
    <div ref="canvasContainerRef" class="p-4 bg-gray-100 min-h-0 w-full h-full">
      <canvas 
        ref="canvasEl" 
        class="w-full h-full border border-gray-300 rounded-lg shadow-sm bg-white"
      />
    </div>
</template>

<style scoped>
.sub-canvas-area {
  min-height: 0;
}
</style>
