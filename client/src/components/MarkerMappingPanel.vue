<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useMarkerStore } from '~/stores/marker'
import { useTableStore } from '~/stores/table'

const markerStore = useMarkerStore()
const tableStore = useTableStore()

const { markers } = storeToRefs(markerStore)
const { tableColumns } = storeToRefs(tableStore)

// 从 store 获取 marker 映射配置
const getMarkerMapping = markerStore.getMarkerMapping
const { deleteMarker } = markerStore

// 处理视觉编码变化
const handleVisualEncodingChange = (markerId: string, encoding: 'size' | 'width' | 'height') => {
  markerStore.updateVisualEncoding(markerId, encoding)
}

// 处理数据字段变化
const handleDataFieldChange = (markerId: string, field: string) => {
  markerStore.updateDataField(markerId, field)
}

// 处理数据范围变化
const handleDataRangeChange = (markerId: string, start: number, end: number) => {
  markerStore.updateDataRange(markerId, start, end)
}

// 处理 marker 拖拽开始
const handleMarkerDragStart = (markerId: string, e: DragEvent) => {
  if (e.dataTransfer) {
    // 直接传递 marker 的 jsonData
    const marker = markers.value.find(m => m.id === markerId)
    if (marker && marker.jsonData) {
      e.dataTransfer.setData('application/json', JSON.stringify(marker.jsonData))
      e.dataTransfer.setData('text/plain', markerId)
    }
  }
  isDragging.value = true
  console.log('开始拖拽 marker:', markerId)
}

// 处理 marker 拖拽结束
const handleMarkerDragEnd = () => {
  isDragging.value = false
  console.log('拖拽 marker 结束')
}

// 防止拖拽时触发输入事件
const preventInputDuringDrag = (e: Event) => {
  if (isDragging.value) {
    e.preventDefault()
    e.stopPropagation()
  }
}

// 拖拽时的样式状态
const isDragging = ref(false)

// 处理删除单个 marker
const handleDeleteMarker = (markerId: string) => {
  deleteMarker(markerId)
}
</script>

