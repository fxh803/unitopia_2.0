import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTableStore } from '~/stores/table'
import { Canvas } from 'fabric'
import { storeToRefs } from 'pinia'
import { useCollageSeriesStore } from '~/stores/collageSeries'
export const useOverviewStore = defineStore('overview', () => {
  const tableStore = useTableStore()
  const collageSeriesStore = useCollageSeriesStore()
  const {stopListen} = storeToRefs(collageSeriesStore)
  const canvasRef = ref<(() => Canvas | null) | null>(null)

  // 设置 canvas 引用
  function setCanvas(canvas: () => Canvas | null) {
    canvasRef.value = canvas
  }

  // Marker 对象的数据结构
  interface MarkerObject {
    id: string
    object: any // Fabric.js 对象
    thumbnail: string // 缩略图
    visualEncoding: 'size' | 'width' | 'height'
    dataField: string
    dataRange: {
      start: number
      end: number
    }
  }

  // 响应式数据
  const markerObjects = ref<MarkerObject[]>([])


  // 获取所有 marker 对象
  const getMarkerObjects = async () => { 
    const canvas = canvasRef.value?.()
    if (!canvas) { 
      return []
    }

    const objects = canvas.getObjects()
    console.log('画布对象总数:', objects.length)
    
    const markerObjects = objects.filter(obj => {
      const dataType = obj.get('dataType') 
      return dataType === 'marker'
    })
    
    console.log('找到 marker 对象数量:', markerObjects.length)
    
    // 并行处理所有缩略图生成
    const markerDataPromises = markerObjects.map(async (obj, index) => {
      // 生成缩略图 
      const thumbnail = await generateThumbnail(obj) 
      
      return {
        id: `marker-${index}`,
        object: obj,
        thumbnail,
        visualEncoding: 'size' as const,
        dataField: '',
        dataRange: {
          start: -1,
          end: -1
        }
      }
    })
    
    return Promise.all(markerDataPromises)
  }

  // 生成缩略图
  async function generateThumbnail(obj: any) {
    const canvas = canvasRef.value?.()
    if (!canvas) return ''

    try {
      // 创建一个临时的 Fabric.js canvas 来渲染对象
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 60
      tempCanvas.height = 60

      const tempFabricCanvas = new Canvas(tempCanvas, {
        width: 60,
        height: 60,
        backgroundColor: '#f5f5f5'
      })

      // 克隆对象以避免修改原对象
      // 克隆对象
      const clonedObj = await obj.clone();
      if (!clonedObj || typeof clonedObj.set !== 'function') {
        console.error('克隆失败或克隆对象无效:', clonedObj)
        return ''
      }
      const originWidth = clonedObj.width
      const originHeight = clonedObj.height
      // 计算缩放比例，确保对象适合缩略图 
      const scaleX = 50 / Math.max(originWidth, 1)
      const scaleY = 50 / Math.max(originHeight, 1)
      const scale = Math.min(scaleX, scaleY, 1) // 不超过原始大小

      clonedObj.set('left', 30)
      clonedObj.set('top', 30)
      clonedObj.set('scaleX', scale)
      clonedObj.set('scaleY', scale)
      clonedObj.set('originX', 'center')
      clonedObj.set('originY', 'center')
      // 添加到临时画布
      tempFabricCanvas.add(clonedObj)
      tempFabricCanvas.renderAll()

      // 获取缩略图
      const thumbnail = tempFabricCanvas.toDataURL({
        format: 'png',
        multiplier: 1
      })

      // 清理临时画布
      tempFabricCanvas.dispose()

      return thumbnail
    } catch (error) {
      console.error('生成缩略图失败:', error)
      return ''
    }
  }

  // 更新 marker 对象列表
  const updateMarkerObjects = async () => {
    console.log('updateMarkerObjects')
    if(stopListen.value){
      console.log('stopListen')
      return
    }
    markerObjects.value = await getMarkerObjects()
  }

  // 处理视觉编码变化
  const handleVisualEncodingChange = (markerId: string, encoding: 'size' | 'width' | 'height') => {
    const marker = markerObjects.value.find(m => m.id === markerId)
    if (marker) {
      marker.visualEncoding = encoding
    }
  }

  // 处理数据字段变化
  const handleDataFieldChange = (markerId: string, field: string) => {
    const marker = markerObjects.value.find(m => m.id === markerId)
    if (marker) {
      marker.dataField = field
    }
  }

  // 处理数据范围变化
  const handleDataRangeChange = (markerId: string, start: number, end: number) => {
    const marker = markerObjects.value.find(m => m.id === markerId)
    if (marker) {
      marker.dataRange = { start, end }
    }
  }
 



  // 计算属性
  const markerCount = computed(() => markerObjects.value.length)
  const hasMarkers = computed(() => markerCount.value > 0)

  return {
    // 状态
    markerObjects,
    // 计算属性
    markerCount,
    hasMarkers,

    // 方法
    updateMarkerObjects,
    handleVisualEncodingChange,
    handleDataFieldChange,
    handleDataRangeChange,   
    setCanvas
  }
}) 