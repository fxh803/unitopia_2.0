<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { useResizeHandleStore } from '~/stores/resizeHandle'

const resizeHandleStore = useResizeHandleStore()
const container = ref<HTMLElement | null>(null)
const showBar = ref(false)
const minLeftWidth = ref(640)
const minRightWidth = ref(300)
function startDrag(_e: MouseEvent) {
  resizeHandleStore.setDragging(true)
  document.body.style.cursor = 'col-resize'
}

function onDrag(e: MouseEvent) {
  if (!resizeHandleStore.isDragging || !container.value)
    return
  const rect = container.value.getBoundingClientRect()
  let newWidth = rect.right - e.clientX
  const maxRightWidth = Math.max(0, rect.width - minLeftWidth.value)
  newWidth = Math.max(minRightWidth.value, Math.min(newWidth, maxRightWidth))
  resizeHandleStore.updateRightWidth(newWidth)
}

function stopDrag() {
  resizeHandleStore.setDragging(false)
  document.body.style.cursor = ''
}
function handleMouseEnter() {
  showBar.value = true
}

function handleMouseLeave() {
  // if (!resizeHandleStore.isDragging) {
    showBar.value = false
  // }
}

onMounted(() => {
  // 等待DOM渲染完成后设置初始宽度
  nextTick(() => {
    if (container.value) {
      const containerWidth = container.value.offsetWidth
      const initialRightWidth = Math.max(minRightWidth.value, containerWidth * 0.6)
      resizeHandleStore.updateRightWidth(initialRightWidth)
    }
  })
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
  <div ref="container" class="flex h-full w-full select-none relative overflow-hidden">
    <!-- 左侧数据区 + 滑动条 -->
    <div :style="{ minWidth: `${minLeftWidth}px` }" class="h-full border-r border-gray-300 relative flex-1 min-w-0">
      <slot name="left" />
      <!-- 滑动条，绝对定位在右侧 -->
      <div
        class="resizer-bar"
        :class="{ 'resizer-bar-active': showBar || resizeHandleStore.isDragging }"
        style="position: absolute; top: 0; right: 0; height: 100%;"
        @mousedown="startDrag"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      />
    </div>
    <!-- 右侧画布区 -->
    <div class="h-full flex flex-col" :style="{ width: `${resizeHandleStore.rightWidth}px`, minWidth: `${minRightWidth}px` }">
      <!-- 工具栏 -->
      <div class="flex justify-between items-center p-2 border-b border-gray-200 bg-gray-50 h-10 flex-shrink-0 shadow-sm z-10">
        <span class="text-sm text-gray-600">Canvas Editor</span>
      </div>
      <div class="flex-1 min-h-0">
        <slot name="right" />
      </div>
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
