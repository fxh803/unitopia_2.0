import { useCollageSeriesStore } from '~/stores/collageSeries'
import { Canvas } from 'fabric'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'
import { useAnimationStore } from '~/stores/animation'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useCanvasStore } from '~/stores/canvas'
import { useContainerAnimationStore } from '~/stores/containerAnimation'
import { useHoverInfoPanelStore } from '~/stores/hoverInfoPanel'
import { useMarkInstanceStore } from '~/stores/markInstance'
// 定义数据类型接口
interface ProcessedData {
  markers: Array<{
    thumbnail: string
    markerId: string
    pos: Array<{ x: number, y: number }>
    widths: number[]
    heights: number[]
    angles: number[] // 弧度制
    colors: string[] | null // 颜色数组，如果映射是color则收集，否则为null
  }> // base64 字符串数组
  container: string // 整个画布的 base64（隐藏除 container 元素以外的对象）
  // emitter 控制点（从 emitter 的 path 中解析；旧版后端依赖）
  emitter: Array<{ x: number; y: number }> | null
  forces: Array<{
    type: 'pointForce' | 'fieldForce'
    coordinates?: { x: number; y: number } // pointForce 的坐标
    rotation?: number // fieldForce 的旋转角度
  }>
  dataBinding: Array<{ data: Array<any>, markerId: string}>
  // 每个 slide 的个性化设置
  iterations?: number
  rotation?: boolean
  orientation?: 'free' | 'center'
  hole?: boolean
  margin?: number
  emitter_type?: string
}
export const ip = 'https://unitopia.scii.online'
// export const ip = 'http://localhost:4444'


