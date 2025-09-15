<script setup lang="ts">
import { ref } from 'vue'
import paper from 'paper'
import { useBackgroundStore } from '~/stores/background'
import { useCollageSeriesStore } from '~/stores/collageSeries'
const paperCanvasRef = ref<HTMLCanvasElement | null>(null)
const backgroundStore = useBackgroundStore()
const collageSeriesStore = useCollageSeriesStore()
onMounted(() => {
    nextTick(() => {
        // 绑定 Paper.js 到 canvas
        paper.setup(paperCanvasRef.value);
        const canvasSize = document.querySelector('.canvas-wrapper')?.getBoundingClientRect()
        const width = Math.floor(canvasSize.width);
        const height = Math.floor(canvasSize.height);
        // 保证宽高比 1:1
        const size = Math.min(width, height);
        paperCanvasRef.value.width = size
        paperCanvasRef.value.height = size
        paper.view.viewSize = new paper.Size(size, size);
        const currentOverview = collageSeriesStore.overviews[collageSeriesStore.currentOverviewIndex]
        const overviewId = currentOverview?.overviewId
        console.log('overviewId:', overviewId)
        console.log('background:', backgroundStore.getCurrentOverviewBackground(overviewId))
        // 如果background存在，绘制到画布上
        if (backgroundStore.getCurrentOverviewBackground(overviewId)) {
            const backgroundImage = new paper.Raster(backgroundStore.getCurrentOverviewBackground(overviewId));
            backgroundImage.onLoad = () => {
                // 计算合适的缩放比例，使图片完全适应画布
                const scaleX = size / backgroundImage.width;
                const scaleY = size / backgroundImage.height;
                const scale = Math.min(scaleX, scaleY);
                
                // 设置图片位置和缩放
                backgroundImage.scaling = new paper.Point(scale, scale);
                backgroundImage.position = new paper.Point(size / 2, size / 2);
                
                // 将背景图片添加到画布并置于最底层
                backgroundImage.sendToBack();
                
                // 重新渲染画布
                paper.view.draw();
            };
        }
    });
});
onUnmounted(() => {
    // 销毁paper
    if (paper.view) {
        // 移除所有事件监听器
        paper.view.off('frame')
        paper.view.off('mousedown')
        paper.view.off('mousemove')
        paper.view.off('mouseup')
        paper.view.off('click')
        
        // 清除所有图层和对象
        paper.project.clear()
        
        // 销毁视图
        paper.view.remove()
    }
    
    // 清理paper全局状态
    if (paper.project) {
        paper.project.remove()
    }
    
    // 重置paper到初始状态
    paper.setup(null)
})
</script>

<template>
    <canvas ref="paperCanvasRef" class="absolute top-0 left-0 paper-canvas rounded-xl bg-white" />
</template>