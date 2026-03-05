<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMarkInstanceStore, type ColorStop } from '~/stores/markInstance'
import { useTableStore } from '~/stores/table'
import MarkerCanvasArea from './MarkerCanvasArea.vue'
import MarkerToolbar from './MarkerToolbar.vue'
import NumericColorStopsEditor from './NumericColorStopsEditor.vue'
import CategoricalColorEditor from './CategoricalColorEditor.vue'

const markInstanceStore = useMarkInstanceStore()
const { markInstances, selectedMarkForDetail } = storeToRefs(markInstanceStore)

const tableStore = useTableStore()
const { tableData } = storeToRefs(tableStore)

const currentMark = computed(() => {
  const sel = selectedMarkForDetail.value
  if (!sel) return null
  if (sel.type === 'singleInstance') {
    return markInstances.value.find(x => x.id === sel.markId) ?? null
  }
  const parent = markInstances.value.find(x => x.id === sel.parentMarkId) ?? null
  return parent
})

const currentChild = computed(() => {
  const sel = selectedMarkForDetail.value
  if (!sel || sel.type !== 'childInstance') return null
  const parent = markInstances.value.find(x => x.id === sel.parentMarkId) ?? null
  if (!parent) return null
  return parent.children?.find(c => c.id === sel.childId) ?? null
})

const currentEncoding = computed(() => {
  const sel = selectedMarkForDetail.value
  if (!sel) return null
  if (sel.type === 'childInstance') {
    const child = currentChild.value as any
    return child?.encoding ?? null
  }
  const m = currentMark.value as any
  return m?.encoding ?? null
})

const displayName = computed(() => {
  const sel = selectedMarkForDetail.value
  if (!sel) return ''
  if (sel.type === 'singleInstance') {
    const m = markInstances.value.find(x => x.id === sel.markId)
    return m?.name ?? 'Mark'
  }
  const parent = markInstances.value.find(x => x.id === sel.parentMarkId)
  const child = parent?.children?.find(c => c.id === sel.childId)
  return child?.name ?? parent?.name ?? 'Mark'
})

const encodingChannelKey: Record<string, 'color' | 'size' | 'width' | 'height'> = {
  Color: 'color',
  Size: 'size',
  Width: 'width',
  Height: 'height',
}

// 判断某个字段在当前数据中是否数值型（逻辑与 DataSection 保持一致）
function isNumericField(fieldName: string | undefined | null): boolean {
  if (!fieldName) return false
  if (!tableData.value.length) return false
  const sample = tableData.value
    .slice(0, 50)
    .map(row => (row as any)[fieldName])
    .filter(v => v != null && String(v).trim() !== '')
  if (sample.length === 0) return false
  const allNumeric = sample.every(v => /^-?\d+(\.\d+)?$/.test(String(v).trim()))
  return allNumeric
}

const currentColorFieldName = computed(() => {
  const enc = currentEncoding.value as any
  return enc?.color ?? null
})

// 当前 Color 通道是否绑定了数值型字段
const isColorNumeric = computed(() => isNumericField(currentColorFieldName.value))

