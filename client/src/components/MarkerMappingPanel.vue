<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useMarkerStore, type FilterType, type ConditionOperator } from '~/stores/marker'
import { useTableStore } from '~/stores/table'
import { ref, onMounted, onBeforeUnmount } from 'vue'

const markerStore = useMarkerStore()
const tableStore = useTableStore()

const { markers } = storeToRefs(markerStore)
const { tableColumns, tableData } = storeToRefs(tableStore)

// 从 store 获取 marker 筛选条件
const getMarkerFilters = markerStore.getMarkerFilters
const { deleteMarker, addFilter, removeFilter, updateRangeFilter, updateConditionFilter } = markerStore

// 控制每个 marker 的筛选方法选择菜单显示状态
const showFilterMenu = ref<Record<string, boolean>>({})

// 切换筛选方法选择菜单
const toggleFilterMenu = (markerId: string) => {
  // 关闭其他菜单
  Object.keys(showFilterMenu.value).forEach(key => {
    if (key !== markerId) {
      showFilterMenu.value[key] = false
    }
  })
  showFilterMenu.value[markerId] = !showFilterMenu.value[markerId]
}

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.filter-menu-container')) {
    Object.keys(showFilterMenu.value).forEach(key => {
      showFilterMenu.value[key] = false
    })
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 添加筛选条件
const handleAddFilter = (markerId: string, filterType: FilterType) => {
  addFilter(markerId, filterType)
  showFilterMenu.value[markerId] = false
}

// 删除筛选条件
const handleRemoveFilter = (markerId: string, filterIndex: number) => {
  removeFilter(markerId, filterIndex)
}

// 处理 Range 筛选条件变化
const handleRangeFilterChange = (markerId: string, filterIndex: number, start: number, end: number) => {
  updateRangeFilter(markerId, filterIndex, start, end)
}

// 处理 Condition 筛选条件变化
const handleConditionFilterChange = (markerId: string, filterIndex: number, column: string, operator: ConditionOperator, value: string) => {
  updateConditionFilter(markerId, filterIndex, column, operator, value)
}

// 获取列的唯一值（用于条件筛选）
const getColumnUniqueValues = (column: string) => {
  if (!tableData.value || !column) return []
  const values = new Set<string>()
  tableData.value.forEach(row => {
    if (row[column] !== undefined && row[column] !== null && row[column] !== '') {
      values.add(String(row[column]))
    }
  })
  return Array.from(values).sort()
}

