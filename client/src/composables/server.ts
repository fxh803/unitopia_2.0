import { useCollageSeriesStore } from '~/stores/collageSeries'
import { Canvas } from 'fabric'
import { storeToRefs } from 'pinia'
import { useTableStore } from '~/stores/table'
import { useAnimationStore } from '~/stores/animation'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useMarkerStore } from '~/stores/marker'
import { useCanvasModeStore } from '~/stores/canvasMode'
// 定义数据类型接口
interface ProcessedData {
  markers: Array<{
    thumbnail: string
    markerId: string
  }> // base64 字符串数组
  container: string // 整个画布的 base64（隐藏除 container 元素以外的对象）
  emitter: Array<{ x: number; y: number }>
  forces: Array<{
    type: 'pointForce' | 'fieldForce'
    coordinates?: Array<{ x: number; y: number }> // pointForce 的坐标
    rotation?: number // fieldForce 的旋转角度
  }>
  dataBinding: Array<{
    data: Array<any>
    markerId: string
    visualEncoding: any
    dataField: string
  }>
}

// 收集所有幻灯片数据的函数
export async function collectAllSlidesData(): Promise<ProcessedData> {
  console.log('开始收集')
  const collageSeriesStore = useCollageSeriesStore()

  const resultList = []
  try {
    // 遍历所有幻灯片
    for (let i = 0; i < collageSeriesStore.collageSeries.length; i++) {
      const result: ProcessedData = {
        markers: [],
        container: '',
        emitter: null,
        forces: [],
        dataBinding: []
      }
      const slide = collageSeriesStore.collageSeries[i]
      const canvas = collageSeriesStore.canvasRef?.()
      //新建临时画布
      // 画布大小与原fabric画布一致
      const originalWidth = canvas.width
      const originalHeight = canvas.height

      const tempCanvas = new Canvas(document.createElement('canvas'), {
        width: originalWidth,
        height: originalHeight
      })
      //加载幻灯片数据
      await tempCanvas.loadFromJSON(slide.json)
      //渲染画布
      tempCanvas.renderAll()
      collageSeriesStore.restoreCustomProperties(tempCanvas, slide.dataTypeArray, slide.markerIdArray, slide.forceTypeArray, slide.uploadTypeArray)
      result.markers = processMarker(tempCanvas)
      result.forces = processForce(tempCanvas)
      result.emitter = processEmitter(tempCanvas)
      result.container = processContainer(tempCanvas)
      result.dataBinding = processDataBinding(tempCanvas)
      resultList.push(result)
    }
    console.log('数据收集完成')
    return resultList

  } catch (error) {
    console.error('收集幻灯片数据时出错:', error)
    throw error
  }
}

