<script setup lang="ts">
import { ref } from 'vue'
import { useTableStore } from '~/stores/table'

const tableStore = useTableStore()

const isDragOver = ref(false)

// 处理滚动事件
const handleScrolling = () => {
  // 可以在这里添加滚动处理逻辑
  console.log('表格滚动中...')
}

// 单元格类名处理
const cellClassName = ({ row, column }: any) => {
  // 可以根据需要返回自定义的CSS类名
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
        }" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop"
        @click="$refs.fileInput.click()">
        <input ref="fileInput" type="file" class="hidden" accept=".csv" @change="handleFileSelect" />
        <span class="i-carbon-add-alt text-4xl text-gray-400"></span>
      </div>

    </div>

    <!-- 数据表格区域 - 只在有数据时显示 -->
    <div v-else-if="tableStore.tableData.length > 0" class="h-full w-full overflow-hidden"
      style="min-width: 0; min-height: 0; max-width: 100%; max-height: 100%; contain: layout size;">
      <vxe-table :data="tableStore.tableData" :scroll-y="{ enabled: true }" :scroll-x="{ enabled: true }" height="100%"
        @scroll="handleScrolling()" :row-config="{ isHover: true }" :cell-config="{ height: 30 }"
        show-header-overflow show-overflow size="small" border :cell-class-name="cellClassName" :auto-resize="true">
        <vxe-column v-for="(item, index) in tableStore.tableColumns" :key="index" :field="item" :title="item" row-resize
          min-width="80" />
      </vxe-table>
    </div>
  </div>
</template>

<style scoped>
/* Carbon 图标样式 */
.i-carbon\:add-alt::before {
  content: '\f0c9';
  font-family: 'carbon-icons';
}
</style>
