<script setup lang="ts">
import { computed, watch } from 'vue'

const props = defineProps<{
  fieldName: string
  tableData: any[]
  valueColors?: Record<string, string> | null
}>()

const emit = defineEmits<{
  (e: 'update:valueColors', value: Record<string, string>): void
}>()

// 更丰富的一组默认类别色（高区分度、偏柔和）
const basePalette = [
  '#FF6B6B', // warm red
  '#FFB347', // warm orange
  '#FFC857', // amber
  '#59C9A5', // teal
  '#4E79FF', // blue
  '#9B5DE5', // purple
  '#F29E4C', // orange-brown
  '#2EC4B6', // cyan-teal
  '#6A4C93', // deep purple
  '#FF8FAB', // soft pink
  '#3F88C5', // steel blue
  '#8AC926', // green
  '#FFCA3A', // yellow
  '#E76F51', // terracotta
  '#118AB2', // deep cyan
  '#F8961E', // vivid orange
]

const categories = computed(() => {
  const counts = new Map<string, number>()
  const data = props.tableData || []
  data.forEach(row => {
    if (!row) return
    const raw = (row as any)[props.fieldName]
    if (raw === undefined || raw === null) return
    const str = String(raw).trim()
    if (!str) return
    counts.set(str, (counts.get(str) ?? 0) + 1)
  })

  const entries = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  const mapping = props.valueColors ?? {}

  return entries.map(([value, count], index) => {
    const existing = mapping[value]
    const color = existing || basePalette[index % basePalette.length]
    return {
      value,
      count,
      color,
    }
  })
})

// 当还没有外部传入的 valueColors 时，用当前类别列表和默认调色板初始化一次映射
watch(
  categories,
  cats => {
    if (props.valueColors && Object.keys(props.valueColors).length > 0) return
    if (!cats.length) return
    const initial: Record<string, string> = {}
    cats.forEach(item => {
      initial[item.value] = item.color
    })
    emit('update:valueColors', initial)
  },
  { immediate: true }
)

function updateColor(value: string, color: string) {
  const next: Record<string, string> = {
    ...(props.valueColors ?? {}),
  }
  next[value] = color
  emit('update:valueColors', next)
}
</script>

<template>
  <div class="cat-list">
    <div
      v-for="item in categories"
      :key="item.value"
      class="cat-row"
    >
      <div class="cat-left">
        <input
          type="color"
          class="cat-color-input"
          :value="item.color"
          @input="updateColor(item.value, ($event.target as HTMLInputElement).value)"
        />
        <span class="cat-label">
          {{ item.value }}
        </span>
      </div>
      <div class="cat-right">
        <span class="cat-entities">
          {{ item.count }} Entities
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cat-list {
  margin-top: 4px;
  border-radius: 12px;
  background-color: #ffffff;
  border: 1px solid #e9ddd6;
  padding: 8px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 180px;
  overflow-y: auto;
}

.cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.cat-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cat-color-input {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.cat-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.cat-color-input::-webkit-color-swatch { 
  border: none;
  width: 100%;
  height: 100%;
}

.cat-color-input::-moz-color-swatch {
  border-radius: 4px;
  border: none;
  width: 100%;
  height: 100%;
}

.cat-label {
  font-size: 12px;
  color: #5b4a40;
}

.cat-right {
  font-size: 11px;
  color: #8f837c;
}

.cat-entities {
  white-space: nowrap;
}
</style>

