<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCollageSeriesStore } from '~/stores/collageSeries'

type Orientation = 'free' | 'center'

const props = defineProps<{ overviewIdx: number, slideIdx: number, coords?: { left: number, top: number } }>()
const emit = defineEmits<{ (e:'close'): void }>()

const collageSeriesStore = useCollageSeriesStore()
const { overviews } = storeToRefs(collageSeriesStore)

const panelRef = ref<HTMLElement | null>(null)
const panelSize = ref({ width: 384, height: 500 }) // 默认尺寸

const handleGlobalClick = (e: MouseEvent) => {
  const target = e.target as Node
  if (panelRef.value && !panelRef.value.contains(target)) emit('close')
}

onMounted(async () => {
  window.addEventListener('click', handleGlobalClick)
  // 获取面板实际尺寸
  await nextTick()
  if (panelRef.value) {
    const rect = panelRef.value.getBoundingClientRect()
    panelSize.value = { width: rect.width, height: rect.height }
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('click', handleGlobalClick)
})

const currentSlide = computed(() => {
  const ov = overviews.value[props.overviewIdx]
  const sl = ov?.collageSeries?.[props.slideIdx]
  return (sl as any) || null
})

// 第一张 collage 不允许被“打孔/开洞”
const isFirstCollage = computed(() => props.slideIdx === 0)

// 同步数据层：避免之前已开洞的数据在 UI 禁用后仍参与计算
watch(
  currentSlide,
  (slide) => {
    if (slide && isFirstCollage.value) (slide as any).hole = false
  },
  { immediate: true }
)

// 直接通过 store 的 overviews 修改对应 slide 字段，避免中间 computed 包装

const coordsStyle = computed(() => {
  const padding = 16 // 距离边缘的最小间距
  const panelWidth = panelSize.value.width
  const panelHeight = panelSize.value.height
  
  let left = props.coords?.left ?? 0
  let top = props.coords?.top ?? 0
  
  // 获取视口尺寸
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // 因为使用了 -translate-x-full，面板会向左偏移自身宽度
  // 所以实际显示位置是 left - panelWidth
  const actualLeft = left - panelWidth
  
  // 检测右边界：如果面板超出右边界，调整位置
  if (left > viewportWidth - padding) {
    left = viewportWidth - padding
  }
  
  // 检测左边界：如果面板超出左边界，调整位置
  if (actualLeft < padding) {
    left = padding + panelWidth
  }
  
  // 检测下边界：如果面板超出下边界，调整位置
  if (top + panelHeight > viewportHeight - padding) {
    top = Math.max(padding, viewportHeight - panelHeight - padding)
  }
  
  // 检测上边界：如果面板超出上边界，调整位置
  if (top < padding) {
    top = padding
  }
  
  return {
    left: left + 'px',
    top: top + 'px'
  }
})

const handleClose = () => emit('close')
</script>

<template>
  <teleport to="body">
    <div 
      class="fixed z-[9999] -translate-x-full"
      :style="coordsStyle"
      ref="panelRef"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <div
        class="settings-panel w-96 bg-white border border-[var(--border-color)] rounded-lg shadow-lg overflow-hidden"
      >
        <div
          class="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)] bg-[var(--primary-muted-color)]"
        >
          <h3 class="text-sm font-semibold text-gray-800">Settings</h3>
          <button
            class="text-[var(--text-muted)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-light-color)] active:bg-[var(--border-color)]/40 rounded-md p-1 transition-colors cursor-pointer inline-flex items-center justify-center h-8 w-8"
            aria-label="Close"
            @click="handleClose"
          >
            <div class="i-carbon:close text-lg"></div>
          </button>
        </div>
        <div class="p-4 text-sm text-[var(--title-color)] bg-[var(--primary-light-color)]">
          <div class="space-y-5">
        <!-- orientation: Element Plus Radio Group -->
        <div class="flex items-center justify-between">
          <label class="text-[var(--title-color)] font-medium select-none">orientation</label>
          <el-radio-group
            :model-value="currentSlide?.orientation ?? 'free'"
            size="default"
            @update:model-value="(v: string | number | boolean | undefined) => { if (currentSlide && (v === 'free' || v === 'center')) currentSlide.orientation = v as Orientation }"
          >
            <el-radio value="free">free</el-radio>
            <el-radio value="center">center</el-radio>
          </el-radio-group>
        </div>

        <!-- iterations: Element Plus Slider -->
        <div class="slider-demo-block">
          <div class="flex items-center justify-between mb-2">
            <span class="demonstration text-[var(--title-color)] font-medium">iterations</span>
            <span class="text-[var(--primary-color)] font-medium tabular-nums">{{ currentSlide?.iterations ?? 180 }}</span>
          </div>
          <el-slider
            :model-value="currentSlide?.iterations ?? 180"
            :min="80"
            :max="500"
            :step="1"
            @update:model-value="(v: number | number[]) => { if (currentSlide) currentSlide.iterations = Array.isArray(v) ? v[0] ?? 180 : v }"
          />
        </div>

        <!-- rotation: Element Plus Switch -->
        <div class="flex items-center justify-between">
          <label class="text-[var(--title-color)] font-medium select-none">rotation</label>
          <el-switch
            :model-value="currentSlide?.rotation ?? true"
            size="small"
            @update:model-value="(v: string | number | boolean) => { if (currentSlide) currentSlide.rotation = Boolean(v) }"
          />
        </div>

        <!-- hole: Element Plus Switch -->
        <div class="flex items-center justify-between">
          <label class="text-[var(--title-color)] font-medium select-none">block</label>
          <el-switch
            :model-value="currentSlide?.hole ?? false"
            size="small"
            :disabled="isFirstCollage"
            @update:model-value="(v: string | number | boolean) => { if (currentSlide) (currentSlide as any).hole = Boolean(v) }"
          />
        </div>

        <!-- margin: Element Plus Slider -->
        <div class="slider-demo-block">
          <div class="flex items-center justify-between mb-2">
            <span class="demonstration text-[var(--title-color)] font-medium">margin</span>
            <span class="text-[var(--primary-color)] font-medium tabular-nums">{{ currentSlide?.margin ?? 0 }}</span>
          </div>
          <el-slider
            :model-value="currentSlide?.margin ?? 0"
            :min="0"
            :max="20"
            :step="1"
            @update:model-value="(v: number | number[]) => { if (currentSlide) (currentSlide as any).margin = Array.isArray(v) ? v[0] ?? 0 : v }"
          />
        </div>

        <!-- emitter_type: Element Plus Radio Group -->
        <div class="flex items-center justify-between">
          <label class="text-[var(--title-color)] font-medium select-none">emitter_type</label>
          <el-radio-group
            :model-value="currentSlide?.emitter_type ?? ''"
            size="default"
            @update:model-value="(v: string | number | boolean | undefined) => { if (currentSlide && typeof v === 'string') (currentSlide as any).emitter_type = v }"
          >
            <el-radio value="">default</el-radio>
            <el-radio value="1D">1D</el-radio>
            <el-radio value="2D">2D</el-radio>
          </el-radio-group>
        </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
/* 与全局主题色（main.css --primary-color）一致，作用于本面板内 Element Plus 控件 */
.settings-panel {
  --el-color-primary: var(--primary-color);
}
</style>


