<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTableStore } from '~/stores/table' 

const tableStore = useTableStore()
const { columnFilterCards } = storeToRefs(tableStore)
const cellClasses = ref<Record<number, Record<number, string>>>({})

// 单元格类名处理
const cellClassName = ({ rowIndex, column, columnIndex }: any) => {
  // 遍历所有卡片和它们的 filter，检查当前行索引是否在某个 filter 的 rows 中
  for (const card of columnFilterCards.value) {
    for (const filter of card.filters) {
      if (filter.rows && filter.rows.includes(rowIndex)) {
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
</script>

<template>
  <!-- 数据表格区域 - 只在有数据时显示 -->
  <div class="flex-1 w-full overflow-hidden flex flex-col"
    style="min-width: 0; min-height: 0; max-width: 100%; max-height: 100%;">
    <!-- 表格内容 -->
    <div class="flex-1 overflow-hidden">
        <vxe-table :data="tableStore.tableData" :scroll-y="{ enabled: true }" :scroll-x="{ enabled: true }" height="100%"
          :cell-config="{ height: 30 }" show-header-overflow show-overflow size="small" border
          :cell-class-name="cellClassName" :auto-resize="true">
        <vxe-column v-for="(item, index) in tableStore.tableColumns" :key="index" :field="item" :title="item" row-resize 
          header-align="center"
          :min-width="item.toLowerCase() === 'index' || item.toLowerCase() === 'idx' ? 40 : 140">
        </vxe-column>
      </vxe-table>
    </div>
  </div>
</template>

<style>
.highlight-cell {
  background-color: rgba(166, 206, 227, 0.5);
  font-weight: bold;
}

.vxe-cell--title{
  width: 100%;
}
</style>

