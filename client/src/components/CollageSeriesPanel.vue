<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useAnimationStore } from '~/stores/animation'
import { useSelectedModeStore } from '~/stores/selectedMode'

const selectedModeStore = useSelectedModeStore()

const collageSeriesStore = useCollageSeriesStore()
const animationStore = useAnimationStore()
const { overviews, currentOverviewIndex, currentSlideIndex } = storeToRefs(collageSeriesStore)
const { collaging, result_data } = storeToRefs(animationStore)
const {
  handleCollageSeriesSelect,
  handleDeleteCollageSeries,
  addNewSlide,
  handleDuplicateSlide,
  addNewOverview,
  selectOverview,
  handleDeleteOverview
} = collageSeriesStore

// 折叠状态（与 store 同步，便于 Header 等外部收起面板）
const { isCollageSeriesPanelCollapsed } = storeToRefs(collageSeriesStore)
const isCollapsed = isCollageSeriesPanelCollapsed

// 悬停状态
const hoveredOverviewIdx = ref<number | null>(null)
const hoveredSlideIdx = ref<number | null>(null)
// 面板本地状态
const isSettingsOpen = ref(false)
const settingsOverviewIdx = ref<number | null>(null)
const settingsSlideIdx = ref<number | null>(null)
const panelCoords = ref<{ left: number, top: number } | null>(null)


function toggleSettings(overviewIdx: number, slideIdx: number, e?: MouseEvent) {
  if (isSettingsOpen.value && settingsOverviewIdx.value === overviewIdx && settingsSlideIdx.value === slideIdx) {
    isSettingsOpen.value = false
    return
  }
  settingsOverviewIdx.value = overviewIdx
  settingsSlideIdx.value = slideIdx
  if (e && e.currentTarget) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    panelCoords.value = { left: rect.right + window.scrollX, top: rect.top + window.scrollY + 8 }
  } else {
    panelCoords.value = { left: window.innerWidth / 2, top: window.innerHeight / 2 }
  }
  isSettingsOpen.value = true
}

// 总览收起状态 - 初始时所有总览都是收起的
const collapsedOverviews = ref<Set<number>>(new Set())

function handleClick(overviewIdx: number, slideIdx: number) {
  selectedModeStore.setSelectedMode(null)
  // 先切换到对应的总览
  if (overviewIdx !== currentOverviewIndex.value) {
    selectOverview(overviewIdx)
  }
  handleCollageSeriesSelect(slideIdx)
}

function handleOverviewClick(overviewIdx: number) {
  selectedModeStore.setSelectedMode(null)
  // 先切换到对应的总览
  if (overviewIdx !== currentOverviewIndex.value) {
    selectOverview(overviewIdx)
  }

  const overview = overviews.value[overviewIdx]
  if (overview && overview.collageSeries.length > 0) {
    // 查找结果 slide（结果必定在最后）
    const lastSlide = overview.collageSeries[overview.collageSeries.length - 1]
    if (lastSlide && (lastSlide as any).isResult === true) {
      // 如果有结果，选中结果
      handleCollageSeriesSelect(overview.collageSeries.length - 1)
    } else {
      // 没有结果，选中第一个
      handleCollageSeriesSelect(0)
    }
  }
}

function handleDelete(overviewIdx: number, slideIdx: number) {
  // 先切换到对应的总览
  if (overviewIdx !== currentOverviewIndex.value) {
    selectOverview(overviewIdx)
  }
  handleDeleteCollageSeries(slideIdx)
}

function handleDuplicate(overviewIdx: number, slideIdx: number) {
  // 先切换到对应的总览
  if (overviewIdx !== currentOverviewIndex.value) {
    selectOverview(overviewIdx)
  }
  handleDuplicateSlide(slideIdx)
}

function handleAddNew(overviewIdx: number) {
  // 先切换到对应的总览
  if (overviewIdx !== currentOverviewIndex.value) {
    selectOverview(overviewIdx)
  }
  addNewSlide()
}

// 总览管理函数
function handleAddNewOverview() {
  addNewOverview()
}

