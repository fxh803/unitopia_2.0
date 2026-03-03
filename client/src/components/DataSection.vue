<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTableStore } from '~/stores/table'
import { useDataScaleStore } from '~/stores/dataScale'
import TableDataView from './TableData.vue'

const tableStore = useTableStore()
const dataScaleStore = useDataScaleStore()
const { tableData, tableColumns, isLoading } = storeToRefs(tableStore)

const isExpanded = ref(true)
const activeTab = ref<'fields' | 'table'>('fields')

// 当前正在被拖拽的字段（用 column 作为唯一 key）
const draggingFieldKey = ref<string | null>(null)

const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)

// 根据列数据推断类型前缀：# 数值型，abc 分类型/文本
function getFieldPrefix(column: string): string {
  if (!tableData.value.length) return 'abc '
  const sample = tableData.value
    .slice(0, 20)
    .map(row => row[column])
    .filter(v => v != null && String(v).trim() !== '')
  if (sample.length === 0) return 'abc '
  const allNumeric = sample.every(v => /^-?\d+(\.\d+)?$/.test(String(v).trim()))
  return allNumeric ? '# ' : 'abc '
}

const fieldTags = computed(() =>
  tableColumns.value.map(col => {
    const prefix = getFieldPrefix(col)
    const isNumeric = prefix.startsWith('#')
    return { column: col, prefix, isNumeric }
  })
)

// 将字段按类型分组：数值型 / 分类型
const numericTags = computed(() => fieldTags.value.filter(tag => tag.isNumeric))
const categoricalTags = computed(() => fieldTags.value.filter(tag => !tag.isNumeric))

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const files = e.dataTransfer?.files
  if (files?.length) tableStore.handleFileUpload(files[0])
}

function onFieldDragStart(e: DragEvent, tag: { column: string }, type: 'numeric' | 'categorical') {
  if (!e.dataTransfer) return

  // 1. 设置拖拽携带的数据
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('text/plain', tag.column)
  e.dataTransfer.setData('field-type', type)
  e.dataTransfer.setData('entities', String(tableData.value.length))

  // 2. 自定义拖拽时跟随鼠标的“影像”，保持 pill 原本样式
  const target = e.target as HTMLElement | null
  if (target) {
    const rect = target.getBoundingClientRect()
    const dragImage = target.cloneNode(true) as HTMLElement
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-9999px'
    dragImage.style.left = '-9999px'
    dragImage.style.pointerEvents = 'none'
    dragImage.classList.remove('data-field-placeholder')
    dragImage.querySelectorAll<HTMLElement>('*').forEach(el => {
      el.style.visibility = '' // 确保内部内容可见
    })
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, rect.width / 2, rect.height / 2)
    // 拖拽开始后再异步移除临时节点
    requestAnimationFrame(() => {
      document.body.removeChild(dragImage)
    })
  }

  // 3. 标记当前字段为“正在被拖拽”，让原位置显示为灰色洞
  draggingFieldKey.value = tag.column
}

function onFieldDragEnd() {
  draggingFieldKey.value = null
}

function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) tableStore.handleFileUpload(file)
}

function clearData() {
  tableStore.clearTableData()
  dataScaleStore.resetScales()
}
</script>

