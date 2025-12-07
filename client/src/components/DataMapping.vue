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
const { columnMapping, widthScale, heightScale, sizeScale } = storeToRefs(dataScaleStore)
const { setColumnMapping, setWidthScale, setHeightScale, setSizeScale } = dataScaleStore

// 拖拽状态
const isDraggingFilter = ref(false)
const dragImageElement = ref<HTMLElement | null>(null)
const isDraggingOverDropZone = ref(false)
const isDraggingOverBottomDropZone = ref(false)
const isDraggingOverMarkerDropZone = ref<Record<string, boolean>>({})

// 生成唯一 ID
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

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

// 计算属性：获取当前 scale 值
const getCurrentScale = (channel: string | null) => {
  if (channel === 'width') return widthScale.value
  if (channel === 'height') return heightScale.value
  if (channel === 'size') return sizeScale.value
  return 1
}

// 计算属性：设置当前 scale 值
const setCurrentScale = (channel: string | null, value: number) => {
  if (channel === 'width') setWidthScale(value)
  else if (channel === 'height') setHeightScale(value)
  else if (channel === 'size') setSizeScale(value)
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

  if (cardId) {
    const card = getCard(cardId)
    if (card?.column === column) {
      addFilterToCard(cardId)
    }
  } else {
    const existingCard = columnFilterCards.value.find(card => card.column === column)
    if (existingCard) {
      addFilterToCard(existingCard.id)
    } else {
      columnFilterCards.value.push({
        id: generateId('card'),
        column,
        filters: [{ operator: '=', value: '', markerId: null, data: [], rows: [] }]
      })
    }
  }
}

// 通用拖拽悬停处理
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  isDraggingOverDropZone.value = true
}

const handleBottomDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  isDraggingOverBottomDropZone.value = true
}

// 通用拖拽离开处理
const handleDragLeave = (e: DragEvent) => {
  if (isOutsideRect(e, e.currentTarget as HTMLElement)) {
    isDraggingOverDropZone.value = false
  }
}

const handleBottomDragLeave = (e: DragEvent) => {
  if (isOutsideRect(e, e.currentTarget as HTMLElement)) {
    isDraggingOverBottomDropZone.value = false
  }
}


