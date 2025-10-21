import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Canvas } from 'fabric'
import { useCollageSeriesStore } from '~/stores/collageSeries'

export const useDataScaleStore = defineStore('dataScale', () => {
  // 宽度、高度和大小的缩放基数
  const widthScale = ref(1)
  const heightScale = ref(1)
  const sizeScale = ref(1)
  const prevWidthScale = ref(1)
  const prevHeightScale = ref(1)
  const prevSizeScale = ref(1)

  // 当前映射通道：'width' | 'height' | 'size'
  const currentMappingChannel = ref<'width' | 'height' | 'size'>('size')
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
    const sizeRatio = sizeScale.value / prevSizeScale.value

    const objects = canvas.getObjects()
    objects.forEach((obj: any) => {
      if (obj.get('dataType') === 'marker') {
        const currentScaleX = obj.get('scaleX') || 1
        const currentScaleY = obj.get('scaleY') || 1
        const baseWidth = obj.width || 0
        const baseHeight = obj.height || 0

        let newScaleX = currentScaleX
        let newScaleY = currentScaleY

        // 根据当前映射通道状态应用不同的缩放逻辑
        if (currentMappingChannel.value === 'size') {
          // 如果是 size 通道，x 和 y 都乘以 sizeRatio
          newScaleX = currentScaleX * sizeRatio
          newScaleY = currentScaleY * sizeRatio
        } else if (currentMappingChannel.value === 'width') {
          // 如果是 width 通道，只乘 widthRatio
          newScaleX = currentScaleX * widthRatio
        } else if (currentMappingChannel.value === 'height') {
          // 如果是 height 通道，只乘 heightRatio
          newScaleY = currentScaleY * heightRatio
        }

        obj.set({
          scaleX: newScaleX,
          scaleY: newScaleY
        })

        console.log('更新:', baseWidth * newScaleX, baseHeight * newScaleY, 'id:', obj.get('markerId'), 'channel:', currentMappingChannel.value)
      }
    })

    canvas.renderAll()

    // 更新旧值
    prevWidthScale.value = widthScale.value
    prevHeightScale.value = heightScale.value
    prevSizeScale.value = sizeScale.value

    // 立即保存当前幻灯片，确保 slide.json 是最新的
    collageSeriesStore.updateCurrentSlide()
  }

  function changeMappingChannel() {
    const canvas = canvasRef.value?.()
    const objects = canvas.getObjects()
    objects.forEach((obj: any, i) => {
      if (obj.get('dataType') === 'marker') {
        // 获取归一化参数
        const { data, normalize, minWidth, maxWidth, avgWidth, minHeight, maxHeight, avgHeight, minSizeValue, maxSizeValue } = getNormalizationParams(obj.get('markerId'))
         
        // 根据数据中的 width 和 height 调节对象大小
        const currentWidth = obj.width
        const currentHeight = obj.height
        const currentSize = Math.max(currentWidth, currentHeight)
        const row = data[i-1]//从1开始的
        const dataWidth = parseFloat(row.width)
        const dataHeight = parseFloat(row.height)
        const dataSize = parseFloat(row.size)
        console.log('dataWidth', dataWidth, 'dataHeight', dataHeight, 'dataSize', dataSize)
        // 如果数据有效，使用归一化后的尺寸
        if (!isNaN(dataWidth) && !isNaN(dataHeight) && dataWidth > 0 && dataHeight > 0) {
          const normalizedWidth = normalize(dataWidth, minWidth, maxWidth)
          const normalizedHeight = normalize(dataHeight, minHeight, maxHeight)
          const normalizedSize = !isNaN(dataSize) && dataSize > 0 ? normalize(dataSize, minSizeValue, maxSizeValue) : null
          console.log(normalizedWidth,normalizedHeight,normalizedSize,currentSize)
          // 默认使用平均值/现有值
          let scaleX = avgWidth / currentSize  
          let scaleY = avgHeight / currentSize  

          // 根据当前映射通道状态应用不同的缩放逻辑
          if (currentMappingChannel.value === 'size' && normalizedSize !== null) {
            // 如果是 size 通道，x 和 y 都使用 size 的归一化值
            scaleX = normalizedSize / currentSize * sizeScale.value
            scaleY = normalizedSize / currentSize * sizeScale.value
          } else if (currentMappingChannel.value === 'width') {
            // 如果是 width 通道，只使用 width 的归一化值
            scaleX = normalizedWidth / currentSize * widthScale.value
          } else if (currentMappingChannel.value === 'height') {
            // 如果是 height 通道，只使用 height 的归一化值 
            scaleY = normalizedHeight / currentSize * heightScale.value
          }
          console.log(scaleX,scaleY)
          obj.set({
            scaleX: scaleX,
            scaleY: scaleY
          })
        }

      }
    })
    canvas.renderAll()
  }
  // 监听缩放系数变化
  watch([widthScale, heightScale, sizeScale], () => {
    updateAllMarkersScale()
  })
  watch(currentMappingChannel, () => {
    changeMappingChannel()
  })

  // 设置宽度缩放基数
  function setWidthScale(scale: number) {
    widthScale.value = scale
  }

  // 设置高度缩放基数
  function setHeightScale(scale: number) {
    heightScale.value = scale
  }

  // 设置大小缩放基数
  function setSizeScale(scale: number) {
    sizeScale.value = scale
  }

  // 设置当前映射通道
  function setCurrentMappingChannel(channel: 'width' | 'height' | 'size') {
    currentMappingChannel.value = channel
  }

  // 重置缩放基数
  function resetScales() {
    widthScale.value = 1
    heightScale.value = 1
    sizeScale.value = 1
    prevWidthScale.value = 1
    prevHeightScale.value = 1
    prevSizeScale.value = 1
  }
  // 计算归一化参数和归一化函数
  function getNormalizationParams(markerId: string) {
    const data = pharseData(markerId)

    // 提取所有的 width、height 和 size 值
    const widths: number[] = []
    const heights: number[] = []
    const sizes: number[] = []
    data.forEach((row: any) => {
      const w = parseFloat(row.width)
      const h = parseFloat(row.height)
      const s = parseFloat(row.size)
      if (!isNaN(w) && w > 0) widths.push(w)
      if (!isNaN(h) && h > 0) heights.push(h)
      if (!isNaN(s) && s > 0) sizes.push(s)
    })

    // 定义归一化范围
    const minDisplaySize = 20  // 最小显示尺寸
    const maxDisplaySize = 100  // 最大显示尺寸

    // 计算归一化参数
    const minWidth = widths.length > 0 ? Math.min(...widths) : 1
    const maxWidth = widths.length > 0 ? Math.max(...widths) : 1
    const avgWidth = widths.length > 0 ? widths.reduce((sum, w) => sum + w, 0) / widths.length : 1
    const minHeight = heights.length > 0 ? Math.min(...heights) : 1
    const maxHeight = heights.length > 0 ? Math.max(...heights) : 1
    const avgHeight = heights.length > 0 ? heights.reduce((sum, h) => sum + h, 0) / heights.length : 1
    const minSizeValue = sizes.length > 0 ? Math.min(...sizes) : 1
    const maxSizeValue = sizes.length > 0 ? Math.max(...sizes) : 1

    // 归一化函数：将原始值映射到 [minDisplaySize, maxDisplaySize] 范围
    const normalize = (value: number, min: number, max: number): number => {
      if (max === min) return (minDisplaySize + maxDisplaySize) / 2  // 如果所有值相同，返回中间值
      return minDisplaySize + ((value - min) / (max - min)) * (maxDisplaySize - minDisplaySize)
    }

    return {
      data,
      normalize,
      minWidth,
      maxWidth,
      avgWidth,
      minHeight,
      maxHeight,
      avgHeight,
      minSizeValue,
      maxSizeValue
    }
  }


  return {
    widthScale,
    heightScale,
    sizeScale,
    currentMappingChannel,
    setCanvas,
    setWidthScale,
    setHeightScale,
    setSizeScale,
    setCurrentMappingChannel,
    resetScales,
    updateAllMarkersScale,
    changeMappingChannel,
    getNormalizationParams

  }
})

