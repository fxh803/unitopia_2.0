<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useMarkInstanceStore } from '~/stores/markInstance'
import { useTableStore } from '~/stores/table'
import { useMarkerStore } from '~/stores/marker'
import { useContainerStore } from '~/stores/container'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useCanvasStore } from '~/stores/canvas'
import { sendUploadContainerToServer } from '~/composables/server'
import { useBackgroundStore } from '~/stores/background'
import { useBezierDrawingStore } from '~/stores/bezierDrawing'
import { useForceDrawingStore } from '~/stores/forceDrawing'

interface ExampleItem {
  id: number
  title: string
  image: string
  dataUrl?: string
  markLibUrls?: string[]
  containerUrls?: string[]
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
const bezierDrawingStore = useBezierDrawingStore()
const forceDrawingStore = useForceDrawingStore()
const hasMarkDetail = computed(() => Boolean(markInstanceStore.selectedMarkForDetail))
const { markDetailPanelCollapsed } = storeToRefs(markInstanceStore)

// 是否展示右侧 MarkDetailPanel（与是否选中分离，可单独折叠；折叠状态在 markInstance store）
const showMarkDetailPanel = computed(
  () => hasMarkDetail.value && !markDetailPanelCollapsed.value,
)

const contentWrapRef = ref<HTMLElement | null>(null)
const leftColumnWidth = ref(400)
const EDITOR_FRESH_KEY = 'unitopia-editor-fresh-once'

/** 从 gallery 等入口加载示例到各 store 未完成时，全屏蒙版 */
const isExampleLoading = ref(false)

function updateLeftWidth() {
  if (!contentWrapRef.value) return
  const w = contentWrapRef.value.offsetWidth
  if (w > 0) leftColumnWidth.value = Math.max(400, Math.floor(w / 4))
}

function toggleDetailPanel() {
  if (!hasMarkDetail.value) return
  markInstanceStore.setMarkDetailPanelCollapsed(!markDetailPanelCollapsed.value)
}

function adaptOverviewSnapshotToCurrentCanvas(snapshot: any) {
  const fabricCanvas = collageSeriesStore.canvasRef?.()
  const targetWidth = fabricCanvas?.width || 400
  const targetHeight = fabricCanvas?.height || 400
  const overviews = Array.isArray(snapshot) ? snapshot : [snapshot]

  overviews.forEach((overview: any, overviewIndex: number) => {
    const slides = Array.isArray(overview?.collageSeries) ? overview.collageSeries : []

    slides.forEach((slide: any, slideIndex: number) => {
      if (!slide?.json) return
      try {
        const jsonObj = typeof slide.json === 'string' ? JSON.parse(slide.json) : slide.json
        if (!jsonObj || typeof jsonObj !== 'object') return

        const sourceWidth = Number(overview?.width)
        const sourceHeight = Number(overview?.height)
        const validSourceSize =
          Number.isFinite(sourceWidth) &&
          Number.isFinite(sourceHeight) &&
          sourceWidth > 0 &&
          sourceHeight > 0

        const objects = Array.isArray(jsonObj.objects) ? jsonObj.objects : []

        if (validSourceSize && (sourceWidth !== targetWidth || sourceHeight !== targetHeight)) {
          const sx = targetWidth / sourceWidth
          const sy = targetHeight / sourceHeight
          const uniformScale = Math.min(sx, sy)
          const offsetX = (targetWidth - sourceWidth * uniformScale) / 2
          const offsetY = (targetHeight - sourceHeight * uniformScale) / 2
          objects.forEach((obj: any) => {
            if (!obj || typeof obj !== 'object') return
            if (typeof obj.left === 'number') obj.left = obj.left * uniformScale + offsetX
            if (typeof obj.top === 'number') obj.top = obj.top * uniformScale + offsetY
            if (typeof obj.scaleX === 'number') obj.scaleX *= uniformScale
            if (typeof obj.scaleY === 'number') obj.scaleY *= uniformScale
          })
        }

        jsonObj.width = targetWidth
        jsonObj.height = targetHeight
        slide.json = typeof slide.json === 'string' ? JSON.stringify(jsonObj) : jsonObj
      } catch (error) {
        // 忽略单个 slide 解析异常，避免阻断整体示例加载
        console.error('adaptOverviewSnapshotToCurrentCanvas error', error)
      }
    })
  })

  return snapshot
}

// 临时迁移工具：清理旧 snapshot 中仍以 Fabric 对象形式存储的 background
function cleanupLegacyBackgroundFromSnapshot(snapshot: any) {
  const overviews = Array.isArray(snapshot) ? snapshot : [snapshot]
  overviews.forEach((overview: any) => {
    const slides = Array.isArray(overview?.collageSeries) ? overview.collageSeries : []
    slides.forEach((slide: any) => {
      if (!slide) return
      try {
        const jsonObj = typeof slide.json === 'string' ? JSON.parse(slide.json) : slide.json
        const objects = Array.isArray(jsonObj?.objects) ? jsonObj.objects : []
        const dataTypeArray = Array.isArray(slide.dataTypeArray) ? slide.dataTypeArray : []
        if (objects.length === 0) return

        const keepIndices: number[] = []
        objects.forEach((obj: any, index: number) => {
          const byArray = dataTypeArray[index] === 'background'
          const byObject = obj?.dataType === 'background'
          if (!byArray && !byObject) keepIndices.push(index)
        })

        // 没有旧 background 对象，不做任何改动
        if (keepIndices.length === objects.length) return

        jsonObj.objects = keepIndices.map(i => objects[i])
        slide.dataTypeArray = keepIndices.map(i => slide.dataTypeArray?.[i])
        slide.markerIdArray = keepIndices.map(i => slide.markerIdArray?.[i])
        slide.forceTypeArray = keepIndices.map(i => slide.forceTypeArray?.[i])
        slide.dataArray = keepIndices.map(i => slide.dataArray?.[i])
        if (Array.isArray(slide.isErasePathArray))
          slide.isErasePathArray = keepIndices.map(i => slide.isErasePathArray?.[i])
        if (Array.isArray(slide.origOpacityArray))
          slide.origOpacityArray = keepIndices.map(i => slide.origOpacityArray?.[i])

        slide.json = JSON.stringify(jsonObj)
      } catch (error) {
        console.error('cleanupLegacyBackgroundFromSnapshot error', error)
      }
    })
  })

  return snapshot
}

// 临时迁移工具：将清理后的 snapshot 下载到本地，便于后续替换为新文件
function downloadCleanedSnapshotToLocal(itemTitle: string) {
  const safeTitle = (itemTitle || 'example').replace(/[^\w\-]+/g, '_')
  const filename = `${safeTitle}-cleaned-collageSeriesSnapshot.json`
  const payload = JSON.parse(JSON.stringify(collageSeriesStore.overviews))
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function getFitBackgroundTransform(
  imageUrl: string,
  canvasWidth: number,
  canvasHeight: number,
  sourceCanvasWidth?: number,
  sourceCanvasHeight?: number,
) {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('背景图片加载失败'))
    img.src = imageUrl
  })

  const hasValidSourceCanvas =
    Number.isFinite(sourceCanvasWidth) &&
    Number.isFinite(sourceCanvasHeight) &&
    (sourceCanvasWidth as number) > 0 &&
    (sourceCanvasHeight as number) > 0

  if (hasValidSourceCanvas) {
    const sourceW = sourceCanvasWidth as number
    const sourceH = sourceCanvasHeight as number
    const sourceFitScale = Math.min(sourceW / img.width, sourceH / img.height)
    const uniformScale = Math.min(canvasWidth / sourceW, canvasHeight / sourceH)
    const offsetX = (canvasWidth - sourceW * uniformScale) / 2
    const offsetY = (canvasHeight - sourceH * uniformScale) / 2

    return {
      left: sourceW / 2 * uniformScale + offsetX,
      top: sourceH / 2 * uniformScale + offsetY,
      scaleX: sourceFitScale * uniformScale,
      scaleY: sourceFitScale * uniformScale,
      originX: 'center' as const,
      originY: 'center' as const,
    }
  }

  const scaleX = canvasWidth / img.width
  const scaleY = canvasHeight / img.height
  const scale = Math.min(scaleX, scaleY)

  return {
    left: canvasWidth / 2,
    top: canvasHeight / 2,
    scaleX: scale,
    scaleY: scale,
    originX: 'center' as const,
    originY: 'center' as const,
  }
}