<template>
  <div
    class="border-b border-[var(--border-color)] flex flex-col min-h-0"
    :class="tableData.length > 0 && isExpanded && activeTab === 'table' ? 'h-[500px]' : ''"
  >
    <!-- 无数据时：左侧折叠按钮 + 「Data」标题（只有箭头可点击） -->
    <div
      v-if="tableData.length === 0"
      class="flex items-center w-full px-3 py-2 bg-[var(--primary-light-color)] hover:bg-[var(--border-color)]/10 transition-colors text-left gap-2"
    >
      <button
        type="button"
        class="p-0.5 rounded hover:bg-[var(--border-color)]/20 transition-colors text-[var(--text-muted)] cursor-pointer"
        @click="isExpanded = !isExpanded"
      >
        <div
          class="w-4 h-4 flex-shrink-0 transition-transform duration-200"
          :class="isExpanded ? 'i-carbon-chevron-down' : 'i-carbon-chevron-right'"
        />
      </button>
      <span class="text-[14px] font-bold text-[var(--title-color)]">Data</span>
    </div>

    <!-- 有数据时：左侧折叠 + Fields/Table tab（无 Data 标题） -->
    <div
      v-else
      class="flex items-center px-3 py-2 bg-[var(--primary-light-color)] border-b-0 flex-shrink-0 gap-2"
    >
      <button
        type="button"
        class="p-0.5 rounded hover:bg-[var(--border-color)]/20 transition-colors text-[var(--text-muted)] cursor-pointer"
        @click="isExpanded = !isExpanded"
      >
        <div
          class="w-4 h-4 transition-transform duration-200"
          :class="isExpanded ? 'i-carbon-chevron-down' : 'i-carbon-chevron-right'"
        />
      </button>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="px-0 py-1.5 text-[14px] transition-colors cursor-pointer"
          :class="activeTab === 'fields' ? 'font-bold text-[var(--title-color)]' : 'font-normal text-[var(--text-muted)] hover:text-[var(--title-color)]'"
          @click="activeTab = 'fields'"
        >
          Fields
        </button>
        <button
          type="button"
          class="px-0 py-1.5 text-[14px] transition-colors cursor-pointer"
          :class="activeTab === 'table' ? 'font-bold text-[var(--title-color)]' : 'font-normal text-[var(--text-muted)] hover:text-[var(--title-color)]'"
          @click="activeTab = 'table'"
        >
          Table
        </button>
      </div>
      <div class="flex-1 min-w-0" />
      <button
        type="button"
        class="p-1 rounded cursor-pointer text-black hover:text-[var(--text-muted)]"
        title="clear data"
        @click="clearData"
      >
        <span class="i-carbon-close text-lg w-5 h-5 block" />
      </button>
    </div>

    <div v-show="isExpanded" class="flex-1 min-h-0 overflow-hidden flex flex-col">
      <!-- 无数据：上传区域 -->
      <template v-if="tableData.length === 0">
        <div
          v-if="!isLoading"
          class="flex-1 min-h-[120px] w-full p-3"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
          @click="fileInput?.click()"
        >
          <div
            class="data-upload-area h-full min-h-[100px] w-full border-2 border-dashed rounded-lg transition-colors cursor-pointer flex flex-col justify-center items-center gap-2"
            :class="{
              'border-[var(--text-muted-light)] bg-[var(--border-color)]/10': isDragOver,
              'border-[var(--border-color)]': !isDragOver,
            }"
          >
            <img src="/table upload.svg" alt="" class="w-5 h-5 text-[var(--text-muted)]" />
            <span class="text-sm font-medium text-[var(--text-muted)]">Upload Data from Computer</span>
          </div>
        </div>
        <div v-else class="flex items-center justify-center py-8 text-[var(--text-muted)] text-sm">
          Loading…
        </div>
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept=".csv"
          @change="handleFileSelect"
        />
      </template>

      <!-- 有数据：Fields 或 Table 内容 -->
      <template v-else>
        <!-- Fields：同一容器，数值型一行、分类型一行 -->
        <div v-show="activeTab === 'fields'" class="flex-1 min-h-0 flex flex-col p-3">
          <div class="data-fields-container flex-1 min-h-0 flex flex-wrap items-start content-start gap-2.5 overflow-auto">
            <!-- 数值型字段 -->
            <span
              v-for="tag in numericTags"
              :key="`num-${tag.column}`"
              class="data-field-pill inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-medium cursor-move"
              :class="{ 'data-field-placeholder': draggingFieldKey === tag.column }"
              draggable="true"
              @dragstart="onFieldDragStart($event, tag, 'numeric')"
              @dragend="onFieldDragEnd"
            >
              <span class="data-field-prefix-num mr-1">#</span>
              <span class="data-field-name">{{ tag.column }}</span>
            </span>

            <!-- 类型行之间的换行（只有两种类型都存在时才加） -->
            <span
              v-if="numericTags.length && categoricalTags.length"
              class="w-full basis-full h-0 flex-shrink-0 block"
              aria-hidden="true"
            />

            <!-- 分类型 / 文本字段 -->
            <span
              v-for="tag in categoricalTags"
              :key="`cat-${tag.column}`"
              class="data-field-pill inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-medium cursor-move"
              :class="{ 'data-field-placeholder': draggingFieldKey === tag.column }"
              draggable="true"
              @dragstart="onFieldDragStart($event, tag, 'categorical')"
              @dragend="onFieldDragEnd"
            >
              <span class="data-field-prefix-abc mr-1">abc</span>
              <span class="data-field-name">{{ tag.column }}</span>
            </span>
          </div>
        </div>

        <!-- Table：表格 -->
        <div v-show="activeTab === 'table'" class="flex-1 min-h-0 overflow-hidden flex flex-col">
          <TableDataView />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.data-upload-area {
  background-color: #efebea;
}

.data-fields-container {
  background-color: #efebea;
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid #cfcecd;
  /* box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); */
}

.data-field-pill {
  background-color: #fbf8f6;
  color: #444;
  border: none;
}

.data-field-placeholder {
  background-color: #d4d1cf;
  border-radius: 9999px;
}

.data-field-placeholder > * {
  visibility: hidden;
}

.data-field-prefix-num {
  color: #888;
}

.data-field-prefix-abc {
  color: #888;
}

.data-field-name {
  color: #444;
}

.data-field-group {
  background-color: #dcdcdc;
  color: #444;
}
</style>
