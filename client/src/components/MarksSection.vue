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

// 每个 group 父实例内部子列表的折叠状态（默认展开）
const groupRowExpanded = ref<Record<string, boolean>>({})

function isGroupRowExpanded(id: string) {
  const current = groupRowExpanded.value[id]
  return current === undefined ? true : current
}

function toggleGroupRow(id: string) {
  groupRowExpanded.value[id] = !isGroupRowExpanded(id)
}

function handleGroupValueChange(parentId: string, childId: string, value: string) {
  const parent = markInstances.value.find(m => m.id === parentId)
  if (!parent || !parent.fieldName || !parent.isGroup) return

  const fieldName = parent.fieldName

  // 计算这个子实例对应的行索引
  const indices: number[] = []
  const details: unknown[] = []
  tableData.value.forEach((row, idx) => {
    const raw = (row as Record<string, unknown>)[fieldName]
    if (raw == null) return
    const str = String(raw).trim()
    if (str === value) {
      indices.push(idx)
      details.push(raw)
    }
  })

  const newChildren = (parent.children || []).map(child => {
    if (child.id !== childId) return child
    return {
      ...child,
      selectedValue: value,
      entityIndices: indices,
      entities: indices.length,
      entitiesDetail: details,
    }
  })

  markInstanceStore.updateMarkInstance(parentId, {
    children: newChildren,
    entityIndices: null,
    entitiesDetail: null,
    entities: 0,
  })
}

