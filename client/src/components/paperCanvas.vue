<script setup lang="ts">
import { ref } from 'vue'
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
    //先删除现有背景
    const objects = paper.project.activeLayer.children
    objects.forEach((obj: any) => {
      if (obj && obj.dataType === 'background') {
        obj.remove()
      }
    })
    //这里只更新激活的overview的background，不会跟据动画改变背景
    const currentOverview = collageSeriesStore.overviews[collageSeriesStore.currentOverviewIndex]
    const overviewId = currentOverview?.overviewId 
    // 如果background存在，绘制到画布上
    const bg = backgroundStore.getCurrentOverviewBackground(overviewId)
    if (bg) {
        const backgroundImage = new paper.Raster({source: bg, dataType: 'background'})
        backgroundImage.onLoad = () => {
            // 计算合适的缩放比例，使图片完全适应当前画布宽高
            const scaleX = canvasWidth.value / backgroundImage.width
            const scaleY = canvasHeight.value / backgroundImage.height
            const scale = Math.min(scaleX, scaleY)

            // 设置图片位置和缩放，居中铺满
            backgroundImage.scaling = new paper.Point(scale, scale)
            backgroundImage.position = new paper.Point(canvasWidth.value / 2, canvasHeight.value / 2)
            backgroundImage.sendToBack()
        }
    }
}
onMounted(() => {
    nextTick(() => {
        // 绑定 Paper.js 到 canvas
        paper.setup(paperCanvasRef.value as HTMLCanvasElement);
        const rect = document.querySelector('.canvas-wrapper')?.getBoundingClientRect()
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
    });
});
watch(() => animationStore.now_overview_idx,
    (newVal, oldVal) => {
        updateBackground()
    }
)
onUnmounted(() => {
    paperExportStore.setPaperCanvasEl(null)
    // 销毁paper
    if (paper.view) {

        // 清除所有图层和对象
        paper.project.clear()

        // 销毁视图
        paper.view.remove()
    }

    // 清理paper全局状态
    if (paper.project) {
        paper.project.remove()
    }
})
</script>

<template>
    <canvas ref="paperCanvasRef" class="absolute top-0 left-0 paper-canvas rounded-xl bg-[var(--primary-light-color)]" />
</template>