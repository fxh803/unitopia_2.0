<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTableStore } from '~/stores/table' 
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useMarkerStore } from '~/stores/marker'
import { useDataScaleStore } from '~/stores/dataScale'
const collageSeriesStore = useCollageSeriesStore()
const { collageSeries, currentSlideIndex } = storeToRefs(collageSeriesStore)
const tableStore = useTableStore()
const markerStore = useMarkerStore()
const dataScaleStore = useDataScaleStore()
const { widthScale, heightScale, sizeScale, columnMapping } = storeToRefs(dataScaleStore)
const isDragOver = ref(false)
const cellClasses = ref<Record<number, Record<number, string>>>({})

// 下拉菜单选项
const mappingOptions = [
  { value: 'none', label: 'None' },
  { value: 'width', label: 'Width' },
  { value: 'height', label: 'Height' },
  { value: 'size', label: 'Size' }
]

// 获取列的映射值
const getColumnMappingValue = (columnName: string) => {
  return columnMapping.value.column === columnName ? (columnMapping.value.channel || 'none') : 'none'
}

// 处理列映射变化
const handleColumnMappingChange = (columnName: string, value: string) => {
  dataScaleStore.setColumnMapping(columnName, value === 'none' ? null : value as 'width' | 'height' | 'size')
}

// 单元格类名处理
const cellClassName = ({ rowIndex, column, columnIndex }: any) => {
  const markerData = markerStore.markers
  
  for (const data of markerData) {
    // 直接检查当前行索引是否在 cols Set 中（O(1) 查找）
    if (data.cols && data.cols.has(rowIndex)) {
       // 确保 rowIndex 存在，如果不存在则创建
       if (!cellClasses.value[rowIndex]) {
         cellClasses.value[rowIndex] = {}
       }
       cellClasses.value[rowIndex][columnIndex] = `highlight-cell`
       return `highlight-cell`
     }
  }

  return ''
}

// 处理拖拽
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    tableStore.handleFileUpload(files[0])
  }
}

// 文件输入框引用
const fileInput = ref<HTMLInputElement>()

// 处理文件选择
const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    tableStore.handleFileUpload(file)
  }
}

// 处理清除数据
const handleClearData = () => {
  tableStore.clearTableData()
  dataScaleStore.resetScales()
  // 重置文件输入框，允许重新上传
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="h-full border-b border-gray-200 relative flex flex-col group">
    <!-- 工具栏 - 始终显示在顶部 -->
    <div 
      class="flex justify-between items-center p-2 border-b border-gray-200 bg-gray-50 h-12 flex-shrink-0 shadow-sm z-10"
    >
      <span class="text-sm text-gray-600">Data Table</span>
      <div class="flex h-full gap-1">
        <button
          v-if="tableStore.tableData.length > 0"
          @click="handleClearData"
          class="h-8 w-8 rounded-full transition-colors flex items-center justify-center bg-white hover:bg-[var(--delete-color)] text-gray-600 hover:text-white opacity-0 group-hover:opacity-100"
          style="box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);"
          title="Clear data"
        >
          <span class="i-carbon:close-large text-sm"></span>
        </button>
      </div>
      <input ref="fileInput" type="file" class="hidden" accept=".csv" @change="handleFileSelect" />
    </div>

    <!-- 上传区域 - 只在没有数据时显示 -->
    <div v-if="tableStore.tableData.length === 0 && !tableStore.isLoading" class="flex-1 w-full p-5">
      <div
        class="border-2 h-full w-full border-dashed border-gray-300 rounded-lg  transition-colors cursor-pointer flex flex-col justify-center items-center gap-4"
        :class="{
          'border-blue-500 bg-blue-50': isDragOver,
          'hover:border-gray-400': !isDragOver
        }" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop" @click="fileInput?.click()">
        <span class="i-carbon-add-alt text-4xl text-gray-400"></span>
        <div class="text-sm font-medium text-gray-400">Upload Data</div>
      </div>
    </div>

    <!-- 数据表格区域 - 只在有数据时显示 -->
    <div v-else-if="tableStore.tableData.length > 0" class="flex-1 w-full overflow-hidden flex flex-col"
      style="min-width: 0; min-height: 0; max-width: 100%; max-height: 100%;">
      <!-- 表格内容 -->
      <div class="flex-1 overflow-hidden">
        <vxe-table :data="tableStore.tableData" :scroll-y="{ enabled: true }" :scroll-x="{ enabled: true }" height="100%"
          :cell-config="{ height: 30 }" :headerCellConfig="{ height: 60}" show-header-overflow show-overflow size="small" border
          :cell-class-name="cellClassName" :auto-resize="true">
          <vxe-column v-for="(item, index) in tableStore.tableColumns" :key="index" :field="item" :title="item" row-resize 
            :min-width="item.toLowerCase() === 'index' || item.toLowerCase() === 'idx' ? 40 : 130">
            <!-- 自定义表头：包含列名、下拉菜单和缩放滑块 -->
            <template #header>
              <div class="flex flex-col items-center w-full gap-1 py-1">
                <!-- 列名和下拉菜单 -->
                <div class="flex items-center justify-center gap-2 w-full">
                  <div class="text-xs font-semibold truncate">{{ item }}</div>
                  <el-select
                    v-if="item.toLowerCase() !== 'index' && item.toLowerCase() !== 'idx'"
                    :model-value="getColumnMappingValue(item)"
                    @update:model-value="(value) => handleColumnMappingChange(item, value)"
                    @click.stop
                    size="small"
                    style="width: 80px"
                    placeholder="Select"
                  >
                    <el-option
                      v-for="option in mappingOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </div>
                <!-- 缩放滑块：只在有映射时显示 -->
                <div v-if="columnMapping.column === item && columnMapping.channel" class="flex items-center justify-center gap-2 w-full transform translate-x-2">
                  <input 
                    type="range" 
                    :value="columnMapping.channel === 'width' ? widthScale : columnMapping.channel === 'height' ? heightScale : sizeScale"
                    @input="(e) => {
                      const value = parseFloat((e.target as HTMLInputElement).value)
                      if (columnMapping.channel === 'width') dataScaleStore.setWidthScale(value)
                      else if (columnMapping.channel === 'height') dataScaleStore.setHeightScale(value)
                      else if (columnMapping.channel === 'size') dataScaleStore.setSizeScale(value)
                    }"
                    min="0.1" 
                    max="5" 
                    step="0.1"
                    class="scale-slider w-20"
                    @click.stop
                  />
                  <span class="text-xs text-gray-600 min-w-8">
                    {{ (columnMapping.channel === 'width' ? widthScale : columnMapping.channel === 'height' ? heightScale : sizeScale).toFixed(1) }}
                  </span>
                </div>
              </div>
            </template>
          </vxe-column>
        </vxe-table>
      </div>
    </div>
  </div>
</template>

<style>
.highlight-cell {
  background-color: rgba(166, 206, 227, 0.5);
  font-weight: bold;
}

/* 增加列标题宽度 */
/* .vxe-cell--title {
  width: 100% !important;
} */

/* 滑动条样式 */
.scale-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.scale-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.scale-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: #2563eb;
}

.scale-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.scale-slider::-moz-range-thumb:hover {
  transform: scale(1.2);
  background: #2563eb;
}
</style>