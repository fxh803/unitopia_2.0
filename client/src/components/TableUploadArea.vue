<script setup lang="ts">
import { ref } from 'vue'
import { useTableStore } from '~/stores/table'

const tableStore = useTableStore()

const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement>()

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
  <div v-if="tableStore.tableData.length === 0 && !tableStore.isLoading" class="flex-1 w-full p-5 bg-white">
    <div
      class="border-2 h-full w-full border-dashed border-gray-300 rounded-lg transition-colors cursor-pointer flex flex-col justify-center items-center gap-4"
      :class="{
        'border-blue-500 bg-blue-50': isDragOver,
        'hover:border-gray-400': !isDragOver
      }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="fileInput?.click()"
    >
      <span class="i-carbon-add-alt text-4xl text-gray-400"></span>
      <div class="text-sm font-medium text-gray-400">Upload Data</div>
    </div>
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept=".csv"
      @change="handleFileSelect"
    />
  </div>
</template>

