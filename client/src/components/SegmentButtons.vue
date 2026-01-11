<script setup lang="ts">
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useCanvasStore } from '~/stores/canvas'
import { storeToRefs } from 'pinia'
import { sendBackgroundToSegmentAll } from '~/composables/server'
import { FabricImage } from 'fabric'
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const canvasModeStore = useCanvasModeStore()
const canvasStore = useCanvasStore()
const { mode } = storeToRefs(canvasModeStore)
const { setMode } = canvasModeStore

// 拖拽相关
const panelRef = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const position = ref<{ x: number, y: number } | null>(null) // null 表示使用 CSS 默认位置

// 开始拖拽
const handleMouseDown = (e: MouseEvent) => {
  if (!panelRef.value) return
  isDragging.value = true
  
  // 找到 CanvasArea 容器
  const canvasArea = panelRef.value.closest('.canvas-with-grid') as HTMLElement
  if (!canvasArea) return
  
  const canvasAreaRect = canvasArea.getBoundingClientRect()
  const panelRect = panelRef.value.getBoundingClientRect()
  
  // 如果还没有 position，从当前 CSS 位置获取
  if (!position.value) {
    const computedStyle = window.getComputedStyle(panelRef.value)
    const right = parseFloat(computedStyle.right) || 0
    const top = parseFloat(computedStyle.top) || 0
    position.value = {
      x: canvasAreaRect.width - panelRect.width - right,
      y: top
    }
  }
  
  // 计算鼠标相对于 CanvasArea 的位置，减去当前面板位置，得到偏移量
  dragStart.value = {
    x: e.clientX - canvasAreaRect.left - position.value.x,
    y: e.clientY - canvasAreaRect.top - position.value.y
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  e.preventDefault()
}

// 拖拽中
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !panelRef.value) return
  
  // 找到 CanvasArea 容器
  const canvasArea = panelRef.value.closest('.canvas-with-grid') as HTMLElement
  if (!canvasArea) return
  
  const canvasAreaRect = canvasArea.getBoundingClientRect()
  const panelRect = panelRef.value.getBoundingClientRect()
  
  // 计算新位置（相对于 canvasArea）
  let newX = e.clientX - canvasAreaRect.left - dragStart.value.x
  let newY = e.clientY - canvasAreaRect.top - dragStart.value.y
  
  // 限制在 CanvasArea 范围内
  const maxX = canvasAreaRect.width - panelRect.width
  const maxY = canvasAreaRect.height - panelRect.height
  
  newX = Math.max(0, Math.min(newX, maxX))
  newY = Math.max(0, Math.min(newY, maxY))
  
  position.value = { x: newX, y: newY }
}

// 结束拖拽
const handleMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false
  }
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

// 处理segmentAll请求
const handleSegmentAll = async () => {
  const canvasInstance = canvasModeStore.canvasRef?.()
  if (!canvasInstance) {
    console.error('Canvas实例未找到')
    return
  }

  // 显示加载动画
  canvasStore.setSegmentLoading(true)

  try {
    // 调用server.ts中的函数
    const croppedMasks = await sendBackgroundToSegmentAll(canvasInstance)
    
    if (croppedMasks && croppedMasks.length > 0) {
      console.log('收到cropped_masks列表:', croppedMasks)
      // 将每个mask添加到画布，使用对应的bbox坐标
      croppedMasks.forEach((maskData, index) => {
        addMaskToCanvas(maskData, index)
      })
    } else {
      console.warn('未收到cropped_masks列表或列表为空')
    }
  } finally {
    // 隐藏加载动画
    canvasStore.setSegmentLoading(false)
  }
}