// 处理 marker 拖拽开始
const handleMarkerDragStart = (markerId: string, e: DragEvent) => {
  if (e.dataTransfer) {
    // 直接传递 marker 的 jsonData
    const marker = markers.value.find(m => m.id === markerId)
    if (marker && marker.jsonData) {
      e.dataTransfer.setData('application/json', JSON.stringify(marker.jsonData))
      e.dataTransfer.setData('text/plain', markerId)
      
      // 创建自定义拖拽图像
      const dragDiv = document.createElement('div')
      dragDiv.style.cssText = `
        position: absolute;
        top: -1000px;
        left: -1000px;
        width: 120px;
        padding: 8px;
        background: white;
        border: 2px solid var(--primary-color);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: none;
        z-index: 10000;
      `
      
      // 添加缩略图 
      const img = document.createElement('img')
      img.src = marker.thumbnail
      img.style.cssText = 'width: 40px; height: 40px; object-fit: cover; border-radius: 4px;'
      dragDiv.appendChild(img)
      
      
      // 添加文本信息
      const textContainer = document.createElement('div')
      textContainer.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 2px;'
      const countText = document.createElement('div')
      countText.style.cssText = 'font-size: 12px; font-weight: 600; color: #1f2937;'
      const colsCount = marker.cols ? marker.cols.size : 0
      countText.textContent = `${colsCount} markers`
      textContainer.appendChild(countText)
      dragDiv.appendChild(textContainer)
      
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

// 防止拖拽时触发输入事件
const preventInputDuringDrag = (e: Event) => {
  if (isDragging.value) {
    e.preventDefault()
    e.stopPropagation()
  }
}

// 拖拽时的样式状态
const isDragging = ref(false)

// 存储拖拽图像元素引用，用于清理
const dragImageElement = ref<HTMLElement | null>(null)

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
              class="absolute top-1 right-1 z-10 !m-0 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-[var(--delete-color)] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
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
            <!-- 显示筛选后的 marker 数量 -->
            <div class="text-center mt-1">
              <span class="text-xs text-gray-500">{{ marker.cols ? marker.cols.size : 0 }} markers</span>
            </div>
          </div>

          <!-- 右侧：数据绑定操作 - 垂直布局 -->
          <div class="flex-1 flex flex-col space-y-2">
            <div v-if="tableColumns && tableColumns.length > 0">
              <!-- 筛选条件列表 -->
              <div class="space-y-2">
                <div v-for="(filter, filterIndex) in getMarkerFilters(marker.id)" :key="filterIndex"
                  class="border border-gray-200 rounded p-2 bg-gray-50 relative group flex items-center">
                  <!-- 删除筛选条件按钮 -->
                  <button
                    @click.stop="handleRemoveFilter(marker.id, filterIndex)"
                    class="absolute right-3 top-1/2 -translate-y-1/2 z-10 !m-0 p-0 border-0 bg-transparent cursor-pointer delete-filter-btn"
                    title="Delete filter"
                  >
                    <div class="i-carbon:subtract-filled text-base"></div>
                  </button>

                  <!-- Range 筛选条件 -->
                  <div v-if="filter.type === 'range'" class="flex flex-row items-center gap-2 flex-wrap">
                    <span class="text-xs font-medium text-gray-700 whitespace-nowrap">Range:</span>
                    <div class="flex items-center space-x-1">
                      <input type="number"
                        :value="filter.start === -1 ? '' : filter.start"
                        @input="(e) => {
                          if (isDragging.value) return;
                          const value = e.target.value === '' ? -1 : parseInt(e.target.value) || -1;
                          handleRangeFilterChange(marker.id, filterIndex, value, filter.end);
                        }"
                        @mousedown="preventInputDuringDrag"
                        @mouseup="preventInputDuringDrag"
                        class="w-19 px-1 py-0.5 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1" placeholder="start" />
                      <span class="text-xs text-gray-500">-</span>
                      <input type="number"
                        :value="filter.end === -1 ? '' : filter.end"
                        @input="(e) => {
                          if (isDragging.value) return;
                          const value = e.target.value === '' ? -1 : parseInt(e.target.value) || -1;
                          handleRangeFilterChange(marker.id, filterIndex, filter.start, value);
                        }"
                        @mousedown="preventInputDuringDrag"
                        @mouseup="preventInputDuringDrag"
                        class="w-19 px-1 py-0.5 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1" placeholder="end" />
                    </div>
                  </div>

                  <!-- Condition 筛选条件 -->
                  <div v-if="filter.type === 'condition'" class="flex flex-row items-center gap-2 flex-wrap">
                    <span class="text-xs font-medium text-gray-700 whitespace-nowrap">Condition:</span>
                    <div class="flex items-center space-x-1">
                      <el-select
                        :model-value="filter.column || ''"
                        placeholder="Select column"
                        size="small"
                        class="w-13"
                        :teleported="false"
                        @update:model-value="(value) => {
                          if (isDragging.value) return;
                          handleConditionFilterChange(marker.id, filterIndex, value, filter.operator, filter.value);
                        }"
                        @click.stop
                      >
                        <el-option
                          v-for="col in tableColumns"
                          :key="col"
                          :label="col"
                          :value="col"
                        />
                      </el-select>
                      <el-select
                        :model-value="filter.operator"
                        size="small"
                        class="w-11"
                        :teleported="false"
                        @update:model-value="(value) => {
                          if (isDragging.value) return;
                          handleConditionFilterChange(marker.id, filterIndex, filter.column, value as ConditionOperator, filter.value);
                        }"
                        @click.stop
                      >
                        <el-option label="=" value="=" />
                        <el-option label=">" value=">" />
                        <el-option label="<" value="<" />
                      </el-select>
                      <input type="text"
                        :value="filter.value"
                        @input="(e) => {
                          if (isDragging.value) return;
                          handleConditionFilterChange(marker.id, filterIndex, filter.column, filter.operator, (e.target as HTMLInputElement).value);
                        }"
                        @mousedown="preventInputDuringDrag"
                        @mouseup="preventInputDuringDrag"
                        class="w-13 px-1 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="value" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- 添加筛选条件按钮 -->
              <div class="relative mt-2 filter-menu-container">
                <button
                  @click.stop="toggleFilterMenu(marker.id)"
                  class="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                >
                  <span class="i-carbon:add text-sm"></span>
                  <span>Add Filter</span>
                </button>

                <!-- 筛选方法选择菜单 -->
                <div v-if="showFilterMenu[marker.id]"
                  class="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-10"
                  @click.stop>
                  <button
                    @click.stop="handleAddFilter(marker.id, 'range')"
                    class="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <span class="i-carbon:arrows text-sm"></span>
                    <span>Range</span>
                  </button>
                  <button
                    @click.stop="handleAddFilter(marker.id, 'condition')"
                    class="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <span class="i-carbon:filter text-sm"></span>
                    <span>Condition</span>
                  </button>
                </div>
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
.delete-filter-btn {
  color: var(--delete-color);
  transition: color 0.2s;
}

.delete-filter-btn:hover {
  color: var(--delete-hover-color);
}

.delete-filter-btn > div {
  color: inherit;
}
</style>
