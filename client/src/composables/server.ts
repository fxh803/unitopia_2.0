import { useCollageSeriesStore } from '~/stores/collageSeries'
import { Canvas, FabricImage } from 'fabric'
import * as fabric from 'fabric'
import { storeToRefs } from 'pinia'
import { useTableStore, type ColumnFilterCard } from '~/stores/table'
import { useAnimationStore } from '~/stores/animation'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useMarkerStore } from '~/stores/marker'
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useCanvasStore } from '~/stores/canvas'
import { useContainerStore } from '~/stores/container'
import { useHoverInfoPanelStore } from '~/stores/hoverInfoPanel'
import { ElMessage } from 'element-plus'
// 定义数据类型接口
interface ProcessedData {
  markers: Array<{
    thumbnail: string
    markerId: string
    pos: Array<{ x: number, y: number }>
    width: number[]
    height: number[]
    angle: number[] // 弧度制
    colors: string[] | null // 颜色数组，如果映射是color则收集，否则为null
  }> // base64 字符串数组
  container: string // 整个画布的 base64（隐藏除 container 元素以外的对象）
  emitter: Array<{ x: number; y: number }>
  forces: Array<{
    type: 'pointForce' | 'fieldForce'
    coordinates?: Array<{ x: number; y: number }> // pointForce 的坐标
    rotation?: number // fieldForce 的旋转角度
  }>
  dataBinding: Array<{ data: Array<any>, markerId: string}>
  // 每个 slide 的个性化设置
  iterations?: number
  render_size?: number
  rotation?: boolean
  orientation?: 'free' | 'center'
  hole?: boolean
  margin?: number
  emitter_type?: string
}
const ip = 'http://localhost:4444'



// 收集所有总览数据的函数
export async function collectAllSlidesData(): Promise<Array<{overviewId: string, slides: ProcessedData[]}>> {
  console.log('开始收集')
  const collageSeriesStore = useCollageSeriesStore()
  const { currentOverviewIndex } = storeToRefs(collageSeriesStore)
  const containerStore = useContainerStore()
  //清空container记录
  containerStore.clearAllRecords()
  const overviewsResult = []
  try {
    // 遍历所有总览
    for (let overviewIdx = 0; overviewIdx < collageSeriesStore.overviews.length; overviewIdx++) {
      if (overviewIdx !== currentOverviewIndex.value) {//这个是只进行当前overview的代码段，注意
        continue
      }
      const overview = collageSeriesStore.overviews[overviewIdx]
      const slidesResult = []

      // 遍历当前总览的所有幻灯片
      for (let slideIdx = 0; slideIdx < overview.collageSeries.length; slideIdx++) {
        const slide = overview.collageSeries[slideIdx]
        // 跳过 isResult 为 true 的 slide
        if ((slide as any).isResult === true) {
          continue
        }

        const result: ProcessedData = {
          markers: [],
          container: '',
          emitter: null,
          forces: []
        }
        const canvas = collageSeriesStore.canvasRef?.()
        //新建临时画布
        // 画布大小与原fabric画布一致
        const originalWidth = canvas.width
        const originalHeight = canvas.height

        const tempCanvas = new Canvas(null, {
          width: originalWidth,
          height: originalHeight
        })
        //加载幻灯片数据
        await tempCanvas.loadFromJSON(slide.json)
        tempCanvas.backgroundColor = '#fffef8'
        collageSeriesStore.restoreCustomProperties(tempCanvas, slide.dataTypeArray, slide.markerIdArray, slide.clusterIdArray, slide.forceTypeArray, slide.dataArray || [])
        result.markers = processMarker(tempCanvas)
        result.forces = processForce(tempCanvas)
        result.emitter = processEmitter(tempCanvas)
        result.container = processContainer(tempCanvas)
        result.dataBinding = processDataBinding(tempCanvas)
        // 注入当前 slide 的个性化设置
        const slideSettings = slide as any
        result.iterations = slideSettings.iterations ?? 150
        result.render_size = slideSettings.render_size ?? 1000
        result.rotation = slideSettings.rotation ?? true
        result.orientation = slideSettings.orientation ?? 'free'
        result.hole = slideSettings.hole ?? false
        result.margin = slideSettings.margin ?? 0
        result.emitter_type = slideSettings.emitter_type ?? ''

        // 将container信息记录到store中
        if (result.container) {
          containerStore.addContainerRecord(
            overview.overviewId,
            overviewIdx,
            slide.slideId,
            slideIdx,
            result.container
          )
        }

        slidesResult.push(result)
      }

      overviewsResult.push({
        overviewId: overview.overviewId,
        slides: slidesResult
      })
    }
    console.log('数据收集完成')
    return overviewsResult

  } catch (error) {
    console.error('收集总览数据时出错:', error)
    throw error
  }
}

