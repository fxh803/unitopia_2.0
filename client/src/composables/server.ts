import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useOverviewStore } from '~/stores/overview'
import { Canvas } from 'fabric'
import { storeToRefs } from 'pinia'
import { useTableStore } from '~/stores/table'
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
      processMarker(tempCanvas, result, i)
      processForce(tempCanvas, result, i)
      processEmitter(tempCanvas, result, i)
      processContainer(tempCanvas, result, i)
      processDataBinding(result, i)
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
function processMarker(tempCanvas: Canvas, result: ProcessedData, slideIndex: number) {
  //解析对应索引的幻灯片
  const canvasObjects = tempCanvas.getObjects()
  for (const obj of canvasObjects) {
    if (obj.get('dataType') === 'marker') {
      console.log(obj.get('uploadType'))
      if (obj.get('uploadType') === 'marker_svg') {
        // 导出 SVG 格式的 marker
        const svgString = obj.toSVG()
        result.markers.push({
          thumbnail: svgString,
          markerId: obj.get('markerId')
        })
      }
      else {
        const thumbnail = obj.toDataURL({
          format: 'png',
          multiplier: 1
        })
        result.markers.push({
          thumbnail,
          markerId: obj.get('markerId')
        })
      }

    }
  }
}

// 处理整个画布（隐藏除 container 元素以外的对象）
function processContainer(tempCanvas: Canvas, result: ProcessedData, slideIndex: number) {
  
  const canvasObjects = tempCanvas.getObjects()
  const containerObjs = canvasObjects.filter(obj => obj.get('dataType') === 'container')
  if (containerObjs.length === 0) {
    result.container = ''
    return
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
  result.container = containerBase64
}

// 处理 emitter 对象（只能有一个）
function processEmitter(tempCanvas: Canvas, result: ProcessedData, slideIndex: number) {
  const canvasObjects = tempCanvas.getObjects()
  for (const obj of canvasObjects) {
    if (obj.get('dataType') === 'emitter') {
      const controlPoints: Array<{ x: number; y: number }> = []
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

      // 设置结果
      result.emitter = controlPoints

      // 只处理第一个 emitter，退出循环
      break
    }
  }
}

// 处理 force 对象
function processForce(tempCanvas: Canvas, result: ProcessedData, slideIndex: number) {
  const canvasObjects = tempCanvas.getObjects()
  for (const obj of canvasObjects) {
    if (obj.get('dataType') === 'force') {
      const forceType = obj.get('forceType')
      if (forceType === 'pointForce') {
        const coordinates = {
          x: obj.left || 0,
          y: obj.top || 0
        }
        result.forces.push({
          type: 'pointForce',
          coordinates
        })
      } else if (forceType === 'fieldForce') {
        const rotation = obj.angle || 0
        result.forces.push({
          type: 'fieldForce',
          rotation
        })
      }
    }
  }
}
// 处理数据绑定
function processDataBinding(result: ProcessedData, slideIndex: number) {
  const collageSeriesStore = useCollageSeriesStore()
  const overviewStore = useOverviewStore()
  const { dataBindingSettings } = storeToRefs(overviewStore)
  const slideId = collageSeriesStore.collageSeries[slideIndex].slideId
  const markerData = Array.from(dataBindingSettings.value.entries())
    .filter(([key, value]) => key.startsWith(slideId))
    .map(([key, value]) => {
      return {
        dataField: value.dataField,
        dataRange: value.dataRange,
        visualEncoding: value.visualEncoding,
        markerId: key.substring(key.indexOf('marker'))
      }
    })
  const tableStore = useTableStore()
  const tableData = tableStore.tableData
  const dataBindingList: Array<{ data: Array<any>, markerId: string, visualEncoding: any }> = []

  markerData.forEach(marker => {
    const temp: any[] = []
    // 用 slice 保证顺序和 dataRange 匹配
    const tableRow = tableData.slice(marker.dataRange.start - 1, marker.dataRange.end)
    tableRow.forEach((row: any) => {
      temp.push(row[marker.dataField])
    })
    dataBindingList.push({
      data: temp,
      markerId: marker.markerId,
      visualEncoding: marker.visualEncoding
    })
  })
  result.dataBinding = dataBindingList
}
// 发送数据到后端的函数
export async function sendDataToServer(): Promise<boolean> {
  try {
    const data = await collectAllSlidesData()
    const time = Math.floor(Date.now() / 1000)
    const collageSeriesStore = useCollageSeriesStore()
    const canvas = collageSeriesStore.canvasRef?.()
    const originalWidth = canvas.width
    const originalHeight = canvas.height
    const sendData = {
      "data": data,
      "id": time,
      "canvasWidth": originalWidth,
      "canvasHeight": originalHeight
    }
    console.log(sendData)
    // 这里实现向后端发送数据的逻辑
    const response = await fetch('http://localhost:5000/api/process-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendData)
    })

    if (response.ok) {
      console.log('数据发送成功')
      return true
    } else {
      console.error('数据发送失败:', response.statusText)
      return false
    }
  } catch (error) {
    console.error('发送数据时出错:', error)
    return false
  }
}


