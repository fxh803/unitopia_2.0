<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useTableStore, type ConditionOperator, type SingleFilter, type ColumnFilterCard } from '~/stores/table'
import { useMarkerStore } from '~/stores/marker'
import { useDataScaleStore } from '~/stores/dataScale'

const tableStore = useTableStore()
const markerStore = useMarkerStore()
const dataScaleStore = useDataScaleStore()
const { tableColumns, tableData, columnFilterCards } = storeToRefs(tableStore)
const { markers } = storeToRefs(markerStore)

// 生成唯一 ID
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// 拖拽状态
const isDraggingFilter = ref(false)
const dragImageElement = ref<HTMLElement | null>(null)
const isDraggingOverDropZone = ref(false)//从列名拖拽到卡片悬浮高亮
const isDraggingOverMarkerDropZone = ref<Record<string, boolean>>({}) //marker悬浮高亮

// 工具函数：获取卡片
const getCard = (cardId: string) => columnFilterCards.value.find(c => c.id === cardId) || null

// 工具函数：创建拖拽图像
const createDragImage = (thumbnail: string) => {
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
  const img = document.createElement('img')
  img.src = thumbnail
  img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; border-radius: 4px;'
  dragDiv.appendChild(img)
  document.body.appendChild(dragDiv)
  return dragDiv
}

// 工具函数：清理拖拽图像
const cleanupDragImage = () => {
  if (dragImageElement.value && document.body.contains(dragImageElement.value)) {
    document.body.removeChild(dragImageElement.value)
    dragImageElement.value = null
  }
}

// 工具函数：检查是否离开拖拽区域
const isOutsideRect = (e: DragEvent, element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect()
  const { clientX: x, clientY: y } = e
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom
}

// 判断列是否为数值型
const isNumericColumn = (column: string): boolean => {
  if (!tableData.value || !column) return false

  let numericCount = 0
  let totalCount = 0

  tableData.value.forEach(row => {
    const value = row[column]
    if (value !== undefined && value !== null && value !== '') {
      totalCount++
      const num = Number(value)
      if (!isNaN(num) && String(value).trim() !== '') {
        numericCount++
      }
    }
  })

  // 如果超过 80% 的值都是数字，则认为是数值型
  return totalCount > 0 && numericCount / totalCount >= 0.8
}

// 获取列类型对应的图标
const getColumnIcon = (column: string): string => {
  if (isNumericColumn(column)) {
    // 连续数值型：使用折线图图标
    return 'i-carbon-chart-line'
  } else {
    // 离散类型型：使用分类图标
    return 'i-carbon-category'
  }
}

// 获取列的唯一值
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

// 检查单个筛选条件是否匹配
const matchesFilter = (row: any, column: string, filter: SingleFilter): boolean => {
  if (!column || !filter.value) return false

  const cellValue = row[column]
  const filterValue = filter.value

  // 尝试将值转换为数字进行比较
  const cellNum = Number(cellValue)
  const filterNum = Number(filterValue)
  const isNumeric = !isNaN(cellNum) && !isNaN(filterNum) && cellValue !== '' && filterValue !== ''

  if (isNumeric) {
    // 数值比较
    switch (filter.operator) {
      case '=':
        return cellNum === filterNum
      case '>':
        return cellNum > filterNum
      case '<':
        return cellNum < filterNum
    }
  } else {
    // 字符串比较（只支持等于）
    if (filter.operator === '=') {
      return String(cellValue || '') === filterValue
    }
  }

  return false
}

// 计算并更新单个 filter 的筛选数据
const updateFilterData = (card: ColumnFilterCard, filter: SingleFilter) => {
  if (!tableData.value || !card.column || !filter.value) {
    filter.data = []
    filter.rows = []
    return
  }

  const matchedData: any[] = []
  const matchedRows: number[] = []

  tableData.value.forEach((row, index) => {
    if (matchesFilter(row, card.column, filter)) {
      matchedData.push(row)
      matchedRows.push(index)
    }
  })

  filter.data = matchedData
  filter.rows = matchedRows
}

