<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import paper from 'paper'
import { useBackgroundStore } from '~/stores/background'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useAnimationStore } from '~/stores/animation'
import { usePaperExportStore } from '~/stores/paperExport'

const animationStore = useAnimationStore()
const paperExportStore = usePaperExportStore()

const paperCanvasRef = ref<HTMLCanvasElement | null>(null)
const backgroundStore = useBackgroundStore()
const collageSeriesStore = useCollageSeriesStore()
// 与主画布对齐的宽高（不再强制 1:1）
const canvasWidth = ref(0)
const canvasHeight = ref(0)
function updateBackground() {
  // 先删除现有背景
  const objects = paper.project.activeLayer.children
  objects.forEach((obj: any) => {
    if (obj && obj.dataType === 'background') {
      obj.remove()
    }
  })

  // 这里只更新激活的 overview 的 background，不会根据动画改变背景
  const currentOverview = collageSeriesStore.overviews[collageSeriesStore.currentOverviewIndex]
  const overviewId = currentOverview?.overviewId

  // 如果 background 存在，绘制到画布上
  const bg = backgroundStore.getCurrentOverviewBackground(overviewId)
  if (bg) {
    const backgroundImage = new paper.Raster({ source: bg, dataType: 'background' })

    // 从 Fabric 主画布中读取当前背景图的几何信息（位置、缩放），保证对齐
    const fabricCanvasGetter = collageSeriesStore.canvasRef
    const fabricCanvas = fabricCanvasGetter?.()
    let bgLeft: number | null = null
    let bgTop: number | null = null
    let bgScaleX: number | null = null
    let bgScaleY: number | null = null

    if (fabricCanvas) {
      const fabricBg = fabricCanvas
        .getObjects()
        .find((obj: any) => obj && obj.get && obj.get('dataType') === 'background') as any

      if (fabricBg) {
        bgLeft = typeof fabricBg.left === 'number' ? fabricBg.left : null
        bgTop = typeof fabricBg.top === 'number' ? fabricBg.top : null
        bgScaleX = typeof fabricBg.scaleX === 'number' ? fabricBg.scaleX : null
        bgScaleY = typeof fabricBg.scaleY === 'number' ? fabricBg.scaleY : null
      }
    }

    backgroundImage.onLoad = () => {
      // 如果拿到了主画布上的背景几何信息，就直接复用，做到完全对齐
      if (bgLeft !== null && bgTop !== null && bgScaleX !== null && bgScaleY !== null) {
        backgroundImage.scaling = new paper.Point(bgScaleX, bgScaleY)
        backgroundImage.position = new paper.Point(bgLeft, bgTop)
      } else {
        // 否则退回到根据当前 paper 画布尺寸自适应缩放、居中
        const scaleX = canvasWidth.value / backgroundImage.width
        const scaleY = canvasHeight.value / backgroundImage.height
        const scale = Math.min(scaleX, scaleY)

        backgroundImage.scaling = new paper.Point(scale, scale)
        backgroundImage.position = new paper.Point(canvasWidth.value / 2, canvasHeight.value / 2)
      }

      backgroundImage.sendToBack()
    }
  }
}

onMounted(() => {
  nextTick(() => {
    // 绑定 Paper.js 到 canvas
    paper.setup(paperCanvasRef.value as HTMLCanvasElement)

    // 使用 DOM 中 .fabric-canvas 的实际渲染尺寸
    const rect = document.querySelector('.fabric-canvas')?.getBoundingClientRect()
    const width = Math.floor(rect?.width ?? 0)
    const height = Math.floor(rect?.height ?? 0)

    canvasWidth.value = width
    canvasHeight.value = height

    if (paperCanvasRef.value && width > 0 && height > 0) {
      paperCanvasRef.value.width = width
      paperCanvasRef.value.height = height
      paper.view.viewSize = new paper.Size(width, height)
      updateBackground()
      paperExportStore.setPaperCanvasEl(paperCanvasRef.value)
    }
  })
})

watch(
  () => animationStore.now_overview_idx,
  () => {
    updateBackground()
  },
)

onUnmounted(() => {
  paperExportStore.setPaperCanvasEl(null)
  // 销毁 paper
  if (paper.view) {
    // 清除所有图层和对象
    paper.project.clear()

    // 销毁视图
    paper.view.remove()
  }

  // 清理 paper 全局状态
  if (paper.project) {
    paper.project.remove()
  }
})
</script>

<template>
  <canvas
    ref="paperCanvasRef"
    class="absolute inset-0 paper-canvas bg-[var(--primary-light-color)]"
  />
</template>