// 数值型颜色映射的颜色停靠点（如果没有显式配置，则使用固定默认色带）
const colorStops = computed<ColorStop[]>({
  get() {
    const defaultStops: ColorStop[] = [
      { position: 0, color: '#A7C8FB', opacity: 1 },
      { position: 1, color: '#5592F9', opacity: 1 },
    ]

    const sel = selectedMarkForDetail.value
    if (!sel) {
      return defaultStops
    }

    let rawStops: ColorStop[] | undefined
    if (sel.type === 'childInstance') {
      const parent = markInstances.value.find(x => x.id === sel.parentMarkId) as any
      const child = parent?.children?.find((c: any) => c.id === sel.childId)
      rawStops = (child?.colorStops as ColorStop[] | undefined) || (parent?.colorStops as ColorStop[] | undefined)
    } else {
      const m = markInstances.value.find(x => x.id === sel.markId) as any
      rawStops = m?.colorStops as ColorStop[] | undefined
    }

    if (!rawStops || rawStops.length === 0) {
      return defaultStops
    }

    return [...rawStops]
      .map(stop => ({
        position: Math.min(1, Math.max(0, stop.position)),
        color: stop.color || '#ffffff',
        opacity: stop.opacity == null ? 1 : Math.min(1, Math.max(0, stop.opacity)),
      }))
      .sort((a, b) => a.position - b.position)
  },
  set(nextStops: ColorStop[]) {
    const sel = selectedMarkForDetail.value
    if (!sel) return

    const sanitized = [...nextStops]
      .map(stop => ({
        position: Math.min(1, Math.max(0, stop.position)),
        color: stop.color || '#ffffff',
        opacity: stop.opacity == null ? 1 : Math.min(1, Math.max(0, stop.opacity)),
      }))
      .sort((a, b) => a.position - b.position)

    if (sel.type === 'childInstance') {
      markInstanceStore.updateChildInstance(sel.parentMarkId, sel.childId, {
        colorStops: sanitized,
      } as any)
    } else {
      markInstanceStore.updateMarkInstance(sel.markId, {
        colorStops: sanitized,
      } as any)
    }
  },
})

const categoricalColors = computed<Record<string, string> | null>({
  get() {
    const sel = selectedMarkForDetail.value
    if (!sel) return null
    if (sel.type === 'childInstance') {
      const parent = markInstances.value.find(x => x.id === sel.parentMarkId) as any
      const child = parent?.children?.find((c: any) => c.id === sel.childId)
      return (child?.categoricalColors as Record<string, string> | undefined) ||
        (parent?.categoricalColors as Record<string, string> | undefined) ||
        null
    }
    const m = markInstances.value.find(x => x.id === sel.markId) as any
    return (m?.categoricalColors as Record<string, string> | undefined) || null
  },
  set(next) {
    const sel = selectedMarkForDetail.value
    if (!sel) return
    if (sel.type === 'childInstance') {
      markInstanceStore.updateChildInstance(sel.parentMarkId, sel.childId, {
        categoricalColors: next || undefined,
      } as any)
    } else {
      markInstanceStore.updateMarkInstance(sel.markId, {
        categoricalColors: next || undefined,
      } as any)
    }
  },
})

function handleEncodingDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function handleEncodingDrop(e: DragEvent, channelLabel: 'Color' | 'Size' | 'Width' | 'Height') {
  e.preventDefault()
  const column = e.dataTransfer?.getData('text/plain')
  if (!column) return

  const sel = selectedMarkForDetail.value
  if (!sel) return

  const key = encodingChannelKey[channelLabel]
  // 目前约束：同一 Mark / 子实例 只允许一个 channel 生效
  const isColorChannel = channelLabel === 'Color'
  // 对 Color 通道，根据字段数据类型预先写入 colorMode，数值型 -> numeric，其他 -> categorical
  const nextEncoding: any = {
    [key]: column,
  }
  if (isColorChannel) {
    nextEncoding.colorMode = isNumericField(column) ? 'numeric' : 'categorical'
  }

  const defaultStops: ColorStop[] = [
    { position: 0, color: '#A7C8FB', opacity: 1 },
    { position: 1, color: '#5592F9', opacity: 1 },
  ]

  if (sel.type === 'childInstance') {
    // 子实例：单独管理 encoding
    const parent = markInstances.value.find(m => m.id === sel.parentMarkId)
    const child = parent?.children?.find(c => c.id === sel.childId) as any
    const payload: any = {
      encoding: nextEncoding,
    }
    // 如果是 Color 通道且还没有设置过色带，则写入默认色带，保证 drop 时有颜色
    if (isColorChannel && !child?.colorStops) {
      payload.colorStops = defaultStops
    }
    markInstanceStore.updateChildInstance(sel.parentMarkId, sel.childId, payload)
  } else {
    // 非 group 或父实例
    const mark = markInstances.value.find(m => m.id === sel.markId) as any
    const payload: any = {
      encoding: nextEncoding,
    }
    if (isColorChannel && !mark?.colorStops) {
      payload.colorStops = defaultStops
    }
    markInstanceStore.updateMarkInstance(sel.markId, payload)
  }
}