function handleFieldDropOnMark(e: DragEvent, markId: string) {
  e.preventDefault()
  const fieldName = e.dataTransfer?.getData('text/plain')
  const fieldType = e.dataTransfer?.getData('field-type') as 'numeric' | 'categorical'
  const entitiesStr = e.dataTransfer?.getData('entities')
  const variant = e.dataTransfer?.getData('field-variant') || 'field'

  if (!fieldName || !fieldType) return

  const mark = markInstances.value.find(m => m.id === markId)
  if (!mark) return

  const baseEntities = entitiesStr ? Number(entitiesStr) : tableData.value.length
  const isGroupDrop = variant === 'group' && fieldType === 'categorical'

  // 只有同类才能互相 drop：
  // - group 父实例只能接收 group 分身
  // - 非 group 实例只能接收普通字段
  if (mark.isGroup && !isGroupDrop) return
  if (!mark.isGroup && isGroupDrop) return

  // 非 group：把这一行当作普通 mark，清空 children
  if (!mark.isGroup) {
    const entityIndices = tableData.value.map((_, idx) => idx)
    const entities = Math.min(entityIndices.length, baseEntities)
    const entitiesDetail = entityIndices.map(idx => {
      const row = tableData.value[idx] as Record<string, unknown>
      return row[fieldName]
    })

    markInstanceStore.updateMarkInstance(markId, {
      fieldName,
      fieldType,
      isGroup: false,
      children: [],
      entityIndices,
      entities,
      entitiesDetail,
    })
    return
  }

  // group：这一行是 group 父实例，需要根据字段值分组，并为现有 children 重新分配 value
  if (mark.isGroup) {
    const map = new Map<string, number[]>()
    tableData.value.forEach((row, idx) => {
      const raw = (row as Record<string, unknown>)[fieldName]
      if (raw == null) return
      const str = String(raw).trim()
      if (!str) return
      const list = map.get(str) ?? []
      list.push(idx)
      map.set(str, list)
    })

    const groupValues = Array.from(map.keys())

    // 依据现有 children 数量重新生成子实例
    const existingChildren = mark.children || []
    const targetCount = existingChildren.length || Math.min(3, groupValues.length)

    const children = Array.from({ length: targetCount }).map((_, index) => {
      const base = existingChildren[index]
      const value = groupValues[index] ?? groupValues[0] ?? null
      if (!value) {
        return {
          id: base?.id || `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: base?.name || `Mark ${index + 1}`,
          selectedValue: null,
          entities: 0,
          entityIndices: [],
          entitiesDetail: [],
        }
      }
      const idxs = map.get(value) ?? []
      const details = idxs.map(idx => {
        const row = tableData.value[idx] as Record<string, unknown>
        return row[fieldName]
      })
      return {
        id: base?.id || `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: base?.name || `Mark ${index + 1}`,
        selectedValue: value,
        entities: idxs.length,
        entityIndices: idxs,
        entitiesDetail: details,
      }
    })

    markInstanceStore.updateMarkInstance(markId, {
      fieldName,
      fieldType,
      isGroup: true,
      children,
      entityIndices: null,
      entitiesDetail: null,
      entities: 0,
    })
  }
}

function clearMarkField(markId: string) {
  const mark = markInstances.value.find(m => m.id === markId)
  if (!mark) return

  // 保留这一行的结构类型（group / 非 group），只清空绑定字段和实体信息
  if (mark.isGroup) {
    markInstanceStore.updateMarkInstance(markId, {
      fieldName: null,
      fieldType: null,
      entities: 0,
      entityIndices: null,
      entitiesDetail: null,
      // 仍然是 group 容器，只是暂时没有字段和子实例
      children: [],
    })
  } else {
    markInstanceStore.updateMarkInstance(markId, {
      fieldName: null,
      fieldType: null,
      entities: 0,
      entityIndices: null,
      entitiesDetail: null,
      children: [],
    })
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const fieldName = e.dataTransfer?.getData('text/plain')
  const fieldType = e.dataTransfer?.getData('field-type') as 'numeric' | 'categorical'
  const entitiesStr = e.dataTransfer?.getData('entities')
  const variant = e.dataTransfer?.getData('field-variant') || 'field'

  if (!fieldName || !fieldType) return

  const baseEntities = entitiesStr ? Number(entitiesStr) : tableData.value.length
  const isGroup = variant === 'group' && fieldType === 'categorical'

  // 非 group：创建普通 mark 实例
  if (!isGroup) {
    const entityIndices = tableData.value.map((_, idx) => idx)
    const entities = Math.min(entityIndices.length, baseEntities)
    const entitiesDetail = entityIndices.map(idx => {
      const row = tableData.value[idx] as Record<string, unknown>
      return row[fieldName]
    })

    markInstanceStore.addMarkInstance({
      name: `Mark ${markInstances.value.length + 1}`,
      fieldName,
      fieldType,
      isGroup: false,
      children: [],
      entityIndices,
      entities,
      entitiesDetail,
    })
    return
  }

  // group：创建一个父实例 + 默认 3 条子实例
  if (isGroup) {
    const map = new Map<string, number[]>()
    tableData.value.forEach((row, idx) => {
      const raw = (row as Record<string, unknown>)[fieldName]
      if (raw == null) return
      const str = String(raw).trim()
      if (!str) return
      const list = map.get(str) ?? []
      list.push(idx)
      map.set(str, list)
    })

    const groupValues = Array.from(map.keys())

    const defaultCount = Math.min(3, groupValues.length)
    const children = Array.from({ length: defaultCount }).map((_, index) => {
      const value = groupValues[index]
      const idxs = value ? (map.get(value) ?? []) : []
      const details = idxs.map(idx => {
        const row = tableData.value[idx] as Record<string, unknown>
        return row[fieldName]
      })
      return {
        id: `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `Mark ${index + 1}`,
        selectedValue: value ?? null,
        entities: idxs.length,
        entityIndices: idxs,
        entitiesDetail: details,
      }
    })

    markInstanceStore.addMarkInstance({
      name: `Mark Group ${markInstances.value.length + 1}`,
      fieldName,
      fieldType,
      isGroup: true,
      children,
      entities: 0,
      entityIndices: null,
      entitiesDetail: null,
    })
    return
  }
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

      <!-- Mark 列表（内部可纵向滚动） -->
      <div
        v-if="hasMarks"
        class="space-y-2 max-h-[260px] overflow-y-auto pr-1"
      >
        <div
          v-for="mark in markInstances"
          :key="mark.id"
          class="rounded-2xl bg-[var(--primary-light-color)] border border-[var(--border-color)] px-3 py-2 space-y-2"
        >
          <!-- 父实例行 -->
          <div class="flex items-center gap-2">
            <!-- 缩略图：仅非 group 实例显示 -->
            <div
              v-if="!mark.isGroup"
              class="w-10 h-10 rounded-xl bg-white border border-[var(--border-color)] flex items-center justify-center overflow-hidden"
            >
              <img
                src="/default_mark.svg"
                alt=""
                class="w-full h-full object-contain"
              />
            </div>

            <!-- 文本信息 -->
            <div class="flex flex-col min-w-0">
              <!-- group：带折叠箭头的标题 -->
              <div v-if="mark.isGroup" class="flex items-center gap-1">
                <button
                  type="button"
                  class="flex items-center gap-1 text-[14px] font-semibold text-[var(--title-color)] cursor-pointer"
                  @click="toggleGroupRow(mark.id)"
                >
                  <span
                    class="w-3 h-3 flex-shrink-0 transition-transform duration-200 text-[var(--text-muted)]"
                    :class="isGroupRowExpanded(mark.id) ? 'i-carbon-chevron-down' : 'i-carbon-chevron-right'"
                  />
                  <span class="truncate max-w-[160px]">
                    {{ mark.name }}
                  </span>
                </button>
              </div>
              <!-- 非 group：普通标题 -->
              <span
                v-else
                class="text-[14px] font-semibold text-[var(--title-color)] truncate"
              >
                {{ mark.name }}
              </span>
              <!-- 实体数量：仅非 group 显示 -->
              <span
                v-if="!mark.isGroup"
                class="text-[12px] text-[var(--text-muted)]"
              >
                {{ mark.entities }} Entities
              </span>
            </div>

            <div class="flex-1" />

            <!-- 父行右侧字段 pill（支持重新绑定字段） -->
            <div v-if="mark.fieldName" class="flex items-center gap-2">
              <div
                class="group relative px-4 py-1.5 rounded-full text-[13px] flex items-center gap-2 bg-white border border-[var(--border-color)] text-[var(--title-color)] min-w-[160px]"
                @dragover.prevent
                @drop.prevent="handleFieldDropOnMark($event, mark.id)"
              >
                <span class="text-[12px] text-[var(--text-muted)]">
                  {{ mark.fieldType === 'numeric' ? '#' : 'abc' }}
                </span>
                <span class="font-medium truncate max-w-[120px]">{{ mark.fieldName }}</span>
                <span
                  v-if="mark.isGroup"
                  class="ml-1 px-2 py-0.5 rounded-full bg-[var(--primary-light-color)] text-[11px] text-[var(--text-muted)] flex-shrink-0"
                >
                  Group
                </span>
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

            <!-- 删除整个父实例 -->
            <button
              type="button"
              class="ml-1 text-[var(--text-muted)] hover:text-[var(--title-color)] cursor-pointer"
              @click="markInstanceStore.removeMarkInstance(mark.id)"
            >
              <img src="/Icon-Trash.svg" alt="" class="w-6 h-6" />
            </button>
          </div>

          <!-- 子实例列表：仅 group 父实例有，可折叠 -->
          <div v-if="mark.isGroup && mark.fieldName">
            <div v-show="isGroupRowExpanded(mark.id)" class="space-y-1">
              <div
                v-for="child in mark.children"
                :key="child.id"
                class="flex items-center gap-2 bg-white rounded-xl border border-[var(--border-color)] px-3 py-1.5"
              >
                <!-- 子实例 icon -->
                <div class="w-7 h-7 rounded-lg bg-white border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                  <img
                    src="/default_mark.svg"
                    alt=""
                    class="w-full h-full object-contain"
                  />
                </div>

                <!-- 子实例文本 -->
                <div class="flex flex-col min-w-0">
                  <span class="text-[13px] font-semibold text-[var(--title-color)] truncate">
                    {{ child.name }}
                  </span>
                  <span class="text-[11px] text-[var(--text-muted)]">
                    {{ child.entities }} Entities
                  </span>
                </div>

                <div class="flex-1" />

                <!-- 子实例右侧：字段 pill（大小与父一致），内部包含筛选下拉 -->
                <div
                  class="group relative px-4 py-1 rounded-full text-[13px] flex items-center gap-2 bg-[var(--primary-light-color)] border border-[var(--border-color)] text-[var(--title-color)]"
                >
                  <span class="text-[12px] text-[var(--text-muted)]">
                    {{ mark.fieldType === 'numeric' ? '#' : 'abc' }}
                  </span>
                  <span class="font-medium truncate max-w-[80px]">
                    {{ mark.fieldName }}
                  </span>
                  <div class="flex-1" />
                  <div class="relative flex-shrink-0">
                    <select
                      class="appearance-none pl-2 pr-5 py-1 rounded-full bg-white/70 border border-[var(--border-color)] text-[11px] text-[var(--text-muted)] max-w-[66px] cursor-pointer truncate"
                      :value="child.selectedValue || ''"
                      @change="handleGroupValueChange(mark.id, child.id, ($event.target as HTMLSelectElement).value)"
                    >
                      <option
                        v-for="val in Array.from(
                          new Set(
                            tableData
                              .map(row => (row as any)[mark.fieldName!])
                              .filter(v => v != null && String(v).trim() !== ''),
                          ),
                        )"
                        :key="String(val)"
                        :value="String(val)"
                      >
                        {{ String(val) }}
                      </option>
                    </select>
                    <span class="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">
                      ▾
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.marks-upload-area {
  background-color: #efebea;
}
</style>
