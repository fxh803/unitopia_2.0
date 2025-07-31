<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, nextTick } from 'vue'

const leftWidth = ref(300)
const dragging = ref(false)
const container = ref<HTMLElement | null>(null)
const showBar = ref(false)

function startDrag(_e: MouseEvent) {
  dragging.value = true
  document.body.style.cursor = 'col-resize'
}

function onDrag(e: MouseEvent) {
  if (!dragging.value || !container.value)
    return
  const rect = container.value.getBoundingClientRect()
  let newWidth = e.clientX - rect.left
  newWidth = Math.max(180, Math.min(newWidth, rect.width * 0.6))
  leftWidth.value = newWidth
}

function stopDrag() {
  dragging.value = false
  document.body.style.cursor = ''
}

function handleMouseMove(e: MouseEvent) {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  if (Math.abs(x - leftWidth.value) < 12) {
    showBar.value = true
  } else if (!dragging.value) {
    showBar.value = false
  }
}

onMounted(() => {
  // 等待DOM渲染完成后设置初始宽度为4/10
  nextTick(() => {
    if (container.value) {
      const containerWidth = container.value.offsetWidth
      leftWidth.value = containerWidth * 0.4
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
  <div ref="container" class="flex h-full w-full select-none relative">
    <!-- 左侧数据编辑器 + 滑动条 -->
    <div :style="{ width: `${leftWidth}px` }" class="h-full min-w-[180px] border-r border-gray-300 relative">
      <slot name="left" />
      <!-- 滑动条，绝对定位在右侧 -->
      <div
        class="resizer-bar"
        :class="{ 'resizer-bar-active': showBar || dragging }"
        style="position: absolute; top: 0; right: 0; height: 100%;"
        @mousedown="startDrag"
      />
    </div>
    <!-- 右侧画布区 -->
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
  transform: translateX(100%);
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
