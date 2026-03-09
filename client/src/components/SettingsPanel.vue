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

// 每次打开设置面板时，用主画布的当前长宽重置 render_size，
// 然后再在面板里等比缩放（以主画布为基准）
watch(
  currentSlide,
  (sl) => {
    if (!sl) return
    const canvas = collageSeriesStore.canvasRef?.()
    const width = canvas?.width || 1000
    const height = canvas?.height || 1000
    ;(sl as any).render_size = [width, height]
  },
  { immediate: true },
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
      <div class="w-96 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
        <div class="flex items-center justify-between px-4 py-1 bg-[var(--primary-light-color)]">
          <h3 class="text-sm font-medium text-gray-800">Settings</h3>
          <button
            class="text-gray-600 hover:text-gray-800 hover:bg-gray-100 active:bg-gray-200 rounded-md p-1 transition-colors cursor-pointer inline-flex items-center justify-center h-8 w-8"
            aria-label="Close"
            @click="handleClose"
          >
            <div class="i-carbon:close text-lg"></div>
          </button>
        </div>
        <div class="p-4 text-sm text-gray-700">
          <div class="space-y-5">
        <!-- orientation: Element Plus Radio Group -->
        <div class="flex items-center justify-between">
          <label class="text-gray-700 font-medium select-none">orientation</label>
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
            <span class="demonstration text-gray-700 font-medium">iterations</span>
            <span class="text-gray-500">{{ currentSlide?.iterations ?? 150 }}</span>
          </div>
          <el-slider
            :model-value="currentSlide?.iterations ?? 150"
            :min="60"
            :max="500"
            :step="1"
            @update:model-value="(v: number | number[]) => { if (currentSlide) currentSlide.iterations = Array.isArray(v) ? v[0] ?? 150 : v }"
          />
        </div>

        <!-- render_size: 等比缩放主画布尺寸（基于宽度，保持长宽比） -->
        <div class="slider-demo-block">
          <div class="flex items-center justify-between mb-2">
            <span class="demonstration text-gray-700 font-medium">render_size</span>
            <span class="text-gray-500">
              {{
                Array.isArray(currentSlide?.render_size)
                  ? `${currentSlide.render_size[0]} × ${currentSlide.render_size[1]}`
                  : '—'
              }}
            </span>
          </div>
          <el-slider
            :model-value="
              Array.isArray(currentSlide?.render_size)
                ? currentSlide.render_size[0]
                : 1000
            "
            :min="300"
            :max="2000"
            :step="50"
            @update:model-value="(v: number | number[]) => {
              if (!currentSlide) return
              const width = Array.isArray(v) ? v[0] ?? 1000 : v
              const rs = (currentSlide as any).render_size as [number, number] | undefined
              const ratio = rs && rs[0] ? (rs[1] ?? rs[0]) / rs[0] : 1
              const height = Math.round(width * ratio)
              ;(currentSlide as any).render_size = [width, height]
            }"
          />
        </div>

        <!-- rotation: Element Plus Switch -->
        <div class="flex items-center justify-between">
          <label class="text-gray-700 font-medium select-none">rotation</label>
          <el-switch
            :model-value="currentSlide?.rotation ?? true"
            size="small"
            @update:model-value="(v: string | number | boolean) => { if (currentSlide) currentSlide.rotation = Boolean(v) }"
          />
        </div>

        <!-- hole: Element Plus Switch -->
        <div class="flex items-center justify-between">
          <label class="text-gray-700 font-medium select-none">hole</label>
          <el-switch
            :model-value="currentSlide?.hole ?? false"
            size="small"
            @update:model-value="(v: string | number | boolean) => { if (currentSlide) (currentSlide as any).hole = Boolean(v) }"
          />
        </div>

        <!-- margin: Element Plus Slider -->
        <div class="slider-demo-block">
          <div class="flex items-center justify-between mb-2">
            <span class="demonstration text-gray-700 font-medium">margin</span>
            <span class="text-gray-500">{{ currentSlide?.margin ?? 0 }}</span>
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
          <label class="text-gray-700 font-medium select-none">emitter_type</label>
          <el-radio-group
            :model-value="currentSlide?.emitter_type ?? ''"
            size="default"
            @update:model-value="(v: string | number | boolean | undefined) => { if (currentSlide && typeof v === 'string') (currentSlide as any).emitter_type = v }"
          >
            <el-radio value="">空</el-radio>
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
</style>


