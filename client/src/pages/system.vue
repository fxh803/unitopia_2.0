<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useMarkInstanceStore } from '~/stores/markInstance'

const markInstanceStore = useMarkInstanceStore()
const hasMarkDetail = computed(() => Boolean(markInstanceStore.selectedMarkForDetail))

// 是否展示右侧 MarkDetailPanel（与是否选中分离，可单独折叠）
const isDetailCollapsed = ref(false)
const showMarkDetailPanel = computed(() => hasMarkDetail.value && !isDetailCollapsed.value)

// 当没有选中 mark 时，自动重置折叠状态
watch(hasMarkDetail, (val) => {
  if (!val) isDetailCollapsed.value = false
})

// 当切换/重新选择 Mark 时，如果详情面板当前是收起的，则自动展开
watch(
  () => markInstanceStore.selectedMarkForDetail,
  (val) => {
    if (val && isDetailCollapsed.value) {
      isDetailCollapsed.value = false
    }
  },
)

const contentWrapRef = ref<HTMLElement | null>(null)
const leftColumnWidth = ref(400)

function updateLeftWidth() {
  if (!contentWrapRef.value) return
  const w = contentWrapRef.value.offsetWidth
  if (w > 0) leftColumnWidth.value = Math.max(400, Math.floor(w / 4))
}

function toggleDetailPanel() {
  if (!hasMarkDetail.value) return
  isDetailCollapsed.value = !isDetailCollapsed.value
}

onMounted(() => {
  nextTick(() => updateLeftWidth())
  window.addEventListener('resize', updateLeftWidth)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateLeftWidth)
})
</script>

<template>
  <div class="bg-[var(--primary-light-color)] flex flex-col h-screen w-screen dark:bg-gray-900">
    <Header />
    <TutorialOverlay />
    <div ref="contentWrapRef" class="h-full relative overflow-hidden flex min-w-0">
      <!-- 左侧：初始 1/4 宽，展示详情时为两倍宽，Sidebar 与 Detail 等宽（固定 px，无动画） -->
      <div
        class="h-full flex flex-shrink-0 border-r border-[var(--border-color)]"
        :style="{ width: showMarkDetailPanel ? `${leftColumnWidth * 2}px` : `${leftColumnWidth}px` }"
      >
        <LeftSidebar 
          :style="{ width: `${leftColumnWidth}px` }"
        />
       
        <MarkDetailPanel
          v-if="showMarkDetailPanel" 
          :style="{ width: `${leftColumnWidth}px` }"
        />
         <!-- 中间折叠按钮组件：填满高度，控制详情面板显隐 -->
         <MarkDetailToggle
          :open="showMarkDetailPanel"
          :disabled="!hasMarkDetail"
          data-tutorial="mark-detail-toggle"
          @toggle="toggleDetailPanel"
        />
      </div>
      <!-- 右侧：Canvas 占满剩余 -->
      <div class="h-full flex-1 min-w-0 flex flex-col">
        <div class="flex justify-between items-center p-2 bg-[var(--primary-light-color)] h-8 flex-shrink-0 shadow-sm z-10">
          <span class="text-[16px] text-[var(--title-color)] font-semibold">Canvas Editor</span>
        </div>
        <div class="flex-1 min-h-0">
          <CanvasArea />
        </div>
      </div>
      <CollageSeriesPanel />
    </div>
  </div>
</template>