// 计算单个筛选条件匹配的实体数量
const getFilterMatchedCount = (filter: SingleFilter): number => {
  return filter.rows?.length || 0
}


// 处理列拖拽开始
const handleColumnDragStart = (column: string, e: DragEvent) => {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', column)
    e.dataTransfer.effectAllowed = 'copy'
  }
}

// 处理拖拽放置
const handleDrop = (e: DragEvent, cardId?: string) => {
  e.preventDefault()
  const column = e.dataTransfer?.getData('text/plain')
  if (!column) return

  // 检查是否已经存在该 column 的卡片
  const existingCard = columnFilterCards.value.find(c => c.column === column)

  if (existingCard) {
    // 如果已存在该 column 的卡片，添加到那个卡片
    addFilterToCard(existingCard.id)
    return
  }

  // 创建新卡片
  columnFilterCards.value.push({
    id: generateId('card'),
    column,
    filters: [{
      id: generateId('filter'),
      operator: '=',
      value: '',
      markerId: null,
      data: [],
      rows: [],
      visualAttribute: null,
      encoding: { channel: null, scale: 1 }
    }]
  })
}

// 拖拽悬停处理
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  isDraggingOverDropZone.value = true
}

// 拖拽离开处理
const handleDragLeave = (e: DragEvent) => {
  if (isOutsideRect(e, e.currentTarget as HTMLElement)) {
    isDraggingOverDropZone.value = false
  }
}


// 添加筛选条件到卡片
const addFilterToCard = (cardId: string) => {
  getCard(cardId)?.filters.push({
    id: generateId('filter'),
    operator: '=',
    value: '',
    markerId: null,
    data: [],
    rows: [],
    visualAttribute: null,
    encoding: { channel: null, scale: 1 }
  })
}

// 删除筛选条件
const removeFilterFromCard = (cardId: string, filterIndex: number) => {
  const card = getCard(cardId)
  if (card && card.filters.length > 1) {
    card.filters.splice(filterIndex, 1)
  }
}

// 更新筛选条件
const updateFilter = (cardId: string, filterIndex: number, updates: Partial<SingleFilter>) => {
  const card = getCard(cardId)
  const filter = card?.filters[filterIndex]
  if (filter) {
    Object.assign(filter, updates)
    updateFilterData(card, filter)
  }
}

// 更新筛选条件的 encoding
const updateFilterEncoding = (cardId: string, filterIndex: number, updates: Partial<{ channel: 'width' | 'height' | 'size' | null, scale: number }>) => {
  const card = getCard(cardId)
  const filter = card?.filters[filterIndex]
  if (filter) {
    if (!filter.encoding) {
      filter.encoding = { channel: null, scale: 1 }
    }
    Object.assign(filter.encoding, updates)

    // 如果更新了 scale 或 channel，更新画布上对应的 marker 尺寸
    if (filter.id && (updates.scale !== undefined || updates.channel !== undefined)) {
      dataScaleStore.updateFilterMarkersScale(filter.id)
    }
  }
}

// 分配 marker 到 filter
const assignMarkerToFilter = (cardId: string, filterIndex: number, markerId: string | null) => {
  const card = getCard(cardId)
  const filter = card?.filters[filterIndex]
  if (filter) {
    filter.markerId = markerId
    // 如果删除了 marker，将 isSelected 设置为 false
    if (!markerId) {
      filter.isSelected = false
    }
    updateFilterData(card, filter)
  }
}

// 处理从 markerLibrary 拖拽过来的 marker
const handleMarkerDrop = (cardId: string, filterIndex: number, e: DragEvent) => {
  e.preventDefault()
  const markerId = e.dataTransfer?.getData('text/plain')
  if (markerId) {
    assignMarkerToFilter(cardId, filterIndex, markerId)
  }
  isDraggingOverMarkerDropZone.value[`${cardId}-${filterIndex}`] = false
}