// 添加筛选条件到卡片
const addFilterToCard = (cardId: string) => {
  getCard(cardId)?.filters.push({ operator: '=', value: '', markerId: null, data: [], rows: [] })
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

onBeforeUnmount(() => {
  cleanupDragImage()
})
</script>

<template>
  <div class="flex-1 flex overflow-hidden">
    <!-- 左侧：列名列表 -->
    <div class="w-48 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div class="p-3 border-b border-gray-200">
        <h3 class="text-sm font-bold text-gray-700">Columns</h3>
        <p v-if="tableStore.fileName" class="text-xs text-gray-500 mt-1 truncate">
          {{ tableStore.fileName }}
        </p>
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
            class="flex items-center gap-2 p-2.5 rounded-lg cursor-move bg-white shadow-sm hover:shadow-md transition-all border border-gray-200 hover:border-blue-300 hover:bg-blue-50"
          >
            <span :class="[getColumnIcon(column), 'text-xs text-gray-400']"></span>
            <span class="text-sm text-gray-700 flex-1 font-medium">{{ column }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：筛选条件区域 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- 筛选条件列表 -->
      <div class="flex-1 overflow-y-auto p-3">
        <div v-if="columnFilterCards.length === 0" class="h-full w-full flex items-center justify-center">
          <div
            @drop="(e) => { handleDrop(e); isDraggingOverDropZone = false }"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            :class="[
              'w-full h-full border-2 border-dashed rounded-lg flex items-center justify-center transition-all',
              isDraggingOverDropZone
                ? 'border-blue-400 bg-blue-50 text-blue-600'
                : 'border-gray-300 text-gray-400'
            ]"
          >
            <p class="text-sm">Drag attribute to filter</p>
          </div>
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="card in columnFilterCards"
            :key="card.id"
            @drop="(e) => handleDrop(e, card.id)"
            @dragover="handleDragOver"
            :draggable="getSelectedFilters(card.id).length > 0"
            @dragstart="(e) => handleCardDragStart(card.id, e)"
            @dragend="handleFilterDragEnd"
            :class="[
              'rounded-lg bg-white overflow-hidden transition-all border',
              getSelectedFilters(card.id).length > 0
                ? 'cursor-move border-gray-200 hover:border-1 hover:border-blue-400'
                : 'border-gray-200',
              isDraggingFilter && getSelectedFilters(card.id).length > 0 ? 'border-blue-400 bg-blue-50' : ''
            ]"
          >
            <div class="flex">
              <!-- 左侧：列名和映射设置 -->
              <div class="w-26 p-3 border-r border-gray-200 bg-gray-50 flex flex-col gap-3">
                <div class="flex items-center">
                  <span class="text-sm font-bold text-gray-700">{{ card.column }}</span>
                </div>
                <el-select
                  :model-value="columnMapping.column === card.column ? columnMapping.channel : ''"
                  @update:model-value="(value) => setColumnMapping(card.column, value === '' ? null : value)"
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
                <!-- 根据映射显示对应的 scale 滑动条 -->
                <div v-if="columnMapping.column === card.column && columnMapping.channel" class="flex flex-col gap-2">
                  <el-slider
                    :model-value="getCurrentScale(columnMapping.channel)"
                    :min="0.1"
                    :max="5"
                    :step="0.1"
                    @update:model-value="(value) => setCurrentScale(columnMapping.channel, value)"
                    size="small"
                    @click.stop
                  />
                  <span class="text-xs text-gray-500 font-mono text-center">
                    {{ getCurrentScale(columnMapping.channel).toFixed(2) }}
                  </span>
                </div>
              </div>

              <!-- 右侧：表头和筛选条件行 -->
              <div class="flex-1 p-3">
                <!-- 表头 -->
                <div class="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 mb-2 pb-2 border-b border-gray-200">
                  <div class="text-xs font-bold text-gray-700">Condition</div>
                  <div class="text-xs font-bold text-gray-700">Data</div>
                  <div class="text-xs font-bold text-gray-700 flex items-center">Mark</div>
                  <div class="text-xs font-bold text-gray-700 flex items-center justify-center">Select</div>
                </div>

              <!-- 筛选条件行 -->
              <div class="space-y-2">
                <div
                  v-for="(filter, filterIndex) in card.filters"
                  :key="filterIndex"
                  :class="[
                    'grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-center rounded transition-all p-1',
                    filter.markerId && filter.data && filter.data.length > 0
                      ? 'hover:bg-gray-50 border border-transparent hover:border-blue-300'
                      : 'border border-transparent',
                    isFilterSelected(card.id, filterIndex) ? 'bg-blue-50 border-blue-300' : ''
                  ]"
                >
                  <!-- Condition 列 -->
                  <div class="flex items-center gap-1">
                    <el-select
                      :model-value="filter.operator"
                      @update:model-value="(value) => updateFilter(card.id, filterIndex, { operator: value as ConditionOperator })"
                      size="small"
                      style="width: 50px; min-width: 50px; flex-shrink: 0;"
                      @click.stop
                    >
                      <el-option label="=" value="=" />
                      <el-option v-if="isNumericColumn(card.column)" label=">" value=">" />
                      <el-option v-if="isNumericColumn(card.column)" label="<" value="<" />
                    </el-select>
                    <!-- 根据列类型显示不同的输入控件 -->
                    <el-select
                      v-if="!isNumericColumn(card.column)"
                      :model-value="filter.value"
                      @update:model-value="(value) => updateFilter(card.id, filterIndex, { value })"
                      size="small"
                      placeholder="Select value"
                      filterable
                      @click.stop
                    >
                      <el-option
                        v-for="val in getColumnUniqueValues(card.column)"
                        :key="val"
                        :label="val"
                        :value="val"
                      />
                    </el-select>
                    <el-input
                      v-else
                      :model-value="filter.value"
                      @update:model-value="(value) => updateFilter(card.id, filterIndex, { value })"
                      size="small"
                      placeholder="Enter number"
                      type="number"
                      @click.stop
                    />
                  </div>

                  <!-- Data 列：显示匹配的实体数量 -->
                  <div>
                    <div class="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {{ getFilterMatchedCount(filter) }} entities
                    </div>
                  </div>

                  <!-- Mark 列：分配 marker -->
                  <div
                    class="flex items-center min-h-[32px]"

                  >
                    <div
                      v-if="filter.markerId"
                      class="relative w-8 h-8 group/marker"
                    >
                      <div
                        class="w-full h-full border border-gray-300 rounded overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
                        @click.stop
                      >
                        <img
                          :src="markers.find(m => m.id === filter.markerId)?.thumbnail"
                          alt="Marker"
                          class="w-full h-full object-contain"
                        />
                      </div>
                      <button
                        @click.stop="assignMarkerToFilter(card.id, filterIndex, null)"
                        class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/marker:opacity-100 transition-opacity z-20 pointer-events-auto"
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
                        isDraggingOverMarkerDropZone[`${card.id}-${filterIndex}`]
                          ? 'border-blue-400 text-blue-600 bg-blue-50'
                          : 'border-gray-300 text-gray-400'
                      ]"
                      title="Drag marker here"
                    >
                      <span class="i-carbon-add text-sm"></span>
                    </div>
                  </div>

                  <!-- Select 列：复选框 -->
                  <div class="flex items-center justify-center">
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

                <!-- 添加条件按钮 -->
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

          <!-- 底部拖拽区域 -->
          <div
            @drop="(e) => { handleDrop(e); isDraggingOverBottomDropZone = false }"
            @dragover="handleBottomDragOver"
            @dragleave="handleBottomDragLeave"
            :class="[
              'border-2 border-dashed rounded-lg p-4 text-center transition-all',
              isDraggingOverBottomDropZone
                ? 'border-blue-400 bg-blue-50 text-blue-600'
                : 'border-gray-300 text-gray-400'
            ]"
          >
            <p class="text-sm">Drag attribute to add new filter</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 可以添加自定义样式 */
</style>