function handleDeleteOverviewClick(overviewIdx: number) {
  handleDeleteOverview(overviewIdx)
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

// 悬停处理函数
function handleMouseEnter(overviewIdx: number, slideIdx: number) {
  hoveredOverviewIdx.value = overviewIdx
  hoveredSlideIdx.value = slideIdx
}

function handleMouseLeave() {
  hoveredOverviewIdx.value = null
  hoveredSlideIdx.value = null
}

// 总览收起/展开处理函数
function toggleOverviewCollapse(overviewIdx: number) {
  if (collapsedOverviews.value.has(overviewIdx)) {
    collapsedOverviews.value.delete(overviewIdx)
  } else {
    collapsedOverviews.value.add(overviewIdx)
  }
}
onMounted(() => { 
  // 初始时将所有总览设置为收起状态
  overviews.value.forEach((_, index) => {
    collapsedOverviews.value.add(index)
  })
})

// 监听总览数量变化，新添加的总览默认收起
watch(() => overviews.value.length, (newLength, oldLength) => {
  if (newLength > oldLength) {
    // 有新总览添加时，将新总览设置为收起状态
    for (let i = oldLength; i < newLength; i++) {
      collapsedOverviews.value.add(i)
    }
  }
})
</script>

<template>
  <div class="absolute right-0 top-0 bottom-0 z-9998 h-full">
      <!-- 面板内容 -->
      <aside
      class="bg-[var(--primary-light-color)] flex flex-col h-full items-center transition-all duration-300 shadow-left border-l border-[var(--border-color)] overflow-x-hidden relative"
      :class="isCollapsed ? 'w-13' : 'w-60'"
      data-tutorial="visualization-gallery">
      <!-- 拼贴处理状态遮罩 -->
      <div v-if="collaging || result_data.length > 0"
        class="absolute inset-0 bg-[var(--border-color)] bg-opacity-0 z-30 flex items-center justify-center cursor-not-allowed pointer-events-auto">
      </div>
      <!-- 收起按钮 - 放在左上角 -->
      <button @click="toggleCollapse"
        class="absolute top-3px left-2 z-20 bg-[var(--primary-light-color)] hover:bg-[var(--primary-light-color)] transition-all duration-200 p-1.5 rounded"
        :title="isCollapsed ? 'Expand' : 'Collapse'">
        <div class="w-5 h-5 text-black transition-all duration-300"
          :class="isCollapsed ? 'i-carbon:open-panel-right' : 'i-carbon:open-panel-filled-right'"></div>
      </button>

      <!-- 标题 -->
      <div class="w-full h-42px mb-2 border-b border-[var(--border-color)] flex items-center justify-center bg-[var(--primary-light-color)]">
        <div v-if="!isCollapsed" class="text-[16px] text-[var(--title-color)] font-semibold">Visualization Gallery</div>
      </div>

      <div v-if="!isCollapsed" class="w-full px-2 flex flex-col h-full overflow-y-auto">
        <!-- 总览列表 -->
        <div v-for="(overview, overviewIdx) in overviews" :key="overview.overviewId"
          class="border-2 rounded p-2 flex flex-col mb-4 group border-dashed border-[var(--border-color)]">
          <!-- 总览区域 - 更大的slide -->
          <div class="mb-1 relative">
            <div class="border rounded flex h-32 items-center justify-center cursor-pointer hover:bg-[var(--primary-light-color)] transition-colors border-[var(--border-color)]"
              @click="handleOverviewClick(overviewIdx)">
              <img :src="overview.preview" class="max-h-full max-w-full object-contain" alt="总览预览" />
            </div>
            <!-- 收起/展开按钮 -->
            <button
              class="absolute top-1 left-1 z-10 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-[var(--primary-light-color)] transition-colors"
              @click.stop="toggleOverviewCollapse(overviewIdx)"
              :title="collapsedOverviews.has(overviewIdx) ? '展开' : '收起'">
              <div class="w-3 h-3 text-[var(--text-muted)] transition-transform duration-200"
                :class="collapsedOverviews.has(overviewIdx) ? 'i-carbon-chevron-right' : 'i-carbon-chevron-down'"></div>
            </button>
            <!-- 删除总览按钮 -->
            <button v-if="overviews.length > 1"
              class="absolute top-1 right-1 z-10 hidden group-hover:block bg-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-[var(--delete-color)] hover:text-white transition-colors"
              @click.stop="handleDeleteOverviewClick(overviewIdx)" title="删除总览">×</button>
          </div>

          <!-- 拼贴系列列表区域 -->
          <transition name="slide-fade">
            <div v-show="!collapsedOverviews.has(overviewIdx)" class=" mt-3 flex-1 overflow-y-auto">
              <div v-for="(item, slideIdx) in overview.collageSeries" :key="item.slideId"
              class="relative mb-3 m-l-5 m-r-5 border-2 rounded flex h-28 items-center justify-center cursor-pointer"
              :class="[
                (item as any).isResult === true
                  ? 'border-green-500 bg-green-50'
                  : overviewIdx === currentOverviewIndex && slideIdx === currentSlideIndex
                    ? 'border-[var(--primary-color)] bg-[var(--primary-light-color)]'
                    : 'border-[#e6e6e6] bg-[#f5f5f5]'
              ]"
              @click="handleClick(overviewIdx, slideIdx)"
              @mouseenter="handleMouseEnter(overviewIdx, slideIdx)"
              @mouseleave="handleMouseLeave">
              <!-- 删除按钮 -->
              <button v-if="overview.collageSeries.length > 1 && hoveredOverviewIdx === overviewIdx && hoveredSlideIdx === slideIdx"
                class="absolute top-1 right-1 z-10 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-[var(--delete-color)] hover:text-white transition-colors"
                @click.stop="handleDelete(overviewIdx, slideIdx)" title="Delete">×</button>

              <!-- 复制按钮 -->
              <button v-if="hoveredOverviewIdx === overviewIdx && hoveredSlideIdx === slideIdx && !(item as any).isResult"
                class="absolute top-1 z-10 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-[var(--primary-color)] hover:text-white transition-colors"
                :class="overview.collageSeries.length > 1 ? 'right-8' : 'right-1'"
                @click.stop="handleDuplicate(overviewIdx, slideIdx)" title="Duplicate">
                <div class="i-carbon:copy text-xs"></div>
              </button>

              <!-- 设置按钮 -->
              <button v-if="hoveredOverviewIdx === overviewIdx && hoveredSlideIdx === slideIdx && !(item as any).isResult"
                class="absolute top-1 right-14 z-10 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-[var(--primary-color)] hover:text-white transition-colors"
                :class="overview.collageSeries.length > 1 ? 'right-14' : 'right-8'"
                @click.stop="(e)=>toggleSettings(overviewIdx, slideIdx, e)" title="Settings">
                <div class="i-carbon:settings text-xs"></div>
              </button>

              <!-- 设置面板（锚定到当前卡片） -->
              <SettingsPanel
                v-if="isSettingsOpen && settingsOverviewIdx === overviewIdx && settingsSlideIdx === slideIdx && !(item as any).isResult"
                :overview-idx="overviewIdx"
                :slide-idx="slideIdx"
                :coords="panelCoords || undefined"
                @close="() => { isSettingsOpen = false }"
              />

              <img :src="item.preview" class="max-h-full max-w-full object-contain">
            </div>

            <!-- 添加新拼贴按钮 -->
            <button @click="handleAddNew(overviewIdx)"
              class="w-[calc(100%-40px)] mb-3 m-l-5 m-r-5 border-2 border-dashed border-[var(--border-color)] rounded bg-white flex h-28 items-center justify-center hover:bg-[var(--primary-light-color)] transition-colors"
              title="Add New Collage">
              <div class="text-[var(--text-muted-light)] text-2xl">+</div>
            </button>
            </div>
          </transition>
        </div>
        <!-- 添加新总览按钮 -->
        <div class="flex flex-col items-center mb-3">
          <button
            @click="handleAddNewOverview"
            class="w-12 h-12 border-2 border-dashed border-[var(--border-color)] rounded-full bg-white flex items-center justify-center hover:bg-[var(--primary-light-color)] transition-colors"
            title="添加新总览"
          >
            <div class="text-[var(--text-muted-light)] text-2xl leading-none transform translate-y-[-1px]">+</div>
          </button>
          <div class="text-xs text-[var(--text-muted-light)] text-center mt-2">new a unitvis</div>
        </div>
      </div>

    </aside>
  </div>
</template>

<style scoped>
.shadow-left {
  box-shadow: -4px 0 8px -4px rgba(0, 0, 0, 0.08);
}

/* 收起/展开过渡动画 */
.slide-fade-enter-active {
  transition: all 0.1s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.1s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