// 处理 marker 拖拽悬停
const handleMarkerDragOver = (cardId: string, filterIndex: number, e: DragEvent) => {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  isDraggingOverMarkerDropZone.value[`${cardId}-${filterIndex}`] = true
}

// 处理 marker 拖拽离开
const handleMarkerDragLeave = (cardId: string, filterIndex: number, e: DragEvent) => {
  if (isOutsideRect(e, e.currentTarget as HTMLElement)) {
    isDraggingOverMarkerDropZone.value[`${cardId}-${filterIndex}`] = false
  }
}

// 切换filter选中状态
const toggleFilterSelection = (cardId: string, filterIndex: number) => {
  const filter = getCard(cardId)?.filters[filterIndex]
  if (filter) {
    filter.isSelected = !filter.isSelected
  }
}

// 检查filter是否被选中
const isFilterSelected = (cardId: string, filterIndex: number): boolean => {
  return getCard(cardId)?.filters[filterIndex]?.isSelected || false
}

// 获取card中所有选中的filter
const getSelectedFilters = (cardId: string) => {
  const card = getCard(cardId)
  if (!card) return []

  return card.filters
    .map((filter, filterIndex) => {
      if (!filter.isSelected || !filter.markerId || !filter.data?.length) return null
      return { filter, filterIndex, markerId: filter.markerId }
    })
    .filter((item): item is { filter: SingleFilter, filterIndex: number, markerId: string } => item !== null)
}

// 处理 card 拖拽开始
const handleCardDragStart = (cardId: string, e: DragEvent) => {
  const card = getCard(cardId)
  if (!card || !e.dataTransfer) return

  // 检查是否有选中的 filter
  const selected = getSelectedFilters(cardId)
  if (selected.length === 0) return

  // 传递拖动的是哪个card
  e.dataTransfer.setData('text/plain', cardId)

  // 只传递选中的 filter id 列表
  const filterIds = selected.map(s => s.filter.id)
  e.dataTransfer.setData('application/json', JSON.stringify(filterIds))

  // 使用第一个选中 filter 的 marker 作为拖拽图像
  const firstMarker = markers.value.find(m => m.id === selected[0].markerId)
  if (firstMarker?.thumbnail) {
    dragImageElement.value = createDragImage(firstMarker.thumbnail)
    e.dataTransfer.setDragImage(dragImageElement.value, -10, -10)
  }

  isDraggingFilter.value = true
}

// 处理 filter 拖拽结束
const handleFilterDragEnd = () => {
  isDraggingFilter.value = false
  cleanupDragImage()
}

// 获取卡片样式类
const getCardClasses = (cardId: string) => {
  const hasSelected = getSelectedFilters(cardId).length > 0
  return [
    'rounded-lg bg-white overflow-hidden transition-all border',
    hasSelected ? 'cursor-move border-gray-200 hover:border-blue-400' : 'border-gray-200',
    isDraggingFilter.value && hasSelected ? 'border-blue-400 bg-blue-50' : ''
  ]
}

// 获取 filter 样式类
const getFilterClasses = (cardId: string, filterIndex: number) => {
  return [
    'space-y-3 rounded-lg transition-all p-2 relative group',
    isFilterSelected(cardId, filterIndex)
      ? 'bg-blue-50 border-2 border-blue-300'
      : 'bg-gray-50/50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
  ]
}

onBeforeUnmount(() => {
  cleanupDragImage()
})
</script>

