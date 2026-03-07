<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTableStore } from '~/stores/table'
import { useMarkInstanceStore } from '~/stores/markInstance'

const isExpanded = ref(true)

const tableStore = useTableStore()
const { tableData } = storeToRefs(tableStore)

const markInstanceStore = useMarkInstanceStore()
const { markInstances, selectedMarkForDetail } = storeToRefs(markInstanceStore)

function openMarkDetail(markId: string) {
  markInstanceStore.setSelectedMarkForDetail({ type: 'singleInstance', markId })
}

function openMarkChildDetail(parentMarkId: string, childId: string) {
  markInstanceStore.setSelectedMarkForDetail({ type: 'childInstance', parentMarkId, childId })
}

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

/** 创建自定义拖拽图像内容（只显示图案，用于 ghost 跟随光标，避免浏览器强制半透明） */
function createSimpleDragImage(thumbnail: string): HTMLDivElement {
  const dragDiv = document.createElement('div')
  dragDiv.style.cssText = `
    width: 80px;
    height: 80px;
    padding: 8px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  `
  const img = document.createElement('img')
  img.src = thumbnail
  img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; border-radius: 4px;'
  dragDiv.appendChild(img)
  return dragDiv
}

function onMarkDragStart(e: DragEvent, mark: any) {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('mark-instance-id', mark.id)

  // 用 1x1 透明图隐藏系统拖拽图（浏览器会强制半透明），用 ghost div 跟随光标实现完全不透明
  const transparent = document.createElement('canvas')
  transparent.width = 1
  transparent.height = 1
  transparent.style.cssText = 'position:absolute;left:-9999px;top:0;'
  document.body.appendChild(transparent)
  e.dataTransfer.setDragImage(transparent, 0, 0)

  const offsetX = 10
  const offsetY = 10
  const ghost = document.createElement('div')
  ghost.style.cssText = `
    position: fixed;
    left: ${e.clientX - offsetX}px;
    top: ${e.clientY - offsetY}px;
    z-index: 2147483647;
    pointer-events: none;
    opacity: 1;
  `
  ghost.appendChild(createSimpleDragImage(mark.markerThumbnail || '/default_mark.svg'))
  document.body.appendChild(ghost)

  const dragEl = e.currentTarget as HTMLElement
  function moveGhost(ev: DragEvent) {
    ghost.style.left = `${ev.clientX - offsetX}px`
    ghost.style.top = `${ev.clientY - offsetY}px`
  }
  function cleanup() {
    ghost.remove()
    transparent.remove()
    dragEl.removeEventListener('drag', moveGhost)
    dragEl.removeEventListener('dragend', cleanup)
  }
  dragEl.addEventListener('drag', moveGhost)
  dragEl.addEventListener('dragend', cleanup)
}

function handleGroupValueChange(parentId: string, childId: string, value: string) {
  const parent = markInstances.value.find(m => m.id === parentId)
  if (!parent || !parent.fieldName || !parent.isGroup) return

  const fieldName = parent.fieldName

  // 计算这个子实例对应的行索引
  const indices: number[] = []
  tableData.value.forEach((row, idx) => {
    const raw = (row as Record<string, string | number | null>)[fieldName]
    if (raw == null) return
    const str = String(raw).trim()
    if (str === value) {
      indices.push(idx)
    }
  })

  const newChildren = (parent.children || []).map(child => {
    if (child.id !== childId) return child
    return {
      ...child,
      selectedValue: value,
      entityIndices: indices,
      entities: indices.length,
    }
  })

  markInstanceStore.updateMarkInstance(parentId, {
    children: newChildren,
    entityIndices: null,
    entities: 0,
  })
}

function handleRemoveGroupChild(parentId: string, childId: string) {
  const parent = markInstances.value.find(m => m.id === parentId)
  if (!parent || !parent.isGroup) return

  const nextChildren = (parent.children || []).filter(child => child.id !== childId)

  // 如果当前详情面板正打开这个子实例，也一并清空
  const sel = selectedMarkForDetail.value
  if (sel && sel.type === 'childInstance' && sel.parentMarkId === parentId && sel.childId === childId) {
    markInstanceStore.clearSelectedMarkForDetail()
  }

  markInstanceStore.updateMarkInstance(parentId, {
    children: nextChildren,
  })
}