<template>
  <div class="h-full flex flex-col bg-white overflow-x-auto">
    <!-- Marker 列表 -->
    <div class="flex-1 overflow-y-auto p-2  min-w-320px">
      <div v-if="markers.length > 0" class="space-y-4">
        <div v-for="marker in markers" :key="marker.id"
          :class="[
            'bg-white border rounded-lg p-2 shadow-sm flex space-x-4 cursor-move transition-all duration-200 relative group',
            isDragging ? 'border-blue-400 shadow-lg bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
          ]"
          draggable="true"
          @dragstart="handleMarkerDragStart(marker.id, $event)"
          @dragend="handleMarkerDragEnd">

          <!-- 删除按钮 -->
            <button
              @click.stop="handleDeleteMarker(marker.id)"
              class="absolute top-1 right-1 z-10 !m-0 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-[var(--delete-color)] hover:text-white transition-colors"
              title="Delete marker"
            >
            <span class="i-carbon-close text-sm"></span>
          </button>

          <!-- 左侧：缩略图 -->
          <div class="flex-shrink-0">
            <div
              class="w-16 h-16 border border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
              <img v-if="marker.thumbnail" :src="marker.thumbnail" alt="Thumbnail" class="w-full h-full object-cover" />
              <span v-else class="text-gray-400 text-xs">Preview</span>
            </div>
          </div>

          <!-- 右侧：数据绑定操作 - 垂直布局 -->
          <div class="flex-1 flex flex-col space-y-2">

            <!-- 视觉编码选择器 -->
            <div class="flex flex-col space-y-1">
              <span class="text-xs font-medium text-gray-700">Visual Encoding:</span>
              <div class="flex space-x-3 justify-center">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" :value="'size'" :checked="getMarkerMapping(marker.id).visualEncoding === 'size'"
                    @change="(e) => {
                      if (isDragging.value) return;
                      handleVisualEncodingChange(marker.id, 'size');
                    }" :name="`visualEncoding-${marker.id}`"
                    class="w-3 h-3 text-blue-600" />
                  <span class="text-xs text-gray-600">Size</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" :value="'width'" :checked="getMarkerMapping(marker.id).visualEncoding === 'width'"
                    @change="(e) => {
                      if (isDragging.value) return;
                      handleVisualEncodingChange(marker.id, 'width');
                    }" :name="`visualEncoding-${marker.id}`"
                    class="w-3 h-3 text-blue-600" />
                  <span class="text-xs text-gray-600">Width</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" :value="'height'"
                    :checked="getMarkerMapping(marker.id).visualEncoding === 'height'"
                    @change="(e) => {
                      if (isDragging.value) return;
                      handleVisualEncodingChange(marker.id, 'height');
                    }" :name="`visualEncoding-${marker.id}`"
                    class="w-3 h-3 text-blue-600" />
                  <span class="text-xs text-gray-600">Height</span>
                </label>
              </div>
            </div>

            <!-- 数据绑定选择器 -->
            <div>
              <div v-if="tableColumns && tableColumns.length > 0" class="flex flex-col space-y-1">
                <!-- 数据字段下拉框 -->
                <div class="flex justify-center space-x-1  items-center">
                  <span class="text-xs font-medium text-gray-700">Data Binding:</span>
                  <select v-model="getMarkerMapping(marker.id).dataField"
                    @change="(e) => {
                      if (isDragging.value) return;
                      handleDataFieldChange(marker.id, getMarkerMapping(marker.id).dataField);
                    }" :class="[
                      'px-2  border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 h-6',
                      getMarkerMapping(marker.id).dataField === '' ? 'text-gray-400' : 'text-gray-900'
                    ]">
                    <option value="" disabled>Select Field</option>
                    <option v-for="column in tableColumns" :key="column" :value="column">
                      {{ column }}
                    </option>
                  </select>
                </div>

                <!-- 数据范围输入 -->
                <div class="flex items-center space-x-1 justify-center">
                  <span class="text-xs text-gray-600">Range:</span>
                  <input type="number"
                    :value="getMarkerMapping(marker.id).dataRange.start === -1 ? '' : getMarkerMapping(marker.id).dataRange.start"
                    @input="(e) => {
                      if (isDragging.value) return;
                      const value = e.target.value === '' ? -1 : parseInt(e.target.value) || -1;
                      handleDataRangeChange(marker.id, value, getMarkerMapping(marker.id).dataRange.end);
                    }"
                    @mousedown="preventInputDuringDrag"
                    @mouseup="preventInputDuringDrag"
                    class="w-19 px-1 py-0.5 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1" placeholder="start" />
                  <span class="text-xs text-gray-500">-</span>
                  <input type="number"
                    :value="getMarkerMapping(marker.id).dataRange.end === -1 ? '' : getMarkerMapping(marker.id).dataRange.end"
                    @input="(e) => {
                      if (isDragging.value) return;
                      const value = e.target.value === '' ? -1 : parseInt(e.target.value) || -1;
                      handleDataRangeChange(marker.id, getMarkerMapping(marker.id).dataRange.start, value);
                    }"
                    @mousedown="preventInputDuringDrag"
                    @mouseup="preventInputDuringDrag"
                    class="w-19 px-1 py-0.5 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1" placeholder="end" />
                </div>
              </div>
              <div v-else class="flex justify-center">
                <div class="text-center text-gray-400 text-xs">
                  <p>No data available</p>
                  <p class="text-xs">Please load data in the Table tab first</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="text-center py-8">
        <div class="text-gray-400">
          <div class="text-4xl mb-2">📝</div>
          <p class="text-lg font-medium">No Marker Data</p>
          <p class="text-sm">Please draw content on the left canvas and click the save button</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 可以添加自定义样式 */
</style>
