<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, defineProps, defineEmits } from 'vue'
import { storeToRefs } from 'pinia'
import { useCollageSeriesStore } from '~/stores/collageSeries'

type Orientation = 'free' | 'center'

const props = defineProps<{ overviewIdx: number, slideIdx: number, coords?: { left: number, top: number } }>()
const emit = defineEmits<{ (e:'close'): void }>()

const collageSeriesStore = useCollageSeriesStore()
const { overviews } = storeToRefs(collageSeriesStore)

const panelRef = ref<HTMLElement | null>(null)
const handleGlobalClick = (e: MouseEvent) => {
  const target = e.target as Node
  if (panelRef.value && !panelRef.value.contains(target)) emit('close')
}
onMounted(() => {
  window.addEventListener('click', handleGlobalClick)
})
onBeforeUnmount(() => {
  window.removeEventListener('click', handleGlobalClick)
})

const currentSlide = computed(() => {
  const ov = overviews.value[props.overviewIdx]
  const sl = ov?.collageSeries?.[props.slideIdx]
  return sl as any || null
})

// 直接通过 store 的 overviews 修改对应 slide 字段，避免中间 computed 包装

const coordsStyle = computed(() => ({
  left: ((props.coords?.left ?? 0) + 0) + 'px',
  top: ((props.coords?.top ?? 0) + 0) + 'px'
}))

const handleClose = () => emit('close')
</script>

<template>
  <teleport to="body">
    <div 
      class="fixed z-[1000] -translate-x-full"
      :style="coordsStyle"
      ref="panelRef"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <div class="w-96 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
        <div class="flex items-center justify-between px-4 py-1 border-b border-gray-200 bg-gray-50">
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
            @update:model-value="(v: Orientation) => { if (currentSlide) currentSlide.orientation = v }"
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
            @update:model-value="(v:number) => { if (currentSlide) currentSlide.iterations = v }"
          />
        </div>

        <!-- render_size: Element Plus Slider -->
        <div class="slider-demo-block">
          <div class="flex items-center justify-between mb-2">
            <span class="demonstration text-gray-700 font-medium">render_size</span>
            <span class="text-gray-500">{{ currentSlide?.render_size ?? 1000 }}</span>
          </div>
          <el-slider
            :model-value="currentSlide?.render_size ?? 1000"
            :min="300"
            :max="1000"
            :step="100"
            show-stops
            @update:model-value="(v:number) => { if (currentSlide) currentSlide.render_size = v }"
          />
        </div>

        <!-- rotation: Element Plus Switch -->
        <div class="flex items-center justify-between">
          <label class="text-gray-700 font-medium select-none">rotation</label>
          <el-switch
            :model-value="currentSlide?.rotation ?? true"
            size="small"
            @update:model-value="(v:boolean) => { if (currentSlide) currentSlide.rotation = v }"
          />
        </div>

        <!-- hole: Element Plus Switch -->
        <div class="flex items-center justify-between">
          <label class="text-gray-700 font-medium select-none">hole</label>
          <el-switch
            :model-value="currentSlide?.hole ?? false"
            size="small"
            @update:model-value="(v:boolean) => { if (currentSlide) (currentSlide as any).hole = v }"
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
            @update:model-value="(v:number) => { if (currentSlide) (currentSlide as any).margin = v }"
          />
        </div>

        <!-- emitter_type: Element Plus Radio Group -->
        <div class="flex items-center justify-between">
          <label class="text-gray-700 font-medium select-none">emitter_type</label>
          <el-radio-group
            :model-value="currentSlide?.emitter_type ?? ''"
            size="default"
            @update:model-value="(v: string) => { if (currentSlide) (currentSlide as any).emitter_type = v }"
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