// 处理 marker 对象
function processMarker(tempCanvas: Canvas) {
  const canvasObjects = tempCanvas.getObjects()

  // 先获取所有不重复的markerId
  const uniqueMarkerIds = new Set<string>()
  for (const obj of canvasObjects) {
    if (obj.get('dataType') === 'marker') {
      const markerId = obj.get('markerId')
      if (markerId) {
        uniqueMarkerIds.add(markerId)
      }
    }
  }

  // 获取 table store 以检查 filter encoding
  const tableStore = useTableStore()
  
  // 创建一个函数来根据 cluster_id 获取对应的 filter encoding
  const getFilterEncoding = (clusterId: string) => {
    if (!clusterId) return null
    
    // 遍历所有 card 的 filters，找到匹配的 filter
    for (const card of tableStore.columnFilterCards) {
      const filter = card.filters.find(f => f.id === clusterId)
      if (filter && filter.encoding) {
        return filter.encoding
      }
    }
    return null
  }

  // 从 group 对象中获取颜色（优先 stroke，其次 fill）
  const getColorFromGroup = (group: any): string | null => {
    if (!group || typeof group.getObjects !== 'function') return null
    
    const objects = group.getObjects()
    for (const obj of objects) {
      // 优先返回 stroke 颜色
      if (obj.stroke && obj.stroke !== 'transparent' && obj.stroke !== 'rgba(0,0,0,0)') {
        return obj.stroke
      }
      // 其次返回 fill 颜色
      if (obj.fill && obj.fill !== 'transparent' && obj.fill !== 'rgba(0,0,0,0)') {
        return obj.fill
      }
    }
    return null
  }

  // 为每个唯一的markerId收集位置信息和尺寸
  const markers: Array<{
    thumbnail: string
    markerId: string
    pos: Array<{ x: number, y: number }>
    widths: number[]
    heights: number[]
    angles: number[]
    colors: string[] | null
  }> = []

  for (const markerId of uniqueMarkerIds) {
    // 收集该markerId的所有位置和对应的尺寸
    const positions: Array<{ x: number, y: number }> = []
    const widths: number[] = []
    const heights: number[] = []
    const angles: number[] = []
    const colors: string[] = []
    let thumbnail = ''
    let hasColorMapping = false // 标记是否有 color 映射

    for (const obj of canvasObjects) {
      if (obj.get('dataType') === 'marker' && obj.get('markerId') === markerId) {
        // 记录位置
        positions.push({
          x: obj.get('left') || 0,
          y: obj.get('top') || 0
        })

        // 记录每个位置对应的宽高（包含缩放）
        const baseWidth = obj.width || 0
        const baseHeight = obj.height || 0
        const baseSize = Math.max(baseWidth, baseHeight)
        const scaleX = obj.scaleX || 1
        const scaleY = obj.scaleY || 1
        widths.push(scaleX*baseSize) //这里传的是对于正方形bbox的缩放系数
        heights.push(scaleY*baseSize)

        // 记录角度（Fabric.js 中 angle 是度数，转换为弧度）
        const angleDegrees = obj.get('angle') || 0
        const angleRadians = angleDegrees * Math.PI / 180
        angles.push(angleRadians)

        // 检查是否有 color 映射
        const clusterId = obj.get('clusterId')
        if (clusterId) {
          const filterEncoding = getFilterEncoding(clusterId)
          if (filterEncoding?.channel === 'color') {
            hasColorMapping = true
            // 从 group 中获取颜色
            const color = getColorFromGroup(obj)
            colors.push(color || '#000000') // 如果没有颜色，使用默认黑色
          }
        }

        // 只生成一次thumbnail（使用第一个对象）
        if (!thumbnail) {
          obj.set('visible', true)
          obj.set('opacity', 1)
          // 导出前将marker移到画布的左上角
          obj.set('left', obj.width/ 2)
          obj.set('top', obj.height / 2)
          obj.set('scaleX', 1)
          obj.set('scaleY', 1)
          thumbnail = obj.toSVG()
        }
      }
    }

    markers.push({
      thumbnail,
      markerId,
      pos: positions,
      width: widths,
      height: heights,
      angle: angles,
      colors: hasColorMapping ? colors : null
    })
  }

  return markers
}

