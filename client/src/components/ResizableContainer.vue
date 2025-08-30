<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { useResizeHandleStore } from '~/stores/resizeHandle'

const resizeHandleStore = useResizeHandleStore()
const container = ref<HTMLElement | null>(null)
const showBar = ref(false)
const minRightWidth = ref(780)
function startDrag(_e: MouseEvent) {
  resizeHandleStore.setDragging(true)
  document.body.style.cursor = 'col-resize'
}

function onDrag(e: MouseEvent) {
  if (!resizeHandleStore.isDragging || !container.value)
    return
  const rect = container.value.getBoundingClientRect()
  let newWidth = e.clientX - rect.left
  newWidth =  Math.max(300, Math.min(newWidth, rect.width - minRightWidth.value))
  
  // 更新store中的左侧宽度
  resizeHandleStore.updateLeftWidth(newWidth)
}

function stopDrag() {
  resizeHandleStore.setDragging(false)
  document.body.style.cursor = ''
}

function handleMouseMove(e: MouseEvent) {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  if (Math.abs(x - resizeHandleStore.leftWidth) < 12) {
    showBar.value = true
  } else if (!resizeHandleStore.isDragging) {
    showBar.value = false
  }
}

onMounted(() => {
  // 等待DOM渲染完成后设置初始宽度为4/10
  nextTick(() => {
    if (container.value) {
      const containerWidth = container.value.offsetWidth
      minRightWidth.value = containerWidth * 0.4 
      const initialWidth = containerWidth - minRightWidth.value
      resizeHandleStore.updateLeftWidth(initialWidth)
    }
  })
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('mousemove', handleMouseMove)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('mousemove', handleMouseMove)
})
</script>

<template>
  <div ref="container" class="flex h-full w-full select-none relative overflow-hidden">
    <!-- 左侧画布区 + 滑动条 -->
    <div :style="{ width: `${resizeHandleStore.leftWidth}px` }" class="h-full border-r border-gray-300 relative">
      <slot name="left" />
      <!-- 滑动条，绝对定位在右侧 -->
      <div
        class="resizer-bar"
        :class="{ 'resizer-bar-active': showBar || resizeHandleStore.isDragging }"
        style="position: absolute; top: 0; right: 0; height: 100%;"
        @mousedown="startDrag"
      />
    </div>
    <!-- 右侧数据编辑器 -->
    <div class="flex-1 h-full">
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.resizer-bar {
  position: absolute;
  top: 0;
  height: 100%;
  width: 12px;
  z-index: 10;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s; 
}

.resizer-bar-active {
  background: rgba(59, 130, 246, 0.15);
  /* 蓝色淡背景 */
}

.resizer-bar::after {
  content: '';
  display: block;
  position: absolute;
  left: 3px;
  top: 0;
  width: 6px;
  height: 100%;
  border-radius: 4px;
  background: #60a5fa;
  opacity: 0;
  transition: opacity 0.2s;
}

.resizer-bar-active::after {
  opacity: 1;
}
</style>