<template>
  <div class="flex-1 flex overflow-hidden bg-[var(--primary-light-color)]">
    <!-- 左侧：列名列表 -->
    <div class="w-38 border-r border-gray-200 bg-[var(--primary-light-color)] flex flex-col">
      <div class="p-3 border-b border-gray-200">
        <p v-if="tableStore.fileName" class="text-sm font-bold text-gray-700">{{ tableStore.fileName }}</p>
        <h3 class="text-xs text-gray-500 mt-1 truncate">Attributes</h3>
      </div>
      <div class="flex-1 overflow-y-auto p-2">
        <div v-if="tableColumns.length === 0" class="text-center py-8 text-gray-400 text-sm">
          No columns available
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="column in tableColumns"
            :key="column"
            draggable="true"
            @dragstart="handleColumnDragStart(column, $event)"
            class="flex items-center gap-2 p-2.5 rounded-lg cursor-move bg-white hover:shadow-md transition-all border border-gray-200 hover:border-blue-300 hover:bg-blue-50"
          >
            <span :class="[getColumnIcon(column), 'text-xs text-gray-400']"></span>
            <span class="text-sm text-gray-700 flex-1 font-medium">{{ column }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：筛选条件区域 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto p-3 space-y-4">
        <!-- 筛选卡片 -->
        <div
          v-for="card in columnFilterCards"
          :key="card.id"
          :draggable="getSelectedFilters(card.id).length > 0"
          @dragstart="(e) => handleCardDragStart(card.id, e)"
          @dragend="handleFilterDragEnd"
          :class="getCardClasses(card.id)"
        >
          <div class="flex">
            <div class="w-26 p-3 border-r border-gray-200 bg-gray-50 flex flex-col">
              <span class="text-sm font-bold text-gray-700 pb-2 border-b border-gray-200">attribute</span>
              <div class="flex items-center justify-center mt-2">
                <div
                  class="flex items-center justify-center gap-2 p-2.5 w-20 rounded-lg border-2 border-dashed transition-all"
                  :class="'border-gray-300 text-gray-400 bg-[#f6fdf3]'"
                >
                  <span class="text-xs text-gray-600">{{ card.column }}</span>
                </div>
              </div>
            </div>
            <div class="flex-1 p-3">
              <div class="space-y-4">
                <div
                  v-for="(filter, filterIndex) in card.filters"
                  :key="filterIndex"
                  :class="getFilterClasses(card.id, filterIndex)"
                >
                  <button
                    v-if="card.filters.length > 1"
                    @click.stop="removeFilterFromCard(card.id, filterIndex)"
                    class="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                    title="Delete filter"
                  >
                    <span class="i-carbon-close text-xs"></span>
                  </button>

                  <!-- 第一行：Condition, Data, Mark -->
                  <div>
                    <div class="flex gap-4 mb-2 pb-2 border-b border-gray-200">
                      <div class="text-xs font-bold text-gray-700 flex-1 flex-shrink-0">Condition</div>
                      <div class="text-xs font-bold text-gray-700 flex-1 min-w-0">Data</div>
                      <div class="text-xs font-bold text-gray-700 w-16 flex-shrink-0 text-center">Mark</div>
                    </div>
                    <div class="flex gap-4 items-center p-1">
                      <!-- Condition -->
                      <div class="flex items-center flex-1 gap-1 flex-shrink-0">
                        <el-select
                          :model-value="filter.operator"
                          @update:model-value="(v) => updateFilter(card.id, filterIndex, { operator: v as ConditionOperator })"
                          size="small"
                          style="width: 50px; min-width: 50px; flex-shrink: 0;"
                          @click.stop
                        >
                          <el-option label="=" value="=" />
                          <el-option v-if="isNumericColumn(card.column)" label=">" value=">" />
                          <el-option v-if="isNumericColumn(card.column)" label="<" value="<" />
                        </el-select>
                        <el-select
                          v-if="!isNumericColumn(card.column)"
                          :model-value="filter.value"
                          @update:model-value="(v) => updateFilter(card.id, filterIndex, { value: v })"
                          size="small"
                          placeholder="Select value"
                          filterable
                          style="flex: 1; min-width: 0;"
                          @click.stop
                        >
                          <el-option v-for="val in getColumnUniqueValues(card.column)" :key="val" :label="val" :value="val" />
                        </el-select>
                        <el-input
                          v-else
                          :model-value="filter.value"
                          @update:model-value="(v) => updateFilter(card.id, filterIndex, { value: v })"
                          size="small"
                          placeholder="Enter number"
                          type="number"
                          style="flex: 1; min-width: 0;"
                          @click.stop
                        />
                      </div>
                      <!-- Data -->
                      <div class="flex-1 min-w-0">
                        <div class="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {{ getFilterMatchedCount(filter) }} entities
                        </div>
                      </div>
                      <!-- Mark -->
                      <div class="flex items-center min-h-[32px] justify-center w-16 flex-shrink-0">
                        <div v-if="filter.markerId" class="relative w-8 h-8 group/marker">
                          <div class="w-full h-full border border-gray-300 rounded overflow-hidden cursor-pointer hover:border-blue-400 transition-colors" @click.stop>
                            <img :src="markers.find(m => m.id === filter.markerId)?.thumbnail" alt="Marker" class="w-full h-full object-contain" />
                          </div>
                          <button
                            @click.stop="assignMarkerToFilter(card.id, filterIndex, null)"
                            class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/marker:opacity-100 transition-opacity z-20"
                            title="Remove marker"
                          >
                            <span class="i-carbon-close text-xs"></span>
                          </button>
                        </div>
                        <div
                          v-else
                          @drop="(e) => handleMarkerDrop(card.id, filterIndex, e)"
                          @dragover="(e) => handleMarkerDragOver(card.id, filterIndex, e)"
                          @dragleave="(e) => handleMarkerDragLeave(card.id, filterIndex, e)"
                          :class="[
                            'w-8 h-8 border-2 border-dashed rounded flex items-center justify-center transition-all',
                            isDraggingOverMarkerDropZone[`${card.id}-${filterIndex}`] ? 'border-blue-400 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-400'
                          ]"
                          title="Drag marker here"
                        >
                          <span class="i-carbon-add text-sm"></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 第二行：Visual Attribute, Visual Encodings, Select -->
                  <div>
                    <div class="flex gap-4 mb-2 pb-2 border-b border-gray-200">
                      <div class="text-xs font-bold text-gray-700 flex-1 min-w-0">Visual Attribute</div>
                      <div class="text-xs font-bold text-gray-700 flex-1 flex-shrink-0">Visual Encodings</div>
                      <div class="text-xs font-bold text-gray-700 w-16 flex-shrink-0 text-center">Select</div>
                    </div>
                    <div class="flex gap-4 items-center p-1">
                      <!-- Visual Attribute -->
                      <div class="flex-1 min-w-0">
                        <el-select
                          :model-value="filter.visualAttribute || ''"
                          @update:model-value="(v) => updateFilter(card.id, filterIndex, { visualAttribute: v === '' ? null : v })"
                          size="small"
                          placeholder="Select column"
                          filterable
                          style="width: 100%;"
                          @click.stop
                        >
                          <el-option label="None" value="" />
                          <el-option v-for="col in tableColumns" :key="col" :label="col" :value="col" />
                        </el-select>
                      </div>
                      <!-- Visual Encodings -->
                      <div class="flex flex-col gap-2 flex-1 flex-shrink-0">
                        <el-select
                          :model-value="filter.encoding?.channel || ''"
                          @update:model-value="(v) => updateFilterEncoding(card.id, filterIndex, { channel: v === '' ? null : v as 'width' | 'height' | 'size' })"
                          size="small"
                          placeholder="Mapping"
                          style="width: 100%;"
                          @click.stop
                        >
                          <el-option label="None" value="" />
                          <el-option label="Width" value="width" />
                          <el-option label="Height" value="height" />
                          <el-option label="Size" value="size" />
                        </el-select>
                        <div v-if="filter.encoding?.channel" class="flex flex-col gap-1">
                          <el-slider
                            :model-value="filter.encoding?.scale || 1"
                            :min="0.1"
                            :max="5"
                            :step="0.1"
                            @update:model-value="(v) => updateFilterEncoding(card.id, filterIndex, { scale: v })"
                            size="small"
                            @click.stop
                          />
                          <span class="text-xs text-gray-500 font-mono text-center">{{ (filter.encoding?.scale || 1).toFixed(2) }}</span>
                        </div>
                      </div>
                      <!-- Select -->
                      <div class="flex items-center justify-center w-16 flex-shrink-0">
                        <input
                          type="checkbox"
                          :checked="isFilterSelected(card.id, filterIndex)"
                          :disabled="!(filter.markerId && filter.data && filter.data.length > 0)"
                          @change="toggleFilterSelection(card.id, filterIndex)"
                          @click.stop
                          :class="[
                            'w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500',
                            !(filter.markerId && filter.data && filter.data.length > 0) ? 'opacity-30 cursor-not-allowed' : ''
                          ]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                @click.stop="addFilterToCard(card.id)"
                class="mt-3 w-full py-2 text-xs text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1 border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-pointer"
              >
                <span class="i-carbon-add text-sm"></span>
                <span>Add condition</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 空白 drop zone -->
        <div class="rounded-lg bg-white overflow-hidden border border-gray-200">
          <div class="flex">
            <div
              class="w-26 p-3 border-r border-gray-200 bg-gray-50 flex flex-col items-center justify-center relative"
              @drop="(e) => { handleDrop(e); isDraggingOverDropZone = false }"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              :class="isDraggingOverDropZone ? 'border-blue-400 bg-blue-50' : ''"
            >
              <div
                class="absolute flex items-center justify-center gap-2 p-2.5 w-20 rounded-lg border-2 border-dashed transition-all"
                style="top: 30px;"
                :class="isDraggingOverDropZone ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-400 bg-[#f6fdf3]'"
              >
                <span class="i-carbon-add text-sm"></span>
              </div>
              <p class="text-xs text-gray-400 text-center mt-2">Drop an attribute to start</p>
            </div>
            <div class="flex-1 p-3">
              <!-- 第一行标题 -->
              <div class="grid grid-cols-3 gap-4 mb-2 pb-2 border-b border-gray-200">
                <div v-for="i in 3" :key="i" class="h-4 bg-gray-100 rounded skeleton-shimmer" :style="`animation-delay: ${(i-1)*0.1}s`"></div>
              </div>
              <!-- 第一行内容 -->
              <div class="grid grid-cols-3 gap-4 items-center p-1 mb-4">
                <div v-for="i in 3" :key="i" class="h-8 bg-gray-100 rounded skeleton-shimmer" :style="`animation-delay: ${(i-1)*0.1}s`"></div>
              </div>
              <!-- 第二行标题 -->
              <div class="grid grid-cols-3 gap-4 mb-2 pb-2 border-b border-gray-200">
                <div v-for="i in 3" :key="i" class="h-4 bg-gray-100 rounded skeleton-shimmer" :style="`animation-delay: ${(i+2)*0.1}s`"></div>
              </div>
              <!-- 第二行内容 -->
              <div class="grid grid-cols-3 gap-4 items-center p-1">
                <div v-for="i in 2" :key="i" class="h-8 bg-gray-100 rounded skeleton-shimmer" :style="`animation-delay: ${(i+2)*0.1}s`"></div>
                <div class="h-4 w-4 bg-gray-100 rounded skeleton-shimmer" style="animation-delay: 0.5s"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 骨架屏流动特效 */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #f3f4f6 0%,
    #e5e7eb 20%,
    #f3f4f6 40%,
    #f3f4f6 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 10s infinite;
}
</style>