// 处理整个画布（隐藏除 container 元素以外的对象）
function processContainer(tempCanvas: Canvas) {

  const canvasObjects = tempCanvas.getObjects()
  const containerObjs = canvasObjects.filter(obj => obj.get('dataType') === 'container')
  if (containerObjs.length === 0) {
    return ''
  }

  // 保存原始背景色
  const originalBackgroundColor = tempCanvas.backgroundColor

  // 隐藏所有非 container 对象
  for (const obj of canvasObjects) {
    if (obj.get('dataType') != 'container') {
      obj.set('visible', false)
    }
  }

  // 将背景设置为透明，避免背景被包含在导出的图像中
  tempCanvas.backgroundColor = 'transparent'

  const containerBase64 = tempCanvas.toDataURL({
    format: 'png',
    multiplier: 1
  })

  // 恢复原始背景色
  tempCanvas.backgroundColor = originalBackgroundColor

  // 恢复所有对象的可见性
  for (const obj of canvasObjects) {
    if (obj.get('dataType') != 'container') {
      obj.set('visible', true)
    }
  }
  return containerBase64
}

// 处理 emitter 对象（只能有一个）
function processEmitter(tempCanvas: Canvas) {
  const canvasObjects = tempCanvas.getObjects()
  const controlPoints: Array<{ x: number; y: number }> = []
  for (const obj of canvasObjects) {
    if (obj.get('dataType') === 'emitter') {
      const addedPoints = new Set<string>() // 用于去重
      // 遍历 group 中的所有对象
      obj.getObjects().forEach((groupObj: any) => {
        if (groupObj.type === 'path' && groupObj.path) {
          // 解析路径数据，提取控制点
          const path = groupObj.path
          if (Array.isArray(path)) {
            // 先收集所有点，保持顺序
            const allPoints: Array<{ x: number; y: number }> = []

            path.forEach((segment: any) => {
              if (segment[0] === 'M') {
                // 移动到点 - 起始点
                allPoints.push({ x: segment[1], y: segment[2] })
              } else if (segment[0] === 'C') {
                // 三次贝塞尔曲线 - 两个控制点 + 终点
                allPoints.push({ x: segment[1], y: segment[2] }) // 第一个控制点
                allPoints.push({ x: segment[3], y: segment[4] }) // 第二个控制点
                allPoints.push({ x: segment[5], y: segment[6] }) // 终点
              }
            })

            // 去重但保持顺序
            allPoints.forEach(point => {
              const pointKey = `${point.x},${point.y}`
              if (!addedPoints.has(pointKey)) {
                controlPoints.push(point)
                addedPoints.add(pointKey)
              }
            })
          }
        }
      })

      // 只处理第一个 emitter，退出循环
      break
    }
  }
  return controlPoints
}