// 处理 marker 对象
function processMarker(tempCanvas: Canvas) {
  //解析对应索引的幻灯片
  const markers: Array<{
    thumbnail: string
    markerId: string
  }> = []
  const canvasObjects = tempCanvas.getObjects()
  for (const obj of canvasObjects) {
    if (obj.get('dataType') === 'marker') {
      obj.set('visible', true)
      obj.set('opacity', 1)
      if (obj.get('uploadType') === 'marker_png') {
        const thumbnail = obj.toDataURL({
          format: 'png',
          multiplier: 1
        })
        markers.push({
          thumbnail,
          markerId: obj.get('markerId')
        })
      }
      else {
        // 导出 SVG 格式的 marker
        //导出前将marker移到画布的左上角
        obj.set('left', obj.width / 2)
        obj.set('top', obj.height / 2)
        const svgString = obj.toSVG()
        markers.push({
          thumbnail: svgString,
          markerId: obj.get('markerId')
        })
      }
    }
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
// 处理数据绑定
function processDataBinding(tempCanvas: Canvas) {
  const canvasObjects = tempCanvas.getObjects() 
  const dataBindingList: Array<{ data: Array<any>, markerId: string, visualEncoding: any }> = []
  for (const obj of canvasObjects) {
    if (obj.get('dataType') === 'marker') {
      const markerId = obj.get('markerId')
      const markerStore = useMarkerStore()
      const markersData = markerStore.markers.find(m => m.id === markerId)
      const visualEncoding = markersData.mapping.visualEncoding
      const data = pharseData(markerId)
      dataBindingList.push({
        data: data,
        markerId: markerId,
        visualEncoding: visualEncoding
      })
    }
  }
  return dataBindingList
}

// 发送数据到后端的函数
// 轮询处理状态的函数
async function startProgressTimer() {
  const animationStore = useAnimationStore()
  const { process_id, progress_data, result_data } = storeToRefs(animationStore)
  try {
    const response = await fetch('http://localhost:5000/fetchProgressApi?id=' + process_id.value)
    if (response.ok) {
      // 解析 JSON 响应
      const result = await response.json()
      if (result.progress) {
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
  const animationStore = useAnimationStore()
  const { process_id, progressTimer, collage_result_type, canvas_width, canvas_height, collaging } = storeToRefs(animationStore)
  const selectedModeStore = useSelectedModeStore()
  try {
    // 设置系统为拼贴处理状态
    collaging.value = true
    selectedModeStore.setSelectedMode(null)

    const data = await collectAllSlidesData()
    for (const [index, subData] of data.entries()) {//对于每一个slide
      subData.markers.forEach((marker: any) => {
        if (marker.thumbnail.includes('data:image/png;base64,')) {
          collage_result_type.value.push('png')
          return
        }
      })
      if (collage_result_type.value[index] === undefined) {
        collage_result_type.value.push('svg')
      }
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
      "data": data,
      "id": time,
      "canvasWidth": originalWidth,
      "canvasHeight": originalHeight
    }
    console.log(sendData)
    progressTimer.value = setInterval(() => {
      startProgressTimer()
    }, 2000)
    // 这里实现向后端发送数据的逻辑
    const response = await fetch('http://localhost:5000/processDataApi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendData)
    })
    console.log(response)

    if (response.ok) {
      clearInterval(progressTimer.value)
      // 停止拼贴处理状态
      collaging.value = false
      return true
    } else {
      clearInterval(progressTimer.value)
      // 出错时也要停止拼贴处理状态
      collaging.value = false
      return false
    }
  } catch (error) {
    console.error('发送数据时出错:', error)
    // 出错时也要停止拼贴处理状态
    collaging.value = false
    clearInterval(progressTimer.value)
    return false
  }
}

export async function sendUploadContainerToServer(stringBase64: string) {
  const canvasModeStore = useCanvasModeStore()
  const { containerColor } = storeToRefs(canvasModeStore)
  const response = await fetch('http://localhost:5000/uploadContainerApi', {
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
function pharseData(markerId: string) {
  const markerStore = useMarkerStore()
  const tableStore = useTableStore()
  const tableData = tableStore.tableData
  const markersData = markerStore.markers.find(m => m.id === markerId)
  const dataField = markersData.mapping.dataField
  const dataRange = markersData.mapping.dataRange
  const visualEncoding = markersData.mapping.visualEncoding
  const data: any[] = []
  // 用 slice 保证顺序和 dataRange 匹配
  const tableRow = tableData.slice(dataRange.start - 1, dataRange.end)
  tableRow.forEach((row: any) => {
    data.push(row[dataField])
  })
  return data
}
export async function handleMarkerDropCanvas(markerId: string,pos: [number,number]) {
  const collageSeriesStore = useCollageSeriesStore()
  const canvas = collageSeriesStore.canvasRef?.()
  const container = processContainer(canvas)
  const data = pharseData(markerId)  
  const response = await fetch('http://localhost:5000/markerDropApi', {
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
      return result.init_pos
      
    }
  } else {
    console.error('获取处理状态失败:', response.statusText)
  }
}
