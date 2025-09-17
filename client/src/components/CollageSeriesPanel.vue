<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useAnimationStore } from '~/stores/animation'
import { useSelectedModeStore } from '~/stores/selectedMode'

const selectedModeStore = useSelectedModeStore()

const collageSeriesStore = useCollageSeriesStore()
const animationStore = useAnimationStore()
const { collageSeries, overviews, currentOverviewIndex, currentSlideIndex } = storeToRefs(collageSeriesStore)
const { collaging, result_data } = storeToRefs(animationStore)
const {
  handleCollageSeriesSelect,
  handleDeleteCollageSeries,
  addNewSlide,
  handleDuplicateSlide,
  addNewOverview,
  selectOverview
} = collageSeriesStore

// 折叠状态
const isCollapsed = ref(false)

// 当前总览
const currentOverview = computed(() => {
  return overviews.value[currentOverviewIndex.value] || null
})

function handleClick(overviewIdx: number, slideIdx: number) {
  selectedModeStore.setSelectedMode(null)
  // 先切换到对应的总览
  if (overviewIdx !== currentOverviewIndex.value) {
    selectOverview(overviewIdx)
  }
  handleCollageSeriesSelect(slideIdx)
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

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
onMounted(() => {
  isCollapsed.value = window.innerWidth < 1440
})
</script>

<template>
  <div class="relative flex h-full">
    <!-- 面板内容 -->
    <aside
      class="py-4 bg-white flex flex-col h-full items-center transition-all duration-300 shadow-right border-r border-gray-200 overflow-x-hidden relative"
      :class="isCollapsed ? 'w-13' : 'w-60'">
      <!-- 拼贴处理状态遮罩 -->
      <div v-if="collaging || result_data.length > 0"
        class="absolute inset-0 bg-gray-300 bg-opacity-50 z-30 flex items-center justify-center">
      </div>
      <!-- 收起按钮 - 放在右上角 -->
      <button @click="toggleCollapse"
        class="absolute top-3 right-3 z-20 bg-white hover:bg-gray-100 transition-all duration-200 p-1.5 rounded"
        :title="isCollapsed ? 'Expand' : 'Collapse'">
        <div class="w-5 h-5 text-black transition-all duration-300"
          :class="isCollapsed ? 'i-carbon:open-panel-left' : 'i-carbon:open-panel-filled-left'"></div>
      </button>

      <!-- 标题 -->
      <div class="w-full min-h-30px mb-2 border-b border-gray-200 ">
      </div>

      <div v-if="!isCollapsed" class="w-full px-2 flex flex-col h-full overflow-y-auto">
        <!-- 总览列表 -->
        <div v-for="(overview, overviewIdx) in overviews" :key="overview.overviewId"
          class="border rounded bg-gray-100 p-2 flex flex-col mb-4">
          <!-- 总览区域 - 更大的slide -->
          <div class="mb-4">
            <div class="border rounded flex h-32 items-center justify-center bg-gray-50">
              <img :src="overview.preview" class="max-h-full max-w-full object-contain" alt="总览预览" />
            </div>
          </div>

          <!-- 拼贴系列列表区域 -->
          <div class="flex-1 overflow-y-auto">
            <div v-for="(item, slideIdx) in overview.collageSeries" :key="item.slideId"
              class="relative mb-3 m-l-2 m-r-2 border rounded flex h-32 items-center justify-center group cursor-pointer"
              :class="[
                overviewIdx === currentOverviewIndex && slideIdx === currentSlideIndex
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-[#e6e6e6] bg-[#f5f5f5]'
              ]" @click="handleClick(overviewIdx, slideIdx)">
              <!-- 删除按钮 -->
              <button v-if="overview.collageSeries.length > 1"
                class="absolute top-1 right-1 z-10 hidden group-hover:block bg-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-[var(--delete-color)] hover:text-white transition-colors"
                @click.stop="handleDelete(overviewIdx, slideIdx)" title="Delete">×</button>

              <!-- 复制按钮 -->
              <button
                class="absolute top-1 z-10 hidden group-hover:block bg-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-[var(--primary-color)] hover:text-white transition-colors"
                :class="overview.collageSeries.length > 1 ? 'right-8' : 'right-1'"
                @click.stop="handleDuplicate(overviewIdx, slideIdx)" title="Duplicate">
                <div class="i-carbon:copy text-xs transform translate-x-4px"></div>
              </button>

              <img :src="item.preview" class="max-h-full max-w-full object-contain">
            </div>

            <!-- 添加新拼贴按钮 -->
            <button @click="handleAddNew(overviewIdx)"
              class="w-[calc(100%-16px)] mb-3 m-l-2 m-r-2 border-2 border-dashed border-gray-300 rounded bg-gray-50 flex h-32 items-center justify-center hover:bg-gray-100 transition-colors"
              title="Add New Collage">
              <div class="text-gray-400 text-2xl">+</div>
            </button>
          </div>
        </div>
        <!-- 添加新总览按钮 -->
      <button @click="handleAddNewOverview"
          class="w-full mb-3 border-2 border-dashed border-gray-300 rounded bg-gray-50 flex min-h-16 items-center justify-center hover:bg-gray-100 transition-colors"
          title="添加新总览">
          <div class="text-gray-400 text-2xl">+</div>
        </button>
      </div>
      
    </aside>
  </div>
</template>

<style scoped>
.shadow-right {
  box-shadow: 4px 0 8px -4px rgba(0, 0, 0, 0.08);
}
</style>
