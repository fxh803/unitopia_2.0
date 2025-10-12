import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Canvas } from 'fabric'
import { useCollageSeriesStore } from '~/stores/collageSeries'

export const useDataScaleStore = defineStore('dataScale', () => {
  // 宽度和高度的缩放基数
  const widthScale = ref(1)
  const heightScale = ref(1)
  const prevWidthScale = ref(1)
  const prevHeightScale = ref(1)
  const canvasRef = ref<(() => Canvas | null) | null>(null)
  const collageSeriesStore = useCollageSeriesStore()

  // 设置 canvas 引用
  function setCanvas(canvas: () => Canvas | null) {
    canvasRef.value = canvas
  }

  // 更新所有 marker 的缩放
  function updateAllMarkersScale() {
    const canvas = canvasRef.value?.()
    if (!canvas) return

    const widthRatio = widthScale.value / prevWidthScale.value
    const heightRatio = heightScale.value / prevHeightScale.value
 
    const objects = canvas.getObjects()
    objects.forEach((obj: any) => {
      if (obj.get('dataType') === 'marker') {
        const currentScaleX = obj.get('scaleX') || 1
        const currentScaleY = obj.get('scaleY') || 1
        const baseWidth = obj.width || 0
        const baseHeight = obj.height || 0
        
        const newScaleX = currentScaleX * widthRatio
        const newScaleY = currentScaleY * heightRatio
        
        obj.set({
          scaleX: newScaleX,
          scaleY: newScaleY
        })
        
        console.log('更新:', baseWidth * newScaleX, baseHeight * newScaleY, 'id:', obj.get('markerId'))
      }
    })
    
    canvas.renderAll()
    
    // 更新旧值
    prevWidthScale.value = widthScale.value
    prevHeightScale.value = heightScale.value
    
    // 立即保存当前幻灯片，确保 slide.json 是最新的
    collageSeriesStore.updateCurrentSlide()
  }

  // 监听缩放系数变化
  watch([widthScale, heightScale], () => {
    updateAllMarkersScale()
  })

  // 设置宽度缩放基数
  function setWidthScale(scale: number) {
    widthScale.value = scale
  }

  // 设置高度缩放基数
  function setHeightScale(scale: number) {
    heightScale.value = scale
  }

  // 重置缩放基数
  function resetScales() {
    widthScale.value = 1
    heightScale.value = 1
    prevWidthScale.value = 1
    prevHeightScale.value = 1
  }

  return {
    widthScale,
    heightScale,
    setCanvas,
    setWidthScale,
    setHeightScale,
    resetScales,
    updateAllMarkersScale
  }
})