// 处理 force 对象
function processForce(tempCanvas: Canvas) {
  const forces: Array<{
    type: 'pointForce' | 'fieldForce'
    coordinates?: Array<{ x: number; y: number }> // pointForce 的坐标
    rotation?: number // fieldForce 的旋转角度
  }> = []
  const canvasObjects = tempCanvas.getObjects()
  for (const obj of canvasObjects) {
    if (obj.get('dataType') === 'force') {
      const forceType = obj.get('forceType')
      if (forceType === 'pointForce') {
        const coordinates = {
          x: obj.left || 0,
          y: obj.top || 0
        }
        forces.push({
          type: 'pointForce',
          coordinates
        })
      } else if (forceType === 'fieldForce') {
        const rotation = obj.angle || 0
        forces.push({
          type: 'fieldForce',
          rotation
        })
      }
    }
  }
  return forces
}

function processDataBinding(tempCanvas: Canvas) {
  const canvasObjects = tempCanvas.getObjects()

  // 先获取所有不重复的markerId
  const uniqueMarkerIds = new Set<string>()
  for (const obj of canvasObjects) {
    if (obj.get('dataType') === 'marker') {
      const markerId = obj.get('markerId')
      if (markerId) {
        uniqueMarkerIds.add(markerId)
      }
    }
  }

  // 再提取dataBindingList，从画布对象一个一个取data
  const dataList : Array<{ data: Array<any>, markerId: string}> = []
  for (const markerId of uniqueMarkerIds) {
    // 收集该markerId的所有data
    const dataArray: Array<any> = []

    for (const obj of canvasObjects) {
      if (obj.get('dataType') === 'marker' && obj.get('markerId') === markerId) {
        // 从对象中提取data
        const data = obj.get('data')
        if (data) {
          dataArray.push(data)
        }
      }
    }

    dataList.push({
      data: dataArray,
      markerId: markerId
    })
  }
  return dataList
}
// 发送数据到后端的函数
 // 批量获取 render txt 文件的 base64 数据
 export async function getRenderTxtData(id: string, collageIdx: number): Promise<string[]> {
  try {
    const response = await fetch(`${ip}/getRenderTxtApi?id=${id}&collage_idx=${collageIdx}`)
    if (!response.ok) {
      console.error('获取 render txt 数据失败:', response.status, response.statusText)
      return []
    }
    const result = await response.json()
    return result.success ? result.data : []
  } catch (error) {
    console.error('获取 render txt 数据出错:', error)
    return []
  }
}
// 轮询处理状态的函数
async function startProgressTimer() {
  const animationStore = useAnimationStore()
  const { process_id, progress_data, result_data ,now_overview_idx, collage_result_type, now_collage_idx, txtArray } = storeToRefs(animationStore)
  try {
    const response = await fetch(`${ip}/fetchProgressApi?id=` + process_id.value)
    if (response.ok) {
      // 解析 JSON 响应
      const result = await response.json()
      if (result.progress) {
        result.progress["now_overview_idx"] = now_overview_idx.value
        result.progress["process_id"] = process_id.value
        result.progress["collage_result_type"] = collage_result_type.value
        progress_data.value.push(result.progress)
        result_data.value.push(result.result)
        animationStore.updateAnimation()
      }
    } else {
      console.error('获取处理状态失败:', response.statusText)
    }
  } catch (error) {
    console.error('轮询处理状态时出错:', error)
  }
}

