<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTableStore } from '~/stores/table'
import { useMarkInstanceStore } from '~/stores/markInstance'

const isExpanded = ref(true)

const tableStore = useTableStore()
const { tableData } = storeToRefs(tableStore)

const markInstanceStore = useMarkInstanceStore()
const { markInstances } = storeToRefs(markInstanceStore)

const isDragOver = ref(false)

const hasMarks = computed(() => markInstances.value.length > 0)

function handleFieldDropOnMark(e: DragEvent, markId: string) {
  e.preventDefault()
  const fieldName = e.dataTransfer?.getData('text/plain')
  const fieldType = e.dataTransfer?.getData('field-type') as 'numeric' | 'categorical'
  const entitiesStr = e.dataTransfer?.getData('entities')

  if (!fieldName || !fieldType) return

  const entities = entitiesStr ? Number(entitiesStr) : tableData.value.length

  markInstanceStore.updateMarkInstance(markId, {
    fieldName,
    fieldType,
    entities,
  })
}

function clearMarkField(markId: string) {
  markInstanceStore.updateMarkInstance(markId, {
    fieldName: null,
    fieldType: null,
  })
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const fieldName = e.dataTransfer?.getData('text/plain')
  const fieldType = e.dataTransfer?.getData('field-type') as 'numeric' | 'categorical'
  const entitiesStr = e.dataTransfer?.getData('entities')

  if (!fieldName || !fieldType) return

  const entities = entitiesStr ? Number(entitiesStr) : tableData.value.length

  markInstanceStore.addMarkInstance({
    name: `Mark ${markInstances.value.length + 1}`,
    entities,
    fieldType,
    fieldName
  })
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
}
</script>

<template>
  <div class="border-b border-[var(--border-color)] flex flex-col min-h-0">
    <!-- 标题栏：左侧折叠按钮 + 标题（只有箭头可点击） -->
    <div
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
      <span class="text-[14px] font-bold text-[var(--title-color)]">Marks</span>
    </div>

    <!-- 内容区 -->
    <div v-show="isExpanded" class="flex-1 min-h-0 overflow-auto px-3 py-2 space-y-3">
      <!-- 拖拽上传区域 -->
      <div class="w-full">
        <div
          class="marks-upload-area h-full min-h-[100px] w-full border-2 border-dashed rounded-lg transition-colors flex flex-col justify-center items-center gap-2"
          :class="{
            'border-[var(--text-muted-light)] bg-[var(--border-color)]/10': isDragOver,
            'border-[var(--border-color)]': !isDragOver,
          }"
          @dragover.prevent="handleDragOver"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <img src="/tabler_drag-drop.svg" alt="" class="w-5 h-5 text-[var(--text-muted)]" />
          <span class="text-sm font-medium text-[var(--text-muted)]">Drag &amp; Drop Fields Here</span>
        </div>
      </div>

      <!-- 有 mark 时：下方列表 -->
      <div
        v-if="hasMarks"
        v-for="mark in markInstances"
        :key="mark.id"
        class="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[var(--primary-light-color)] border border-[var(--border-color)]"
      >
        <!-- 缩略图 -->
        <div class="w-10 h-10 rounded-xl bg-white border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
          <img
            src="/default_mark.svg"
            alt=""
            class="w-full h-full object-contain"
          />
        </div>

        <!-- 文本信息：紧贴缩略图 -->
        <div class="flex flex-col min-w-0">
          <span class="text-[14px] font-semibold text-[var(--title-color)] truncate">{{ mark.name }}</span>
          <span class="text-[12px] text-[var(--text-muted)]">{{ mark.entities }} Entities</span>
        </div>

        <!-- 撑开右侧，field pill 贴右边 -->
        <div class="flex-1" />

        <!-- 右侧 field pill / 占位洞 -->
        <div v-if="mark.fieldName" class="flex items-center">
          <div
            class="group relative px-4 py-1.5 rounded-full text-[13px] flex items-center gap-2 bg-white border border-[var(--border-color)] text-[var(--title-color)] min-w-[160px]"
            @dragover.prevent
            @drop.prevent="handleFieldDropOnMark($event, mark.id)"
          >
            <span class="text-[12px] text-[var(--text-muted)]">
              {{ mark.fieldType === 'numeric' ? '#' : 'abc' }}
            </span>
            <span class="font-medium truncate max-w-[140px]">{{ mark.fieldName }}</span>
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 text-[var(--text-muted)] hover:text-[var(--title-color)] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              title="delete field"
              @click.stop="clearMarkField(mark.id)"
            >
              <span class="i-carbon-close text-sm leading-none" />
            </button>
          </div>
        </div>
        <div v-else class="flex items-center">
          <div
            class="px-4 py-1.5 rounded-full text-[13px] flex items-center bg-[var(--border-color)]/60 border border-[var(--border-color)] min-w-[160px]"
            @dragover.prevent
            @drop.prevent="handleFieldDropOnMark($event, mark.id)"
          >
            <span class="opacity-0 select-none">placeholder</span>
          </div>
        </div>

        <!-- 删除 -->
        <button
          type="button"
          class="ml-1 text-[var(--text-muted)] hover:text-[var(--title-color)] cursor-pointer"
          @click="markInstanceStore.removeMarkInstance(mark.id)"
        >
          <img src="/Icon-Trash.svg" alt="" class="w-6 h-6" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.marks-upload-area {
  background-color: #efebea;
}
</style>
