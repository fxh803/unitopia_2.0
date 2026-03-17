<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useMarkInstanceStore } from '~/stores/markInstance'
import { useTableStore } from '~/stores/table'
import { useMarkerStore } from '~/stores/marker'
import { useContainerStore } from '~/stores/container'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useCanvasStore } from '~/stores/canvas'
import { sendUploadContainerToServer } from '~/composables/server'
import { useBackgroundStore } from '~/stores/background'

interface ExampleItem {
  id: number
  title: string
  image: string
  dataUrl?: string
  markLibUrl?: string
  containerUrl?: string
  markSnapshotUrl?: string
  collageSeriesSnapshotUrl?: string
  backgroundUrl?: string
}

const markInstanceStore = useMarkInstanceStore()
const tableStore = useTableStore()
const markerStore = useMarkerStore()
const containerStore = useContainerStore()
const collageSeriesStore = useCollageSeriesStore()
const canvasStore = useCanvasStore()
const backgroundStore = useBackgroundStore()
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

async function loadExampleToStores(item: ExampleItem) {
  // 1. 加载数据表
  if (item.dataUrl) {
    tableStore.loadFromUrl(item.dataUrl, 'example_data')
  }

  // 2. 将对应的 mark / container 加载进 Libraries
  if (item.markLibUrl) {
    const exists = markerStore.markers.some(m => m.name === item.title)
    if (!exists) {
      markerStore.addMarker({
        name: item.title,
        thumbnail: item.markLibUrl,
        source: item.markLibUrl,
      })
    }
  }

  if (item.containerUrl) {
    const exists = containerStore.containers.some(c => c.name === item.title)
    if (!exists) {
      try {
        const url = item.containerUrl
        const res = await fetch(url)
        if (res.ok) {
          const blob = await res.blob()
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          const processed = await sendUploadContainerToServer(base64)
          const finalBase64 = processed || base64
          if (finalBase64) {
            containerStore.addContainer({
              name: item.title,
              thumbnail: finalBase64,
              source: finalBase64,
            })
          }
        }
      } catch {
        // 忽略单个示例容器加载失败
      }
    }
  }

  // 3. 从 public 读取 markInstances 快照（JSON），写入 markInstanceStore
  if (item.markSnapshotUrl) {
    try {
      const marksRes = await fetch(item.markSnapshotUrl)
      if (marksRes.ok) {
        const marks = await marksRes.json()
        const snapshots = Array.isArray(marks) ? marks : [marks]
        snapshots.forEach((snap: any) => {
          markInstanceStore.addMarkInstance(snap)
        })
      }
    } catch {
      // 忽略单个示例 marks 加载失败
    }
  }

  // 4. 从 public 读取 collageSeries 快照，合并到当前 overview，并设置背景
  if (item.collageSeriesSnapshotUrl) {
    try {
      const overviewRes = await fetch(item.collageSeriesSnapshotUrl)
      if (overviewRes.ok) {
        const overviewSnapshot = await overviewRes.json()
        collageSeriesStore.loadOverviewSnapshot(overviewSnapshot as any)

        const targetOverview = collageSeriesStore.overviews[collageSeriesStore.currentOverviewIndex] ||
          collageSeriesStore.overviews[0]
        if (targetOverview && item.backgroundUrl) {
          backgroundStore.setCurrentOverviewBackground(targetOverview.overviewId, item.backgroundUrl)
        }

        // 恢复第一个 slide 到画布，并让 Run 按钮变绿
        collageSeriesStore.handleCollageSeriesSelect(0)
        canvasStore.hasMarker = true
        canvasStore.hasContainer = true
      }
    } catch {
      // 忽略单个示例 collageSeries 加载失败
    }
  }
}

onMounted(async () => {
  nextTick(() => updateLeftWidth())
  window.addEventListener('resize', updateLeftWidth)

  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('unitopia-example')
    if (raw) {
      window.localStorage.removeItem('unitopia-example')
      try {
        const item = JSON.parse(raw) as ExampleItem
        await loadExampleToStores(item)
      } catch {
        // 忽略解析错误
      }
    }
  }
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