export async function sendDataToServer(): Promise<boolean> {
  const progressTimer = ref(null)
  const animationStore = useAnimationStore()
  const { process_id, collage_result_type, canvas_width, canvas_height, collaging, totalOverview, now_overview_idx } = storeToRefs(animationStore)
  const selectedModeStore = useSelectedModeStore()
  const fetchInterval = 500
  try {
    animationStore.ip = ip
    // 设置系统为拼贴处理状态
    collaging.value = true
    selectedModeStore.setSelectedMode(null)
    const data = await collectAllSlidesData()
    console.log(data)
    // 将 dataBinding 数据存储到 hoverInfoPanel store
    const hoverInfoPanelStore = useHoverInfoPanelStore()
    const collageSeriesStore = useCollageSeriesStore()

    hoverInfoPanelStore.allData = data.map((overview) => {
      // 根据 overviewId 找到对应的 overview
      const overviewObj = collageSeriesStore.overviews.find(ov => ov.overviewId === overview.overviewId)
      return {
        overviewId: overview.overviewId,
        slides: overview.slides.map((slide, slideIdx) => ({
          slideId: overviewObj?.collageSeries[slideIdx]?.slideId,
          dataBinding: slide.dataBinding || []
        }))
      }
    })
    const containerStore = useContainerStore()
    containerStore.createShiningPaths()
    animationStore.startContainerAnimation()
    totalOverview.value = data.length
    now_overview_idx.value = 0
    for (const overview of data) {//对于每一个总览
      //对于每一个slide检查marker的类型
      for (const slide of overview.slides) {
        slide.markers.forEach((marker: any) => {
          if (marker.thumbnail.includes('data:image/png;base64,')) {
            collage_result_type.value.push('png')
            return
          }
        })
        collage_result_type.value.push('svg')
      }

      const time = Math.floor(Date.now() / 1000)
      process_id.value = time.toString()
      const collageSeriesStore = useCollageSeriesStore()
      const canvas = collageSeriesStore.canvasRef?.()
      const originalWidth = canvas.width
      const originalHeight = canvas.height
      canvas_width.value = originalWidth
      canvas_height.value = originalHeight
      const sendData = {
        "data": overview.slides,
        "id": time,
        "canvasWidth": originalWidth,
        "canvasHeight": originalHeight
      }
      progressTimer.value = setInterval(() => {
        startProgressTimer()
      }, fetchInterval)

      try {
        // 这里实现向后端发送数据的逻辑
        const response = await fetch(`${ip}/processDataApi`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sendData)
        })

        if (!response.ok) {
          clearInterval(progressTimer.value)
          // 出错时停止拼贴处理状态
          collaging.value = false
          return false
        }

        clearInterval(progressTimer.value)
        if (now_overview_idx.value < totalOverview.value - 1) {
          animationStore.nextOverview()
        }
      } catch (error) {
        console.error(`处理 overview ${time} 时出错:`, error)
        clearInterval(progressTimer.value)
        collaging.value = false
        return false
      }
    }
    collaging.value = false
    // 所有overview都处理完成后，停止拼贴处理状态并触发重绘
    const canvasStore = useCanvasStore()
    await canvasStore.renderResult()

    return true
  } catch (error) {
    console.error('发送数据时出错:', error)
    // 出错时也要停止拼贴处理状态
    collaging.value = false
    clearInterval(progressTimer.value)
    return false
  }
}

export async function sendUploadContainerToServer(stringBase64: string) {
  const canvasStore = useCanvasStore()
  const { containerColor } = storeToRefs(canvasStore)
  const response = await fetch(`${ip}/uploadContainerApi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 'container': stringBase64, 'containerColor': containerColor.value })
  })
  if (response.ok) {
    // 解析 JSON 响应
    const result = await response.json()
    if (result.container) {
      return result.container
    }
  } else {
    console.error('获取处理状态失败:', response.statusText)
  }
  return ''
}
export function pharseData(card: ColumnFilterCard | null) {
  const combinedData: any[] = []

  if (!card) {
    return combinedData
  }

  // 遍历所有 columnFilterCards，找出 isSelected 为 true 的 filter，收集它们的数据
  for (const filter of card.filters) {
    if (filter.isSelected && filter.data && filter.data.length > 0) {
      combinedData.push(...filter.data)
    }
  }

  // 返回合并后的数据
  return combinedData
}
export async function handleMarkerDropCanvas(pos: [number,number], card: ColumnFilterCard | null = null) {
  const collageSeriesStore = useCollageSeriesStore()
  const canvas = collageSeriesStore.canvasRef?.()
  const container = processContainer(canvas)


  const data = pharseData(card)
  const response = await fetch(`${ip}/markerDropApi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      {
        'markerData': data,
        'container': container,
        'pos': pos
      }
    )
  })
  if (response.ok) {
    const result = await response.json()
    if (result.init_pos) {
      return result

    }
  } else {
    console.error('获取处理状态失败:', response.statusText)
  }
}


