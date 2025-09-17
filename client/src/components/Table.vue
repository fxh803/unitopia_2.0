<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTableStore } from '~/stores/table' 
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useMarkerStore } from '~/stores/marker'
const collageSeriesStore = useCollageSeriesStore()
const { collageSeries, currentSlideIndex } = storeToRefs(collageSeriesStore)
const tableStore = useTableStore()
const markerStore = useMarkerStore()
const isDragOver = ref(false)
const isScrolling = ref(false)
const cellClasses = ref<Record<number, Record<number, string>>>({})
// 处理滚动事件
const handleScrolling = () => {
  // 可以在这里添加滚动处理逻辑
  if(isScrolling.value){
    return
  }
  isScrolling.value = true
  setTimeout(() => {
    isScrolling.value = false
  }, 1000)
}

// 单元格类名处理
const cellClassName = ({ rowIndex, column, columnIndex }: any) => {
     if (isScrolling.value) {
     return cellClasses.value[rowIndex]?.[columnIndex] || ''
   } else {
    const markerData = markerStore.markers
    for (const data of markerData) {
       if (data.mapping.dataField === column.property && data.mapping.dataRange.start <= rowIndex + 1 && data.mapping.dataRange.end >= rowIndex + 1) {
         // 确保 rowIndex 存在，如果不存在则创建
         if (!cellClasses.value[rowIndex]) {
           cellClasses.value[rowIndex] = {}
         }
         cellClasses.value[rowIndex][columnIndex] = `highlight-cell`
         return `highlight-cell`
       }
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
}
</script>

<template>
  <div class="h-full border-b border-gray-200 relative">
    <!-- 上传区域 - 只在没有数据时显示 -->
    <div v-if="tableStore.tableData.length === 0 && !tableStore.isLoading" class="h-full w-full p-5">
      <div
        class="border-2 h-full w-full border-dashed border-gray-300 rounded-lg  transition-colors cursor-pointer flex justify-center items-center"
        :class="{
          'border-blue-500 bg-blue-50': isDragOver,
          'hover:border-gray-400': !isDragOver
        }" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop" @click="$refs.fileInput.click()">
        <input ref="fileInput" type="file" class="hidden" accept=".csv" @change="handleFileSelect" />
        <span class="i-carbon-add-alt text-4xl text-gray-400"></span>
      </div>

    </div>

    <!-- 数据表格区域 - 只在有数据时显示 -->
    <div v-else-if="tableStore.tableData.length > 0" class="h-full w-full overflow-hidden flex flex-col"
      style="min-width: 0; min-height: 0; max-width: 100%; max-height: 100%; contain: layout size;">
      <!-- 工具栏 -->
      <div class="flex justify-between items-center p-2 border-b border-gray-200 bg-gray-50 h-12">
        <span class="text-sm text-gray-600">Data Table</span>
        <div class="flex h-full gap-1">
          <button
            @click="handleClearData"
            class="h-full w-8 text-white rounded transition-colors flex items-center justify-center"
            :class="[
              'bg-[var(--delete-color)] hover:bg-[var(--delete-hover-color)]'
            ]"
            title="Clear data and re-upload"
          >
            <span class="i-carbon:close-large text-sm"></span>
          </button>
          
        </div>
        <input ref="fileInput" type="file" class="hidden" accept=".csv" @change="handleFileSelect" />
      </div>
      
      <!-- 表格内容 -->
      <div class="flex-1 overflow-hidden">
        <vxe-table :data="tableStore.tableData" :scroll-y="{ enabled: true }" :scroll-x="{ enabled: true }" height="100%"
          @scroll="handleScrolling()" :cell-config="{ height: 30 }" show-header-overflow show-overflow size="small" border
          :cell-class-name="cellClassName" :auto-resize="true">
          <vxe-column v-for="(item, index) in tableStore.tableColumns" :key="index" :field="item" :title="item" row-resize
            min-width="80" />
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
</style>