// 收集「当前总览」所有 slide 的数据
export async function collectAllSlidesData(): Promise<ProcessedData[]> {
  console.log('开始收集当前总览数据')
  const collageSeriesStore = useCollageSeriesStore()
  const containerStore = useContainerAnimationStore()
  //清空container记录
  containerStore.clearAllRecords()
  try {
    const { currentOverviewIndex } = storeToRefs(collageSeriesStore)
    const overviewIdx = currentOverviewIndex.value
    const overview = collageSeriesStore.overviews[overviewIdx]
    if (!overview) return []

    const slidesResult: ProcessedData[] = []
    const canvas = collageSeriesStore.canvasRef?.()
    if (!canvas) return []

    const originalWidth = canvas.width
    const originalHeight = canvas.height

    // 遍历当前总览的所有幻灯片
    for (let slideIdx = 0; slideIdx < overview.collageSeries.length; slideIdx++) {
      const slide = overview.collageSeries[slideIdx]
      // 跳过 isResult 为 true 的 slide
      if ((slide as any).isResult === true) continue

      const result: ProcessedData = {
        markers: [],
        container: '',
        emitter: null,
        forces: [],
        dataBinding: []
      }

      const tempCanvas = new Canvas(undefined, {
        width: originalWidth,
        height: originalHeight
      })
      await tempCanvas.loadFromJSON(slide.json)
      tempCanvas.backgroundColor = '#fffef8'
      collageSeriesStore.restoreCustomProperties(
        tempCanvas,
        slide.dataTypeArray,
        slide.markerIdArray,
        slide.forceTypeArray,
        slide.dataArray || [],
        slide.origOpacityArray || []
      )
      result.markers = processMarker(tempCanvas)
      result.forces = processForce(tempCanvas)
      result.emitter = processEmitter(tempCanvas)
      result.container = processContainer(tempCanvas)
      result.dataBinding = processDataBinding(tempCanvas)

      const slideSettings = slide as any
      result.iterations = slideSettings.iterations ?? 180
      result.rotation = slideSettings.rotation ?? true
      result.orientation = slideSettings.orientation ?? 'free'
      result.hole = slideSettings.hole ?? false
      result.margin = slideSettings.margin ?? 0
      result.emitter_type = slideSettings.emitter_type ?? ''

        // 将container信息记录到store中
      if (result.container) {
        containerStore.addContainerRecord(
          result.container
        )
      }

      slidesResult.push(result)
    }

    console.log('当前总览数据收集完成')
    return slidesResult

  } catch (error) {
    console.error('收集当前总览数据时出错:', error)
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

  // 获取 markInstance store，用于检查 encoding 是否为 color
  const markInstanceStore = useMarkInstanceStore()
  const { markInstances } = storeToRefs(markInstanceStore)

  const hasColorEncodingForMarker = (markerId: string): boolean => {
    const all = markInstances.value
    // 1) 普通 mark：id 与 markerId 相同
    const mark = all.find(m => m.id === markerId)
    if (mark?.encoding?.color) return true

    // 2) group 子实例：在某个父 mark 的 children 里
    const parent = all.find(m => m.children?.some(c => c.id === markerId))
    if (parent) {
      const child = parent.children.find(c => c.id === markerId)
      if (child?.encoding?.color) return true
    }

    return false
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

        // 检查是否有 color 映射：查看对应 mark / 子实例 的 encoding 是否为 color
        if (hasColorEncodingForMarker(markerId)) {
          hasColorMapping = true
          // 从 group 中获取颜色
          const color = getColorFromGroup(obj)
          colors.push(color || '#000000') // 如果没有颜色，使用默认黑色
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
      widths,
      heights,
      angles,
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

// 处理 emitter 对象（只能有一个）：从 group/path 中提取控制点，去重且保序
function processEmitter(tempCanvas: Canvas) {
  const canvasObjects = tempCanvas.getObjects()
  const controlPoints: Array<{ x: number; y: number }> = []

  for (const obj of canvasObjects) {
    if (obj.get('dataType') !== 'emitter') continue

    const addedPoints = new Set<string>() // 去重
    const groupObjects: any[] =
      typeof (obj as any).getObjects === 'function' ? (obj as any).getObjects() : []

    groupObjects.forEach((groupObj: any) => {
      if (groupObj?.type !== 'path' || !groupObj.path) return
      const path = groupObj.path
      if (!Array.isArray(path)) return

      // 先收集所有点，保持顺序
      const allPoints: Array<{ x: number; y: number }> = []
      path.forEach((segment: any) => {
        if (!Array.isArray(segment) || segment.length < 1) return
        const cmd = segment[0]
        if (cmd === 'M') {
          allPoints.push({ x: segment[1], y: segment[2] })
        } else if (cmd === 'C') {
          // 三次贝塞尔：两个控制点 + 终点
          allPoints.push({ x: segment[1], y: segment[2] })
          allPoints.push({ x: segment[3], y: segment[4] })
          allPoints.push({ x: segment[5], y: segment[6] })
        }
      })

      // 去重但保持顺序
      allPoints.forEach((p) => {
        const key = `${p.x},${p.y}`
        if (addedPoints.has(key)) return
        controlPoints.push(p)
        addedPoints.add(key)
      })
    })

    // 只处理第一个 emitter
    break
  }

  return controlPoints
}

// 处理 force 对象
function processForce(tempCanvas: Canvas) {
  const forces: Array<{
    type: 'pointForce' | 'fieldForce'
    coordinates?: { x: number; y: number } // pointForce 的坐标
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
  const { process_id, progress_data, result_data, collage_result_type } = storeToRefs(animationStore)
  try {
    const response = await fetch(`${ip}/fetchProgressApi?id=` + process_id.value)
    if (response.ok) {
      // 解析 JSON 响应
      const result = await response.json()
      if (result.progress) {
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

export async function sendDataToServer() {
  const progressTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const animationStore = useAnimationStore()
  const { process_id, collage_result_type, canvas_width, canvas_height, collaging } = storeToRefs(animationStore)
  const selectedModeStore = useSelectedModeStore()
  const fetchInterval = 500
  try {
    // 设置系统为拼贴处理状态
    collaging.value = true
    selectedModeStore.setSelectedMode(null)
    const slides = await collectAllSlidesData()
    console.log(slides)
    // 将 dataBinding 数据存储到 hoverInfoPanel store
    const hoverInfoPanelStore = useHoverInfoPanelStore()
    const collageSeriesStore = useCollageSeriesStore()
    // allData 仅维护当前 overview 下每个 slide 的数据绑定
    const currentIdx = collageSeriesStore.currentOverviewIndex
    const currentOverview = collageSeriesStore.overviews[currentIdx] as any
    hoverInfoPanelStore.allData = slides.map((slide: any, slideIdx: number) => ({
      slideId: currentOverview?.collageSeries?.[slideIdx]?.slideId,
      dataBinding: slide.dataBinding || [],
    }))

    const containerStore = useContainerAnimationStore()
    containerStore.createShiningPaths()
    animationStore.startContainerAnimation()

    // 只处理当前总览：slides 即为当前 overview 的所有 slides
    if (!slides.length) {
      collaging.value = false
      return
    }

    // 根据 slide markers 判定结果类型
    for (const slide of slides) {
      let isPng = false
      slide.markers.forEach((marker: any) => {
        if (!isPng && marker.thumbnail.includes('data:image/png;base64,') || marker.thumbnail.includes('data:img/png;base64,')) {
          isPng = true
        }
      })
      collage_result_type.value.push(isPng ? 'png' : 'svg')
    }

    const time = Math.floor(Date.now() / 1000)
    process_id.value = time.toString()
    const collageSeries = useCollageSeriesStore()
    const canvas = collageSeries.canvasRef?.()
    if (!canvas) {
      collaging.value = false
      return
    }
    const originalWidth = canvas.width
    const originalHeight = canvas.height
    canvas_width.value = originalWidth
    canvas_height.value = originalHeight
    const sendData = {
      data: slides,
      id: time,
      canvasWidth: originalWidth,
      canvasHeight: originalHeight,
    }

    progressTimer.value = setInterval(() => {
      startProgressTimer()
    }, fetchInterval)

    try {
      const response = await fetch(`${ip}/processDataApi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendData),
      })

      if (!response.ok) {
        clearInterval(progressTimer.value)
        collaging.value = false
        const data = await response.json()
        ElMessage.error(data.message)
        return
      }

      console.log('处理数据成功')
    } catch (error) {
      console.error(`处理 overview ${time} 时出错:`, error)
      clearInterval(progressTimer.value)
      collaging.value = false
    }
    clearInterval(progressTimer.value)
    collaging.value = false
    // 当前 overview 处理完成后，触发结果重绘
    // const canvasStore = useCanvasStore()
    // await canvasStore.renderResult()

  } catch (error) {
    console.error('发送数据时出错:', error)
    // 出错时也要停止拼贴处理状态
    collaging.value = false
    if (progressTimer.value) {
      clearInterval(progressTimer.value)
    }
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

// 处理背景对象，转换为base64（在临时canvas上操作，不影响原canvas）
function processBackground(tempCanvas: Canvas) {
  const canvasObjects = tempCanvas.getObjects()
  const backgroundObjs = canvasObjects.filter(obj => obj.get('dataType') === 'background')

  if (backgroundObjs.length === 0) {
    return ''
  }

  // 保存原始背景色
  const originalBackgroundColor = tempCanvas.backgroundColor

  // 隐藏所有非 background 对象
  for (const obj of canvasObjects) {
    if (obj.get('dataType') !== 'background') {
      obj.set('visible', false)
    }
  }

  // 将背景设置为透明
  tempCanvas.backgroundColor = 'transparent'

  // 将画布转成base64
  const backgroundBase64 = tempCanvas.toDataURL({
    format: 'png',
    multiplier: 1
  })

  // 恢复原始背景色和对象可见性
  tempCanvas.backgroundColor = originalBackgroundColor
  for (const obj of canvasObjects) {
    if (obj.get('dataType') !== 'background') {
      obj.set('visible', true)
    }
  }

  return backgroundBase64
}

// 发送背景到segmentAll接口
// 返回格式: Array<{ mask: string, bbox: { x: number, y: number } }>
export async function sendBackgroundToSegmentAll(canvas: Canvas | null): Promise<Array<{ mask: string, bbox: { x: number, y: number } }> | null> {
  if (!canvas) {
    console.error('Canvas实例未找到')
    return null
  }

  let tempCanvas: Canvas | null = null

  try {
    // 创建临时canvas，避免影响原canvas
    const originalWidth = canvas.width
    const originalHeight = canvas.height

    tempCanvas = new Canvas(undefined, {
      width: originalWidth,
      height: originalHeight
    })

    // 从原canvas导出JSON数据
    const canvasJSON = canvas.toJSON()

    // 加载到临时canvas
    await tempCanvas.loadFromJSON(canvasJSON)
    tempCanvas.backgroundColor = canvas.backgroundColor || '#fffef8'

    // 恢复自定义属性（如果需要）
    const collageSeriesStore = useCollageSeriesStore()
    const currentSlide = collageSeriesStore.collageSeries[collageSeriesStore.currentSlideIndex]
    if (currentSlide) {
      collageSeriesStore.restoreCustomProperties(
        tempCanvas,
        currentSlide.dataTypeArray,
        currentSlide.markerIdArray,
        currentSlide.forceTypeArray,
        currentSlide.dataArray || [],
        currentSlide.origOpacityArray || []
      )
    }

    // 在临时canvas上处理背景，转换为base64
    const backgroundBase64 = processBackground(tempCanvas)

    if (!backgroundBase64) {
      console.error('未找到背景对象或处理失败')
      return null
    }

    // 获取背景对象的bbox
    const backgroundObj = canvas.getObjects().find(obj => obj.get('dataType') === 'background')
    const backgroundBbox = backgroundObj ? backgroundObj.getBoundingRect() : null
    // 获取containerColor
    const canvasStore = useCanvasStore()
    const { containerColor } = storeToRefs(canvasStore)

    // 发送到后端
    const response = await fetch(`${ip}/segmentAll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        background: backgroundBase64,
        containerColor: containerColor.value,
        backgroundBbox: backgroundBbox
      })
    })

    if (!response.ok) {
      console.error('segmentAll请求失败:', response.statusText)
      return null
    }

    const result = await response.json()
    // 返回cropped_masks列表（包含mask和bbox）
    if (result.cropped_masks && Array.isArray(result.cropped_masks)) {
      return result.cropped_masks
    }
    return null
  } catch (error) {
    console.error('segmentAll处理出错:', error)
    return null
  } finally {
    // 确保临时canvas总是被清理
    if (tempCanvas) {
      tempCanvas.dispose()
    }
  }
}

// 发送点击坐标和画布到segmentPoint接口
export async function sendPointToSegmentPoint(canvas: Canvas | null, point: { x: number, y: number }): Promise<{ mask: string, bbox: { x: number, y: number } } | null> {
  if (!canvas) {
    console.error('Canvas实例未找到')
    return null
  }

  let tempCanvas: Canvas | null = null

  try {
    // 创建临时canvas，避免影响原canvas
    const originalWidth = canvas.width
    const originalHeight = canvas.height

    tempCanvas = new Canvas(undefined, {
      width: originalWidth,
      height: originalHeight
    })

    // 从原canvas导出JSON数据
    const canvasJSON = canvas.toJSON()

    // 加载到临时canvas
    await tempCanvas.loadFromJSON(canvasJSON)
    tempCanvas.backgroundColor = canvas.backgroundColor || '#fffef8'

    // 恢复自定义属性（如果需要）
    const collageSeriesStore = useCollageSeriesStore()
    const currentSlide = collageSeriesStore.collageSeries[collageSeriesStore.currentSlideIndex]
    if (currentSlide) {
      collageSeriesStore.restoreCustomProperties(
        tempCanvas,
        currentSlide.dataTypeArray,
        currentSlide.markerIdArray,
        currentSlide.forceTypeArray,
        currentSlide.dataArray || [],
        currentSlide.origOpacityArray || []
      )
    }

    // 在临时canvas上处理背景，转换为base64
    const backgroundBase64 = processBackground(tempCanvas)

    if (!backgroundBase64) {
      console.error('未找到背景对象或处理失败')
      return null
    }

    // 获取containerColor
    const canvasStore = useCanvasStore()
    const { containerColor } = storeToRefs(canvasStore)
    console.log(point)
    // 发送到后端
    const response = await fetch(`${ip}/segmentPoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        background: backgroundBase64,
        containerColor: containerColor.value,
        x: point['x'],
        y: point['y']
      })
    })

    if (!response.ok) {
      console.error('segmentPoint请求失败:', response.statusText)
      return null
    }

    const result = await response.json()
    // 返回mask和bbox
    if (result.mask && result.bbox) {
      return {
        mask: result.mask,
        bbox: result.bbox
      }
    }
    return null
  } catch (error) {
    console.error('segmentPoint处理出错:', error)
    return null
  } finally {
    // 确保临时canvas总是被清理
    if (tempCanvas) {
      tempCanvas.dispose()
    }
  }
}

export async function handleMarkerDropCanvas(pos: [number,number], num: number) {
    const collageSeries = useCollageSeriesStore()
    const canvas = collageSeries.canvasRef?.()
  if (!canvas) return
  const container = processContainer(canvas) 
  const response = await fetch(`${ip}/markerDropApi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      {
        'num': num,
        'container': container,
        'pos': pos
      }
    )
  })
  if (response.ok) {
    const result = await response.json()
    console.log('result', result)
    if (result.init_pos) {
      return result

    }
  } else {
    console.error('获取处理状态失败:', response.statusText)
  }
}


