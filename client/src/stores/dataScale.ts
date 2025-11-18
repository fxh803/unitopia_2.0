import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Canvas } from 'fabric'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { pharseData } from '~/composables/server'

export const useDataScaleStore = defineStore('dataScale', () => {
  // 宽度、高度和大小的缩放基数
  const widthScale = ref(1)
  const heightScale = ref(1)
  const sizeScale = ref(1)
  const prevWidthScale = ref(1)
  const prevHeightScale = ref(1)
  const prevSizeScale = ref(1)

  // 列到通道的映射关系：由于 width、height、size 三者互斥，只需要存储一个键值对
  const columnMapping = ref<{ column: string | null; channel: 'width' | 'height' | 'size' | null }>({
    column: null,
    channel: null
  })
  
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
        if (columnMapping.value.channel === 'size') {
          // 如果是 size 通道，x 和 y 都乘以 sizeRatio
          newScaleX = currentScaleX * sizeRatio
          newScaleY = currentScaleY * sizeRatio
        } else if (columnMapping.value.channel === 'width') {
          // 如果是 width 通道，只乘 widthRatio
          newScaleX = currentScaleX * widthRatio
        } else if (columnMapping.value.channel === 'height') {
          // 如果是 height 通道，只乘 heightRatio
          newScaleY = currentScaleY * heightRatio
        }

        obj.set({
          scaleX: newScaleX,
          scaleY: newScaleY
        })
 
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
        const { normalized, mappingChannel, defaultSize } = getNormalizationParams(obj.get('markerId'))

        const currentWidth = obj.width || obj.getScaledWidth()
        const currentHeight = obj.height || obj.getScaledHeight()
        const normalizedValue = normalized[i - 1]
        const currentSize = Math.max(currentWidth || 1, currentHeight || 1)

        // 默认先根据 defaultSize 等比例缩放
        let scaleX = defaultSize / currentSize
        let scaleY = defaultSize / currentSize

        if (mappingChannel === 'width') {
          scaleX = normalizedValue / currentSize
          scaleX *= widthScale.value
        } else if (mappingChannel === 'height') {
          scaleY = normalizedValue / currentSize
          scaleY *= heightScale.value
        } else if (mappingChannel === 'size') {
          scaleX = normalizedValue / currentSize
          scaleY = normalizedValue / currentSize
          scaleX *= sizeScale.value
          scaleY *= sizeScale.value
        }

        obj.set({
          scaleX,
          scaleY
        }) 

      }
    })
    canvas.renderAll()
  }
  // 监听缩放系数变化
  watch([widthScale, heightScale, sizeScale], () => {
    updateAllMarkersScale()
  })
  watch(() => columnMapping.value.channel, () => {
    changeMappingChannel()
  })
  watch(()=>columnMapping.value.column, () => {
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

  // 设置列的映射通道
  function setColumnMapping(columnName: string, channel: 'width' | 'height' | 'size' | null) {
    // 如果设置为 null，直接清除映射
    if (channel === null) {
      columnMapping.value = { column: null, channel: null }
      return
    }

    // 设置新的映射（由于三者互斥，直接覆盖即可）
    columnMapping.value = { column: columnName, channel }
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

    // 获取映射的列名和通道
    const mappedColumn = columnMapping.value.column
    const mappedChannel = columnMapping.value.channel

    // 定义归一化范围（用于宽模式下的高和高模式下的宽）
    const minDisplaySize = 20  // 最小显示尺寸
    const maxDisplaySize = 100  // 最大显示尺寸
    const defaultSize = 60  // 默认尺寸

    // 只用一个列表记录选中列的数据（包括非数值列全1的处理后的数据）
    const columnValues: number[] = []
    
    data.forEach((row: any) => {
      if (mappedColumn && row[mappedColumn] !== undefined) {
        const value = parseFloat(row[mappedColumn])
        // 如果是非数值列，视为 1
        const numValue = !isNaN(value) && value > 0 ? value : 1
        columnValues.push(numValue)
      } else {
        // 如果没有映射，默认使用 1
        columnValues.push(1)
      }
    })

    // 计算归一化参数
    const minValue = columnValues.length > 0 ? Math.min(...columnValues) : 1
    const maxValue = columnValues.length > 0 ? Math.max(...columnValues) : 1

    // 归一化函数：将原始值映射到 [minDisplaySize, maxDisplaySize] 范围
    const normalize = (value: number, min: number, max: number): number => {
      if (max === min) return (minDisplaySize + maxDisplaySize) / 2  // 如果所有值相同，返回中间值
      return minDisplaySize + ((value - min) / (max - min)) * (maxDisplaySize - minDisplaySize)
    }

    // 归一化后的值列表
    const normalized = columnValues.map((value: number) => {
      return normalize(value, minValue, maxValue)
    })

    return {
      data,
      normalized,
      mappingChannel: mappedChannel,
      defaultSize
    }
  }


  return {
    widthScale,
    heightScale,
    sizeScale,
    columnMapping,
    setCanvas,
    setWidthScale,
    setHeightScale,
    setSizeScale,
    setColumnMapping,
    resetScales,
    updateAllMarkersScale,
    changeMappingChannel,
    getNormalizationParams

  }
})

