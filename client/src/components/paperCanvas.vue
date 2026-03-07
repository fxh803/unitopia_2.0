<script setup lang="ts">
import { ref } from 'vue'
import paper from 'paper'
import { useBackgroundStore } from '~/stores/background'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useAnimationStore } from '~/stores/animation'


const animationStore = useAnimationStore()
const paperCanvasRef = ref<HTMLCanvasElement | null>(null)
const backgroundStore = useBackgroundStore()
const collageSeriesStore = useCollageSeriesStore()
const size = ref(0)
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
            // 计算合适的缩放比例，使图片完全适应画布
            const scaleX = size.value / backgroundImage.width;
            const scaleY = size.value / backgroundImage.height;
            const scale = Math.min(scaleX, scaleY);

            // 设置图片位置和缩放
            backgroundImage.scaling = new paper.Point(scale, scale);
            backgroundImage.position = new paper.Point(size.value / 2, size.value / 2);
            // 将背景图片添加到画布并置于最底层
            backgroundImage.sendToBack();
        };
    }
}
onMounted(() => {
    nextTick(() => {
        // 绑定 Paper.js 到 canvas
        paper.setup(paperCanvasRef.value as HTMLCanvasElement);
        const canvasSize = document.querySelector('.canvas-wrapper')?.getBoundingClientRect()
        const width = Math.floor(canvasSize?.width ?? 0);
        const height = Math.floor(canvasSize?.height ?? 0);
        // 保证宽高比 1:1
        size.value = Math.min(width, height);
        if (paperCanvasRef.value) {
            paperCanvasRef.value.width = size.value
            paperCanvasRef.value.height = size.value
            paper.view.viewSize = new paper.Size(size.value, size.value); 
            updateBackground()
        }
    });
});
watch(() => animationStore.now_overview_idx,
    (newVal, oldVal) => {
        updateBackground()
    }
)
onUnmounted(() => {
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