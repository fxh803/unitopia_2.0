import { useCollageSeriesStore } from '~/stores/collageSeries'
import { Canvas, FabricImage } from 'fabric'
import * as fabric from 'fabric'
import { storeToRefs } from 'pinia'
import { useTableStore } from '~/stores/table'
import { useAnimationStore } from '~/stores/animation'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useMarkerStore } from '~/stores/marker'
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useCanvasStore } from '~/stores/canvas'
import { useContainerStore } from '~/stores/container'
// 定义数据类型接口
interface ProcessedData {
  markers: Array<{
    thumbnail: string
    markerId: string
    pos: Array<{ x: number, y: number }>
    width: number[]
    height: number[]
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
      if (overviewIdx !== currentOverviewIndex.value) {
        continue
      }
      const overview = collageSeriesStore.overviews[overviewIdx]
      const slidesResult = []
      
      // 遍历当前总览的所有幻灯片
      for (let slideIdx = 0; slideIdx < overview.collageSeries.length; slideIdx++) {
        const result: ProcessedData = {
          markers: [],
          container: '',
          emitter: null,
          forces: []
        }
        const slide = overview.collageSeries[slideIdx]
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
        tempCanvas.backgroundColor = '#ffffff'
        collageSeriesStore.restoreCustomProperties(tempCanvas, slide.dataTypeArray, slide.markerIdArray, slide.forceTypeArray, slide.dataArray || [])
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
  
  // 为每个唯一的markerId收集位置信息和尺寸
  const markers: Array<{
    thumbnail: string
    markerId: string
    pos: Array<{ x: number, y: number }>
    widths: number[]
    heights: number[]
  }> = []
  
  for (const markerId of uniqueMarkerIds) {
    // 收集该markerId的所有位置和对应的尺寸
    const positions: Array<{ x: number, y: number }> = []
    const widths: number[] = []
    const heights: number[] = []
    let thumbnail = ''
    
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
        console.log(baseSize)
        const scaleX = obj.scaleX || 1
        const scaleY = obj.scaleY || 1 
        widths.push(scaleX*baseSize/80) //这里传的是对于正方形bbox的缩放系数
        heights.push(scaleY*baseSize/80) 
        
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
      height:heights
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
  for (const obj of canvasObjects) {
    if (obj.get('dataType') != 'container') {
      obj.set('visible', false)
    }
  }
  const containerBase64 = tempCanvas.toDataURL({
    format: 'png',
    multiplier: 1
  })
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
  
  // 再提取dataBindingList
  const dataList : Array<{ data: Array<any>, markerId: string}> = []
  for (const markerId of uniqueMarkerIds) { 
      const data = pharseData(markerId)
      dataList.push({
        data: data,
        markerId: markerId
      })
  }
  return dataList
}
// 发送数据到后端的函数
// 轮询处理状态的函数
async function startProgressTimer() {
  const animationStore = useAnimationStore()
  const { process_id, progress_data, result_data ,now_overview_idx, collage_result_type } = storeToRefs(animationStore)
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
      console.log(sendData)
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
        console.log(response)

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
    await renderResult()
    
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
export function pharseData(markerId: string) {
  const markerStore = useMarkerStore()
  const tableStore = useTableStore()
  const tableData = tableStore.tableData
  const markersData = markerStore.markers.find(m => m.id === markerId)
  const dataRange = markersData.mapping.dataRange
  // 用 slice 保证顺序和 dataRange 匹配，返回整行数据
  const data = tableData.slice(dataRange.start - 1, dataRange.end)
  return data
}
export async function handleMarkerDropCanvas(markerId: string,pos: [number,number]) {
  const collageSeriesStore = useCollageSeriesStore()
  const canvas = collageSeriesStore.canvasRef?.()
  const container = processContainer(canvas)
  
 
  const data = pharseData(markerId)  
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
    console.log(result)
    if (result.init_pos) {
      return result
      
    }
  } else {
    console.error('获取处理状态失败:', response.statusText)
  }
}

 async function renderResult (){
  const collageSeriesStore = useCollageSeriesStore()
  collageSeriesStore.addNewSlide()
  const canvasStore = useCanvasStore() 
  const animationStore = useAnimationStore()
  const { process_id } = storeToRefs(animationStore)
  
  // 获取canvas实例
  const canvasInstance = canvasStore.canvasRef?.()
  if (canvasInstance && process_id.value) {
    try {
      // // 删除所有现有对象
      // const allObjects = canvasInstance.getObjects()
      // allObjects.forEach(obj => {
      //   canvasInstance.remove(obj)
      // })
      
      // 获取 SVG 文件的 URL
      const svgUrl = `${ip}/workdir/${process_id.value}_result.svg`
      
      // 从 URL 获取 SVG 内容
      const response = await fetch(svgUrl)
      
      const svgString = await response.text()
      
      // 解析 SVG 获取原始尺寸
      const svgParser = new DOMParser()
      const svgDoc = svgParser.parseFromString(svgString, 'image/svg+xml')
      const svgElement = svgDoc.documentElement
      
      // 获取 SVG 的宽度和高度（优先从 viewBox，其次从 width/height 属性）
      let svgWidth = 0
      let svgHeight = 0
      
      const viewBox = svgElement.getAttribute('viewBox')
      if (viewBox) {
        const viewBoxValues = viewBox.split(/\s+|,/).filter(v => v.trim()).map(Number)
        if (viewBoxValues.length >= 4) {
          // viewBox 格式: "x y width height"
          svgWidth = viewBoxValues[2] || 0
          svgHeight = viewBoxValues[3] || 0
        }
      }
      
      if (!svgWidth || !svgHeight) {
        svgWidth = parseFloat(svgElement.getAttribute('width') || '0') || 0
        svgHeight = parseFloat(svgElement.getAttribute('height') || '0') || 0
      }
      
      // 如果仍然无法获取尺寸，默认使用 1000（常见的 render_size）
      if (!svgWidth || !svgHeight) {
        svgWidth = 1000
        svgHeight = 1000
      }
      
      // 使用 Fabric.js 加载 SVG
      const loadedSVG = await fabric.loadSVGFromString(svgString)
      
      // 计算缩放比例（根据画布尺寸和 SVG 尺寸）
      const canvasWidth = canvasInstance.width || 400
      const canvasHeight = canvasInstance.height || 400
      const scaleX = canvasWidth / svgWidth
      const scaleY = canvasHeight / svgHeight
      const scale = Math.min(scaleX, scaleY, 1) // 确保不放大，只缩小
      
      // 将所有 SVG 对象添加到画布，并应用统一的缩放比例，保持它们的原始相对位置
      loadedSVG.objects.forEach((obj: any) => {
        // 对每个对象的位置和尺寸应用缩放
        if (obj.left !== undefined) {
          obj.set('left', obj.left * scale)
        }
        if (obj.top !== undefined) {
          obj.set('top', obj.top * scale)
        }
        // 应用缩放
        const currentScaleX = (obj.scaleX || 1) * scale
        const currentScaleY = (obj.scaleY || 1) * scale
        obj.set({
          scaleX: currentScaleX,
          scaleY: currentScaleY,
          selectable: false,
          evented: false
        })
        canvasInstance.add(obj)
      })
      
      // 重新渲染画布
      canvasInstance.renderAll()
      
      console.log('SVG 结果已成功加载到画布')
      
    } catch (error) {
      console.error('加载 SVG 结果失败:', error)
    }
  }
}