function close() {
  markInstanceStore.clearSelectedMarkForDetail()
}
</script>

<template>
  <aside
    class="h-full w-full flex flex-col min-h-0 overflow-hidden border border-[var(--border-color)] bg-[var(--primary-muted-color)] space-y-2"
  >
    <!-- Visual Encoding：卡片 -->
    <div class="space-y-2 bg-[var(--primary-light-color)] shadow-sm px-3 py-3">
      <div class="flex items-center justify-between">
        <span class="text-sm font-bold text-[var(--title-color)]">Visual Encoding</span>
        <button
          type="button"
          class="p-1 rounded hover:bg-[var(--border-color)]/20 text-[var(--text-muted)] hover:text-[var(--title-color)]"
          title="刷新"
        >
          <span class="i-carbon-renew text-base" />
        </button>
      </div>
      <div class="flex flex-col gap-2">
        <div
          v-for="channel in ['Color', 'Size', 'Width', 'Height']"
          :key="channel"
          class="flex flex-col gap-1 rounded-lg bg-[var(--border-color)]/40 border border-[var(--border-color)] px-3 py-1 min-h-[48px]"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-[var(--title-color)] shrink-0 w-16">{{ channel }}</span>
            <div
              class="ml-auto shrink-0 w-[220px] rounded-full border-2 border-dashed border-[var(--border-color)] bg-white py-1.5 px-3 flex items-center justify-center min-h-[36px] gap-2"
              @dragover="handleEncodingDragOver"
              @drop="handleEncodingDrop($event, channel as 'Color' | 'Size' | 'Width' | 'Height')"
            >
              <span
                v-if="currentEncoding && currentEncoding[encodingChannelKey[channel]]"
                class="text-xs font-medium text-[var(--title-color)] truncate"
              >
                {{ currentEncoding[encodingChannelKey[channel]] }}
              </span>
              <span
                v-else
                class="text-xs font-bold text-[var(--text-muted)]/70"
              >
                Drop Fields Here
              </span>
            </div>
          </div>

          <!-- 颜色通道下方：根据字段类型切换不同取色器 -->
          <template v-if="channel === 'Color' && currentEncoding && currentEncoding[encodingChannelKey[channel]]">
            <!-- 数值型字段：多色阶渐变编辑器（独立组件） -->
            <div v-if="isColorNumeric" class="pl-1 pr-1 pb-1">
              <NumericColorStopsEditor
                :stops="colorStops"
                @update:stops="colorStops = $event"
              />
            </div>

            <!-- 分类型字段：类别列表取色（独立组件） -->
            <div v-else class="pl-1 pr-1 pb-1">
              <CategoricalColorEditor
                v-if="currentColorFieldName"
                :field-name="currentColorFieldName"
                :table-data="tableData"
                :value-colors="categoricalColors || undefined"
                @update:valueColors="categoricalColors = $event"
              />
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Mark 编辑面板 -->
    <div class="flex-1 min-h-0 bg-[var(--primary-light-color)] px-4 py-3 flex flex-col gap-3 overflow-hidden">
      <!-- 顶部标题 + 工具栏 -->
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-[var(--title-color)] truncate">
          {{ displayName }}
        </span>
        <div class="px-2 py-1 border border-[#f0e6e0] rounded-full bg-white/80 shadow-sm">
          <MarkerToolbar />
        </div>
      </div>

      <!-- 画布区域 -->
      <div class="flex-1 min-h-0 rounded-2xl bg-white border border-[#f3e9e3] overflow-hidden">
        <MarkerCanvasArea :show-toolbar="false" class="h-full w-full" />
      </div>
    </div>
  </aside>
</template>
