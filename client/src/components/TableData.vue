<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTableStore } from '~/stores/table'

// const tableStore = useTableStore()
// const { columnFilterCards } = storeToRefs(tableStore)
const cellClasses = ref<Record<number, Record<number, string>>>({})

// 获取 filter 的颜色索引（每个 card 独立从 0 开始）
const getFilterColorIndex = (filterIndex: number): number => {
  return filterIndex % 8
}

// 单元格类名处理
const cellClassName = ({ rowIndex, column, columnIndex }: any) => {
  // // 遍历所有卡片和它们的 filter，检查当前行索引是否在某个 filter 的 rows 中
  // for (const card of columnFilterCards.value) {
  //   for (let filterIndex = 0; filterIndex < card.filters.length; filterIndex++) {
  //     const filter = card.filters[filterIndex]
  //     if (filter.rows && filter.rows.includes(rowIndex)) {
  //       // 每个 card 内的 filter 索引独立，从 0 开始
  //       const colorIndex = getFilterColorIndex(filterIndex)
  //       const className = `highlight-cell-${colorIndex}`
  //       // 确保 rowIndex 存在，如果不存在则创建
  //       if (!cellClasses.value[rowIndex]) {
  //         cellClasses.value[rowIndex] = {}
  //       }
  //       cellClasses.value[rowIndex][columnIndex] = className
  //       return className
  //     }
  //   }
  // }

  return ''
}
</script>

<template>
  <!-- 数据表格区域 - 只在有数据时显示 -->
  <div class="flex-1 w-full overflow-hidden flex flex-col"
    style="min-width: 0; min-height: 0; max-width: 100%; max-height: 100%;">
    <!-- 表格内容 -->
    <div class="flex-1 overflow-hidden">
        <vxe-table
          :data="tableStore.tableData"
          :scroll-y="{ enabled: true }"
          :scroll-x="{ enabled: true }"
          height="100%"
          :cell-config="{ height: 30 }"
          show-header-overflow
          show-overflow
          size="small"
          border
          :cell-class-name="cellClassName"
          :auto-resize="true"
          :column-config="{ resizable: true }"
        >
        <vxe-column v-for="(item, index) in tableStore.tableColumns" :key="index" :field="item" :title="item"
          header-align="center"
          :min-width="item.toLowerCase() === 'index' || item.toLowerCase() === 'idx' ? 20 : 40">
        </vxe-column>
      </vxe-table>
    </div>
  </div>
</template>

<style>
/* 为不同的 filter 定义不同的背景颜色 */
.highlight-cell-0 {
  background-color: rgba(166, 206, 227, 0.5);
  font-weight: bold;
}

.highlight-cell-1 {
  background-color: rgba(178, 223, 138, 0.5);
  font-weight: bold;
}

.highlight-cell-2 {
  background-color: rgba(251, 154, 153, 0.5);
  font-weight: bold;
}

.highlight-cell-3 {
  background-color: rgba(253, 191, 111, 0.5);
  font-weight: bold;
}

.highlight-cell-4 {
  background-color: rgba(202, 178, 214, 0.5);
  font-weight: bold;
}

.highlight-cell-5 {
  background-color: rgba(255, 255, 153, 0.5);
  font-weight: bold;
}

.highlight-cell-6 {
  background-color: rgba(141, 211, 199, 0.5);
  font-weight: bold;
}

.highlight-cell-7 {
  background-color: rgba(252, 205, 229, 0.5);
  font-weight: bold;
}

.vxe-cell--title{
  width: 100%;
}
</style>

