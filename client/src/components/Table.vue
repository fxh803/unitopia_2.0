<script setup lang="ts">
import { ref } from 'vue'
import { useTableStore } from '~/stores/table' 
import { useDataScaleStore } from '~/stores/dataScale'
import TableUploadArea from './TableUploadArea.vue'
import TableData from './TableData.vue'
import DataMapping from './DataMapping.vue'

const tableStore = useTableStore()
const dataScaleStore = useDataScaleStore()

// 标签页状态：'table' 或 'mapping'
const activeTab = ref<'table' | 'mapping'>('table')

// 处理清除数据
const handleClearData = () => {
  tableStore.clearTableData()
  dataScaleStore.resetScales()
  activeTab.value = 'table' // 清除数据后回到表格标签页
}

// 切换标签页
const switchTab = (tab: 'table' | 'mapping') => {
  if (tableStore.tableData.length > 0) {
    activeTab.value = tab
  }
}
</script>

<template>
  <div class="h-full border-b border-gray-200 relative flex flex-col group">
    <!-- 工具栏 - 始终显示在顶部 -->
    <div 
      class="flex justify-between items-center p-2 border-b border-gray-200 bg-gray-50 flex-shrink-0 shadow-sm z-10"
    >
      <!-- 左侧：标题 -->
      <span class="text-[14px] text-gray-600 font-bold">Data Table</span>

      <!-- 右侧：标签页切换和清除按钮 -->
      <div class="flex items-center gap-2">
        <!-- 标签页切换 -->
        <div class="flex items-center gap-1" v-if="tableStore.tableData.length > 0">
          <button
            @click="switchTab('table')"
            :class="[
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              activeTab === 'table' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            ]"
          >
            Table
          </button>
          <button
            @click="switchTab('mapping')"
            :class="[
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              activeTab === 'mapping' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            ]"
          >
            Mapping
          </button>
        </div>
        <!-- 清除按钮 -->
        <div class="flex h-full gap-1 transform">
          <button
            v-if="tableStore.tableData.length > 0"
            @click="handleClearData"
            class="h-6 w-6 rounded-full transition-colors flex items-center justify-center bg-white hover:bg-[var(--delete-color)] text-gray-600 hover:text-white opacity-0 group-hover:opacity-100"
            style="box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);"
            title="Clear data"
          >
            <span class="i-carbon:close-large text-sm"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- 上传区域 - 只在没有数据时显示 -->
    <TableUploadArea v-if="tableStore.tableData.length === 0 || tableStore.isLoading" />

    <!-- 内容区域 - 根据标签页显示不同内容 -->
    <template v-if="tableStore.tableData.length > 0">
      <TableData v-if="activeTab === 'table'" />
      <DataMapping v-if="activeTab === 'mapping'" />
    </template>
  </div>
</template>