async function loadExampleToStores(item: ExampleItem) {
  // 1. 加载数据表
  if (item.dataUrl) {
    tableStore.loadFromUrl(item.dataUrl, 'example_data')
  }

  // 2. 将对应的 mark / container 加载进 Libraries
  const markLibUrls = item.markLibUrls ?? []
  for (let idx = 0; idx < markLibUrls.length; idx++) {
    const url = markLibUrls[idx]
    if (!url) continue

    const name = markLibUrls.length > 1 ? `${item.title}-${idx + 1}` : item.title
    const exists = markerStore.markers.some(m => m.name === name)
    if (exists) continue

    // 为了与 LibrariesSection / 预加载 SVG 的行为对齐：
    // - svg：source 存 svg 源码字符串（会以 `<` 开头，供 MarkerCanvasArea 识别）
    // - 其他图片：source 继续存 url，供 FabricImage.fromURL 使用
    let source = url
    if (url.toLowerCase().endsWith('.svg')) {
      try {
        const res = await fetch(url)
        if (res.ok) {
          const svgString = await res.text()
          if (svgString.trim().startsWith('<')) source = svgString
        }
      } catch {
        // SVG 解析失败时回退到 url，避免示例直接加载失败
      }
    }

    markerStore.addMarker({
      name,
      thumbnail: url,
      source,
    })
  }

  const containerUrls = item.containerUrls ?? []
  for (let idx = 0; idx < containerUrls.length; idx++) {
    const url = containerUrls[idx]
    if (!url) continue
    const name = containerUrls.length > 1 ? `${item.title}-${idx + 1}` : item.title
    const exists = containerStore.containers.some(c => c.name === name)
    if (exists) continue
    try {
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
            name,
            thumbnail: finalBase64,
            source: finalBase64,
          })
        }
      }
    } catch {
      // 忽略单个示例容器加载失败
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
        // const cleanedOverviewSnapshot = cleanupLegacyBackgroundFromSnapshot(overviewSnapshot)
        const adaptedOverviewSnapshot = adaptOverviewSnapshotToCurrentCanvas(overviewSnapshot)
        collageSeriesStore.loadOverviewSnapshot(adaptedOverviewSnapshot as any)
        // downloadCleanedSnapshotToLocal(item.title)

        const targetOverview = collageSeriesStore.overviews[collageSeriesStore.currentOverviewIndex] ||
          collageSeriesStore.overviews[0]
        const sourceOverview = Array.isArray(overviewSnapshot)
          ? overviewSnapshot[0]
          : overviewSnapshot
        if (targetOverview && item.backgroundUrl) {
          backgroundStore.setCurrentOverviewBackground(targetOverview.overviewId, item.backgroundUrl)
          try {
            const fabricCanvas = collageSeriesStore.canvasRef?.()
            const canvasWidth = fabricCanvas?.width || targetOverview.width || 400
            const canvasHeight = fabricCanvas?.height || targetOverview.height || 400
            const tf = await getFitBackgroundTransform(
              item.backgroundUrl,
              canvasWidth,
              canvasHeight,
              Number(sourceOverview?.width),
              Number(sourceOverview?.height),
            )
            backgroundStore.setCurrentOverviewBackgroundTransform(targetOverview.overviewId, tf)
          } catch {
            // 忽略示例背景 transform 同步失败（不影响示例加载）
          }
        }

        // 恢复第一个 slide 到画布，并让 Run 按钮变绿
        await collageSeriesStore.handleCollageSeriesSelect(0)
        canvasStore.hasMarker = true
        canvasStore.hasContainer = true

        // 在最后一步启动 emitter 虚线与 force 闪烁动画：
        // 这两个动画依赖 canvas 对象已通过 loadFromJSON 恢复完成。
        await nextTick()
        forceDrawingStore.startBlinkAnimation()
        bezierDrawingStore.startDashAnimation()
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
    const shouldFresh = window.sessionStorage.getItem(EDITOR_FRESH_KEY) === '1'
    if (shouldFresh) {
      window.sessionStorage.removeItem(EDITOR_FRESH_KEY)
      window.location.reload()
      return
    }

    const raw = window.localStorage.getItem('unitopia-example')
    if (raw) {
      window.localStorage.removeItem('unitopia-example')
      try {
        const item = JSON.parse(raw) as ExampleItem
        isExampleLoading.value = true
        try {
          await loadExampleToStores(item)
        } finally {
          isExampleLoading.value = false
        }
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

    <!-- 示例数据加载中：系统级蒙版，避免用户在未完成时操作 -->
    <Teleport to="body">
      <Transition name="editor-example-fade">
        <div
          v-if="isExampleLoading"
          class="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-3 bg-black/45 backdrop-blur-[2px] dark:bg-black/55 pointer-events-auto"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span class="i-carbon:renew text-4xl text-white animate-spin" aria-hidden="true" />
          <span class="text-sm font-medium text-white/90">loading example…</span>
        </div>
      </Transition>
    </Teleport>

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

<style scoped>
.editor-example-fade-enter-active,
.editor-example-fade-leave-active {
  transition: opacity 0.2s ease;
}
.editor-example-fade-enter-from,
.editor-example-fade-leave-to {
  opacity: 0;
}
</style>