// 将mask添加到画布，使用bbox坐标定位
const addMaskToCanvas = (maskData: { mask: string, bbox: { x: number, y: number } }, index: number) => {
  // 获取canvas实例
  const canvasInstance = canvasModeStore.canvasRef?.()
  if (!canvasInstance) {
    console.error('Canvas实例未找到')
    return
  }

  // 确保base64字符串包含data URL前缀
  const imageDataUrl = maskData.mask.startsWith('data:') 
    ? maskData.mask 
    : `data:image/png;base64,${maskData.mask}`

  // 使用fabric.js的Promise方式加载图片
  FabricImage.fromURL(imageDataUrl).then((fabricImg) => {
    // 使用bbox坐标定位mask
    // bbox的x, y是mask在原图中的左上角坐标，直接使用这些坐标
    fabricImg.set({
      left: maskData.bbox.x,
      top: maskData.bbox.y,
      originX: 'left',
      originY: 'top',
      selectable: true, // mask可以选择和移动
      evented: true,
      dataType: 'container' 
    })

    // 将mask添加到画布
    canvasInstance.add(fabricImg)
    // // 应用透明度规则
    // selectedModeStore.handleModeSwitch('container')

    // 重新渲染画布
    canvasInstance.renderAll()
  }).catch((error) => {
    console.error(`Mask ${index} 加载失败:`, error)
  })
}
</script>

<template>
  <div 
    ref="panelRef"
    class="px-2 py-2 border border-[#e6e6e6] rounded-xl bg-white flex flex-col gap-2 shadow cursor-move select-none pointer-events-auto"
    :style="position ? { 
      position: 'absolute',
      left: `${position.x}px`,
      top: `${position.y}px`,
      userSelect: 'none'
    } : {
      position: 'absolute',
      right: '16px',
      top: '16px',
      userSelect: 'none'
    }"
    @mousedown="handleMouseDown"
  >
      <!-- Everything按钮 -->
      <button
        class="rounded flex items-center gap-2 px-3 py-2 cursor-pointer w-full justify-start"
        :class="[
          'bg-white hover:bg-[#f5f5f5]'
        ]"
        title="Segment All"
        @click="handleSegmentAll"
        @mousedown.stop
      >
      <!-- Everything 图标 -->
      <svg class="w-5" width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 3L5.5 8.5L0 11L5.5 13.5L8 19L10.5 13.5L16 11L10.5 8.5" fill="#000" class="opacity-100"></path>
        <path d="M18 14L16.74 16.74L14 18L16.74 19.25L18 22L19.25 19.25L22 18L19.25 16.74" fill="#000" class="opacity-100"></path>
        <path d="M18 0L16.74 2.75L14 4L16.74 5.26L18 8L19.25 5.26L22 4L19.25 2.75" fill="#000" class="opacity-100"></path>
      </svg>
      <!-- Everything文字 -->
      <span class="text-sm font-normal text-black">Everything</span>
    </button>

      <!-- Segment Point按钮 -->
      <button
        class="rounded flex items-center gap-2 px-3 py-2 cursor-pointer w-full justify-start"
        :class="[
          mode === 'segmentPoint'
            ? 'bg-[var(--primary-color)]'
            : 'bg-white hover:bg-[#f5f5f5]'
        ]"
        title="Segment Point"
        @click="() => setMode('segmentPoint')"
        @mousedown.stop
      >
      <!-- Segment Point 图标 -->
      <svg width="17" height="24" viewBox="0 0 17 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-3">
        <path d="M9.13635 23.8813C8.53843 24.1683 7.82091 23.9172 7.54586 23.3192L4.93889 17.6509L1.93729 20.0665C1.73399 20.2339 1.48286 20.3296 1.19586 20.3296C0.878697 20.3296 0.574526 20.2036 0.350259 19.9793C0.125992 19.7551 0 19.4509 0 19.1337V1.19586C0 0.878697 0.125992 0.574526 0.350259 0.350259C0.574526 0.125992 0.878697 0 1.19586 0C1.48286 0 1.75791 0.107627 1.96121 0.275047L1.97317 0.263089L15.7136 11.7912C16.2278 12.2217 16.2876 12.9751 15.869 13.4773C15.6897 13.6926 15.4385 13.8361 15.1874 13.8839L11.4085 14.6253L14.0394 20.2817C14.3503 20.8797 14.0633 21.5852 13.4654 21.8603L9.13635 23.8813Z" fill="#000000"></path>
      </svg>
      <!-- Segment Point文字 -->
      <span class="text-sm font-normal text-black">Segment Point</span>
    </button>
  </div>
</template>