function handleAddGroupChild(parentId: string) {
  const parent = markInstances.value.find(m => m.id === parentId)
  if (!parent || !parent.isGroup || !parent.fieldName) return

  const fieldName = parent.fieldName

  // 基于当前 fieldName 构建 value -> 行索引列表的映射
  const map = new Map<string, number[]>()
  tableData.value.forEach((row, idx) => {
    const raw = (row as Record<string, string | number | null>)[fieldName]
    if (raw == null) return
    const str = String(raw).trim()
    if (!str) return
    const list = map.get(str) ?? []
    list.push(idx)
    map.set(str, list)
  })

  const groupValues = Array.from(map.keys())
  const nextChildren = parent.children ? [...parent.children] : []

  // 找一个当前 children 还未使用的分组值，作为新 child 的默认值
  const usedValues = new Set(
    nextChildren
      .map(c => (c.selectedValue != null ? String(c.selectedValue) : null))
      .filter((v): v is string => v !== null),
  )

  let chosenValue: string | null = null
  for (const v of groupValues) {
    if (!usedValues.has(v)) {
      chosenValue = v
      break
    }
  }
  if (!chosenValue && groupValues.length > 0) {
    chosenValue = groupValues[0]
  }

  const indices = chosenValue ? map.get(chosenValue) ?? [] : []
  const entities = indices.length

  const index = nextChildren.length
  const newChild = {
    id: `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Mark ${index + 1}`,
    selectedValue: chosenValue,
    entities,
    entityIndices: indices,
  }

  nextChildren.push(newChild)

  markInstanceStore.updateMarkInstance(parentId, {
    children: nextChildren,
  })
}

