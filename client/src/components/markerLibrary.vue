<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useMarkerStore } from '~/stores/marker'
import { ref, onBeforeUnmount } from 'vue'

const markerStore = useMarkerStore()
const { markers } = storeToRefs(markerStore)
const { deleteMarker } = markerStore

// 拖拽状态
const isDragging = ref(false)
const dragImageElement = ref<HTMLElement | null>(null)

// 处理 marker 拖拽开始
const handleMarkerDragStart = (markerId: string, e: DragEvent) => {
  if (e.dataTransfer) {
    // 直接传递 marker 的 jsonData
    const marker = markers.value.find(m => m.id === markerId)
    if (marker && marker.jsonData) {
      e.dataTransfer.setData('application/json', JSON.stringify(marker.jsonData))
      e.dataTransfer.setData('text/plain', markerId)
      
      // 创建自定义拖拽图像（只显示图案）
      const dragDiv = document.createElement('div')
      dragDiv.style.cssText = `
        position: absolute;
        top: -1000px;
        left: -1000px;
        width: 80px;
        height: 80px;
        padding: 8px;
        background: white;
        border: 2px solid var(--primary-color);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        z-index: 10000;
      `
      
      // 添加缩略图 
      const img = document.createElement('img')
      img.src = marker.thumbnail
      img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; border-radius: 4px;'
      dragDiv.appendChild(img)
      
      // 添加到 DOM 并设置拖拽图像
      document.body.appendChild(dragDiv)
      dragImageElement.value = dragDiv
      // 设置偏移：鼠标在图像左下角，这样图像会显示在鼠标右上方，不会挡住目标位置
      e.dataTransfer.setDragImage(dragDiv, -10, -10)
    }
  }
  isDragging.value = true 
}

// 处理 marker 拖拽结束
const handleMarkerDragEnd = () => {
  isDragging.value = false
  // 清理拖拽图像元素
  if (dragImageElement.value && document.body.contains(dragImageElement.value)) {
    document.body.removeChild(dragImageElement.value)
    dragImageElement.value = null
  }
}

// 处理删除 marker
const handleDeleteMarker = (markerId: string) => {
  deleteMarker(markerId)
}

onBeforeUnmount(() => {
  // 清理拖拽图像元素
  if (dragImageElement.value && document.body.contains(dragImageElement.value)) {
    document.body.removeChild(dragImageElement.value)
    dragImageElement.value = null
  }
})
</script>

<template>
  <div class="h-full flex flex-col bg-[var(--primary-light-color)] overflow-x-auto">
    <!-- 标题 -->
    <div class="px-4 py-2 border-b border-gray-200 bg-[var(--sub-toolbar-bg-color)]">
      <h3 class="text-sm font-semibold text-gray-700">Marker Library</h3>
    </div>
    <!-- Marker 图案库 -->
    <div class="overflow-y-auto p-4">
      <!-- 垂直列表展示所有 markers -->
      <div v-if="markers.length > 0" class="flex flex-col gap-2">
        <div
          v-for="marker in markers"
          :key="marker.id"
          :class="[
            'bg-white border rounded-lg p-2 shadow-sm cursor-move transition-all duration-200 relative group',
            isDragging ? 'border-blue-400 shadow-lg bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
          ]"
          draggable="true"
          @dragstart="handleMarkerDragStart(marker.id, $event)"
          @dragend="handleMarkerDragEnd">
          
          <!-- 删除按钮 -->
          <button
            @click.stop="handleDeleteMarker(marker.id)"
            class="absolute top-1 right-1 z-10 !m-0 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-[var(--delete-color)] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            title="Delete marker"
          >
            <span class="i-carbon-close text-xs"></span>
          </button>

          <!-- 缩略图 -->
          <div class="w-full aspect-square border border-gray-300 rounded overflow-hidden bg-gray-50 flex items-center justify-center">
            <img 
              v-if="marker.thumbnail" 
              :src="marker.thumbnail" 
              alt="Marker thumbnail" 
              class="w-full h-full object-contain" 
            />
            <span v-else class="text-gray-400 text-xs">Preview</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="text-center py-16">
        <div class="text-gray-400">
          <div class="text-4xl mb-2">📝</div>
          <p class="text-lg font-medium">No Marker</p>
          <p class="text-sm">Please draw content on the canvas and click the save button</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 可以添加自定义样式 */
</style>