function handleFieldDropOnMark(e: DragEvent, markId: string) {
  e.preventDefault()
  const fieldName = e.dataTransfer?.getData('text/plain')
  const fieldType = e.dataTransfer?.getData('field-type') as 'numeric' | 'categorical'
  const variant = e.dataTransfer?.getData('field-variant') || 'field'

  if (!fieldName || !fieldType) return

  const mark = markInstances.value.find(m => m.id === markId)
  if (!mark) return

  const isGroupDrop = variant === 'group' && fieldType === 'categorical'

  // 只有同类才能互相 drop
  if (mark.isGroup && !isGroupDrop) return
  if (!mark.isGroup && isGroupDrop) return

  // 非 group：根据该字段非空行精确计算实体索引
  if (!mark.isGroup) {
    const entityIndices: number[] = []
    tableData.value.forEach((row, idx) => {
      const raw = (row as Record<string, string | number | null>)[fieldName]
      if (raw == null) return
      const str = String(raw).trim()
      if (!str) return
      entityIndices.push(idx)
    })
    const entities = entityIndices.length

    markInstanceStore.updateMarkInstance(markId, {
      fieldName,
      fieldType,
      isGroup: false,
      children: [],
      entityIndices,
      entities,
    })
    return
  }

  // group：这一行是 group 父实例，需要根据字段值分组，并为现有 children 重新分配 value
  if (mark.isGroup) {
    const map = new Map<string, number[]>()
    tableData.value.forEach((row, idx) => {
      const raw = (row as Record<string, string | number | null>)[fieldName]
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
        }
      }
      const idxs = map.get(value) ?? []
      return {
        id: base?.id || `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: base?.name || `Mark ${index + 1}`,
        selectedValue: value,
        entities: idxs.length,
        entityIndices: idxs,
      }
    })

    markInstanceStore.updateMarkInstance(markId, {
      fieldName,
      fieldType,
      isGroup: true,
      children,
      entityIndices: null,
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
      // 仍然是 group 容器，只是暂时没有字段和子实例
      children: [],
    })
  } else {
    markInstanceStore.updateMarkInstance(markId, {
      fieldName: null,
      fieldType: null,
      entities: 0,
      entityIndices: null,
      children: [],
    })
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const fieldName = e.dataTransfer?.getData('text/plain')
  const fieldType = e.dataTransfer?.getData('field-type') as 'numeric' | 'categorical'
  const variant = e.dataTransfer?.getData('field-variant') || 'field'

  if (!fieldName || !fieldType) return

  const isGroup = variant === 'group' && fieldType === 'categorical'

  // 非 group：创建普通 mark 实例
  if (!isGroup) {
    const entityIndices: number[] = []
    tableData.value.forEach((row, idx) => {
      const raw = (row as Record<string, string | number | null>)[fieldName]
      if (raw == null) return
      const str = String(raw).trim()
      if (!str) return
      entityIndices.push(idx)
    })
    const entities = entityIndices.length

    markInstanceStore.addMarkInstance({
      name: `Mark ${markInstances.value.length + 1}`,
      fieldName,
      fieldType,
      isGroup: false,
      children: [],
      entityIndices,
      entities,
    })
    return
  }

  // group：创建一个父实例 + 默认 3 条子实例
  if (isGroup) {
    const map = new Map<string, number[]>()
    tableData.value.forEach((row, idx) => {
      const raw = (row as Record<string, string | number | null>)[fieldName]
      if (raw == null) return
      const str = String(raw).trim()
      if (!str) return
      const list = map.get(str) ?? []
      list.push(idx)
      map.set(str, list)
    })
    console.log(map)
    const groupValues = Array.from(map.keys())

    const defaultCount = Math.min(3, groupValues.length)
    const children = Array.from({ length: defaultCount }).map((_, index) => {
      const value = groupValues[index]
      const idxs = value ? (map.get(value) ?? []) : []
      return {
        id: `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `Mark ${index + 1}`,
        selectedValue: value ?? null,
        entities: idxs.length,
        entityIndices: idxs,
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
  <div class="border-b border-[var(--border-color)] flex flex-col min-h-0 bg-[var(--primary-light-color)]">
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
        class="space-y-2 max-h-[260px] overflow-y-auto"
      >
        <div
          v-for="mark in markInstances"
          :key="mark.id"
          class="rounded-2xl bg-[var(--primary-light-color)] border border-[var(--border-color)] px-3 py-2 space-y-2"
        >
          <!-- 父实例行 -->
          <div
            class="flex items-center gap-2"
            :class="{ 'cursor-pointer': !mark.isGroup }"
            draggable="true"
            @dragstart.stop="onMarkDragStart($event, mark)"
            @click="!mark.isGroup && openMarkDetail(mark.id)"
          >
            <!-- 非 group：整行可点，仅右侧删除/拖放不触发 -->
            <template v-if="!mark.isGroup">
              <div class="flex items-center gap-2 min-w-0 rounded-lg hover:bg-[var(--border-color)]/10 transition-colors -m-1 p-1 flex-1 min-w-0">
                <div
                  class="w-10 h-10 rounded-xl bg-white border border-[var(--border-color)] flex items-center justify-center overflow-hidden flex-shrink-0"
                >
                  <img
                    :src="mark.markerThumbnail || '/default_mark.svg'"
                    alt=""
                    class="w-full h-full object-contain"
                  />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-[14px] font-semibold text-[var(--title-color)] truncate">
                    {{ mark.name }}
                  </span>
                  <span class="text-[12px] text-[var(--text-muted)] whitespace-nowrap">
                    {{ mark.entities }} Entities
                  </span>
                </div>
              </div>
            </template>

            <!-- group：带折叠箭头的标题（仅标题区，不整行打开详情） -->
            <div v-else class="flex flex-col min-w-0">
              <div class="flex items-center gap-1">
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
            </div>

            <div class="flex-1" />

            <!-- 父行右侧字段 pill（支持重新绑定字段） -->
            <div v-if="mark.fieldName" class="flex items-center gap-2" @click.stop>
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
            <div v-else class="flex items-center" @click.stop>
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
              @click.stop="markInstanceStore.removeMarkInstance(mark.id)"
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
                class="flex items-center gap-2 bg-white rounded-xl border border-[var(--border-color)] px-3 py-1.5 cursor-pointer hover:bg-[var(--border-color)]/10 transition-colors"
                role="button"
                tabindex="0"
                @click.stop="openMarkChildDetail(mark.id, child.id)"
                @keydown.enter.stop="openMarkChildDetail(mark.id, child.id)"
              >
                <!-- 子实例 icon -->
                <div class="w-7 h-7 rounded-lg bg-white border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                  <img
                    :src="child.markerThumbnail || mark.markerThumbnail || '/default_mark.svg'"
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
                      @click.stop
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

                <!-- 删除子实例按钮：圆形叉号 -->
                <button
                  type="button"
                  class="ml-1 flex items-center justify-center w-5 h-5 rounded-full border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--title-color)] hover:bg-[var(--border-color)]/10 cursor-pointer transition-colors"
                  @click.stop="handleRemoveGroupChild(mark.id, child.id)"
                >
                  <span class="i-carbon-close text-xs leading-none" />
                </button>
              </div>

              <!-- 添加子实例按钮：卡片风格，暗背景 + 虚线边框，中间加号 -->
              <button
                type="button"
                class="mt-1 w-full flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-color)] bg-[var(--border-color)]/10 px-3 py-2 text-[12px] text-[var(--text-muted)] hover:bg-[var(--border-color)]/20 hover:text-[var(--title-color)] cursor-pointer transition-colors"
                @click.stop="handleAddGroupChild(mark.id)"
              >
                <span class="i-carbon-add text-base mr-1" />
                <span></span>
              </button>
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
