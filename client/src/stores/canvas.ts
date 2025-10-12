import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useBezierDrawingStore } from '~/stores/bezierDrawing'
import { useBackgroundStore } from '~/stores/background'
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useDataScaleStore } from '~/stores/dataScale'
import { Group } from 'fabric'
import { handleMarkerDropCanvas, pharseData } from '~/composables/server'
import * as fabric from 'fabric'
export const useCanvasStore = defineStore('canvas', () => {
  const canvasRef = ref<(() => Canvas | null) | null>(null)
  const containerColor = ref([130, 130, 130, 0.6])
  
  // 导入其他 store
  const selectedModeStore = useSelectedModeStore()
  const bezierDrawingStore = useBezierDrawingStore()
  const backgroundStore = useBackgroundStore()
  const canvasModeStore = useCanvasModeStore()
  const dataScaleStore = useDataScaleStore()

  // 设置 canvas 引用
  function setCanvas(canvas: () => Canvas | null) {
    canvasRef.value = canvas
  }

  function setDrawedObjectDataType(e) {
    // 监听绘制完成事件，为绘制的路径设置dataType
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return 
    // object:added 事件中，对象在 e.target 中
    const path = e.target; 
    if (path) {
      // 如果是贝塞尔模式，创建多段贝塞尔曲线
      if (canvasModeStore.mode === 'bezier') {
        // 检查是否正在创建贝塞尔曲线，防止递归调用
        if (!bezierDrawingStore.isCreatingBezier) {
          bezierDrawingStore.createBezierFromPath(path)
        }
        return
      }
      if (backgroundStore.creatingBackground) {
        path.set('dataType', 'background')
        return
      }
      if(path.get('dataType') === 'marker'){ 
        return
      }
      // 根据当前选择的模式设置dataType
      path.set('dataType', selectedModeStore.selectedMode);

      // 应用当前模式的透明度规则
      selectedModeStore.handleModeSwitch(selectedModeStore.selectedMode);
    }
  }

  function adjustLayer() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return
    
    // 获取画布上的所有对象
    const objects = canvasInstance.getObjects()
    
    // 按 dataType 分组对象
    const backgroundObjects = []
    const containerObjects = []
    const otherObjects = []
    
    objects.forEach(obj => {
      const dataType = obj.get('dataType')
      if (dataType === 'background') {
        backgroundObjects.push(obj)
      } else if (dataType === 'container') {
        containerObjects.push(obj)
      } else {
        otherObjects.push(obj)
      }
    })
    console.log(backgroundObjects,containerObjects,otherObjects)
    // 将 background 对象移动到最底层
    backgroundObjects.forEach(obj => {
      canvasInstance.sendObjectToBack(obj, true)
    })
    
    // 将 container 对象移动到 background 之上，其他对象之下
    // 从最后一个开始遍历，保持相对顺序
    for (let i = containerObjects.length - 1; i >= 0; i--) {
      const obj = containerObjects[i]
      // 先移动到最底层
      canvasInstance.sendObjectToBack(obj, true)
      // 然后根据 background 对象的数量，将 container 对象向前移动相应次数
      if (backgroundObjects.length > 0) {
        for (let j = 0; j < backgroundObjects.length; j++) {
          canvasInstance.bringObjectForward(obj)
        }
      }
    }
    
    // 其他对象保持相对层级在顶层
    // 不需要额外操作，因为它们在 container 对象之上
    
    // 重新渲染画布
    canvasInstance.renderAll()
    
    console.log('层级调整完成:', {
      background: backgroundObjects.length,
      container: containerObjects.length,
      other: otherObjects.length
    })
  }

  // 删除指定markerId的所有对象
  function removeObjectsByMarkerId(markerId: string) {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    const objects = canvasInstance.getObjects().concat()
    objects.forEach(obj => {
      if (obj.get('dataType') === 'marker' && obj.get('markerId') === markerId) {
        canvasInstance.remove(obj)
      }
    })
    canvasInstance.discardActiveObject()
    canvasInstance.renderAll()
  }

  // 检测拖拽位置是否在emitter上
  function isDropOnEmitter(dropX: number, dropY: number): boolean {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return false
    
    const objects = canvasInstance.getObjects()
    for (const obj of objects) {
      if (obj.get('dataType') === 'emitter') {
        // 获取emitter对象的边界框
        const bounds = obj.getBoundingRect()
        if (dropX >= bounds.left && dropX <= bounds.left + bounds.width &&
            dropY >= bounds.top && dropY <= bounds.top + bounds.height) {
          return true
        }
      }
    }
    return false
  }

  // 计算贝塞尔曲线的近似长度
  function getBezierApproxLength(p0: {x: number, y: number}, p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}): number {
    // 使用控制多边形估算长度
    const d1 = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2))
    const d2 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    const d3 = Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2))
    return d1 + d2 + d3
  }

  // 计算贝塞尔曲线上的点
  function calculateBezierPoint(p0: {x: number, y: number}, p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}, t: number): {x: number, y: number} {
    const t2 = t * t
    const t3 = t2 * t
    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    
    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    }
  }

  // 在emitter上采样n个均匀分布的点（对整个group进行采样）
  function getEmitterSampledPoints(n: number = 10): Array<{ x: number; y: number }> {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return []
    
    const objects = canvasInstance.getObjects()
    
    for (const obj of objects) {
      if (obj.get('dataType') === 'emitter') {
        // 收集所有贝塞尔曲线段
        const bezierSegments: Array<{
          p0: {x: number, y: number},
          p1: {x: number, y: number},
          p2: {x: number, y: number},
          p3: {x: number, y: number}
        }> = []
        
        // 遍历 group 中的所有贝塞尔曲线段
        obj.getObjects().forEach((groupObj: any) => {
          if (groupObj.type === 'path' && groupObj.path) {
            const path = groupObj.path
            if (Array.isArray(path)) {
              // 处理每个贝塞尔曲线段
              for (let i = 0; i < path.length; i++) {
                const segment = path[i]
                if (segment[0] === 'M') {
                  // 找到下一个C段
                  if (i + 1 < path.length && path[i + 1][0] === 'C') {
                    const cSegment = path[i + 1]
                    const p0 = { x: segment[1], y: segment[2] } // 起始点
                    const p1 = { x: cSegment[1], y: cSegment[2] } // 第一个控制点
                    const p2 = { x: cSegment[3], y: cSegment[4] } // 第二个控制点
                    const p3 = { x: cSegment[5], y: cSegment[6] } // 终点
                    
                    bezierSegments.push({ p0, p1, p2, p3 })
                  }
                }
              }
            }
          }
        })
        
        if (bezierSegments.length === 0) return []
        
        // 计算每个段的长度
        const segmentLengths: number[] = []
        let totalLength = 0
        
        for (const segment of bezierSegments) {
          const length = getBezierApproxLength(segment.p0, segment.p1, segment.p2, segment.p3)
          segmentLengths.push(length)
          totalLength += length
        }
        
        // 在整个路径上均匀分布n个采样点
        const sampledPoints: Array<{ x: number; y: number }> = []
        
        for (let i = 0; i < n; i++) {
          const globalT = i / (n - 1) // 全局参数t从0到1
          const targetLength = globalT * totalLength
          
          // 找到目标长度对应的贝塞尔曲线段
          let currentLength = 0
          let targetSegmentIndex = 0
          let segmentT = 0
          
          for (let j = 0; j < bezierSegments.length; j++) {
            const segmentLength = segmentLengths[j]
            if (currentLength + segmentLength >= targetLength) {
              targetSegmentIndex = j
              segmentT = (targetLength - currentLength) / segmentLength
              break
            }
            currentLength += segmentLength
          }
          
          // 在目标贝塞尔曲线段上采样
          const targetSegment = bezierSegments[targetSegmentIndex]
          const point = calculateBezierPoint(targetSegment.p0, targetSegment.p1, targetSegment.p2, targetSegment.p3, segmentT)
          sampledPoints.push(point)
        }
        
        return sampledPoints
      }
    }
    
    return []
  }

  async function addMarkers(groupJson: string, pos: Array<{ x: number, y: number }>, markerId: string) {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    try {
      // 获取数据并进行归一化处理
      const data = pharseData(markerId)
      
      // 提取所有的 width 和 height 值
      const widths: number[] = []
      const heights: number[] = []
      
      data.forEach((row: any) => {
        const w = parseFloat(row.width)
        const h = parseFloat(row.height)
        if (!isNaN(w) && w > 0) widths.push(w)
        if (!isNaN(h) && h > 0) heights.push(h)
      })
      
      // 定义归一化范围
      const minSize = 20  // 最小尺寸
      const maxSize = 60  // 最大尺寸
      
      // 计算归一化参数
      const minWidth = widths.length > 0 ? Math.min(...widths) : 1
      const maxWidth = widths.length > 0 ? Math.max(...widths) : 1
      const minHeight = heights.length > 0 ? Math.min(...heights) : 1
      const maxHeight = heights.length > 0 ? Math.max(...heights) : 1
      
      // 归一化函数：将原始值映射到 [minSize, maxSize] 范围
      const normalize = (value: number, min: number, max: number): number => {
        if (max === min) return (minSize + maxSize) / 2  // 如果所有值相同，返回中间值
        return minSize + ((value - min) / (max - min)) * (maxSize - minSize)
      }

      for (let i = 0; i < pos.length; i++) {
        const p = pos[i]
        const currentDropX = p.x
        const currentDropY = p.y
        const objects = await fabric.util.enlivenObjects(groupJson, 'fabric')
        
        if (objects && objects.length > 0) {
          const group = new Group(objects)
          
          // 先设置所有属性（包括dataType），然后再添加到画布
          group.set({
            left: currentDropX,
            top: currentDropY,
            selectable: false,
            evented: false,
            dataType: 'marker',
            hasControls: false,
            originX: 'center',
            originY: 'center',
            markerId: markerId
          })
          
          if (selectedModeStore.selectedMode === null) {
            group.selectable = true;
            group.evented = true;
          }

          // 根据数据中的 width 和 height 调节对象大小
          const currentWidth = group.width || group.getScaledWidth()
          const currentHeight = group.height || group.getScaledHeight()

          if (currentWidth > 0 && currentHeight > 0 && i < data.length) {
            const row = data[i]
            const dataWidth = parseFloat(row.width)
            const dataHeight = parseFloat(row.height)
            
            // 如果数据有效，使用归一化后的尺寸
            if (!isNaN(dataWidth) && !isNaN(dataHeight) && dataWidth > 0 && dataHeight > 0) {
              const normalizedWidth = normalize(dataWidth, minWidth, maxWidth)
              const normalizedHeight = normalize(dataHeight, minHeight, maxHeight)
              
              // 根据归一化后的 width 和 height 计算缩放比例
              const scaleX = normalizedWidth / currentWidth * dataScaleStore.widthScale
              const scaleY = normalizedHeight / currentHeight * dataScaleStore.heightScale
              
              group.set({
                scaleX: scaleX,
                scaleY: scaleY
              })
            } else {
              // 如果数据无效，使用默认大小（保持宽高比）
              const defaultMaxSize = 40
              const scale = defaultMaxSize / Math.max(currentWidth, currentHeight)
              group.set({
                scaleX: scale,
                scaleY: scale
              })
            }
          }

          // 添加到主画布（此时所有属性都已设置好）
          canvasInstance.add(group)
          // 强制更新对象
          group.setCoords()
          canvasInstance.renderAll()

        } else {
          console.warn('enlivenObjects返回的对象为空或无效')
        }
      }
    } catch (enlivenError) {
      console.error('使用enlivenObjects创建对象时出错:', enlivenError)
    }
  }

  // 处理拖拽到emitter上的事件
  function handleEmitterDrop(groupJsonData: string, markerId: string, dropX: number, dropY: number) {
    const data = pharseData(markerId)  
    const groupJson = JSON.parse(groupJsonData)
    const n = data.length  
    const emitterSampledPoints = getEmitterSampledPoints(n)
    console.log(`Emitter 采样 ${n} 个点:`, emitterSampledPoints) 
    addMarkers(groupJson, emitterSampledPoints, markerId)
  }

  async function handleMarkerDrop(groupJsonData: string, markerId: string, dropX: number, dropY: number) {
    const groupJson = JSON.parse(groupJsonData)
    const result = await handleMarkerDropCanvas(markerId, [dropX, dropY])
    const pos = result.init_pos
    addMarkers(groupJson, pos, markerId) 
  }

  // 处理拖拽预览图到主画布
  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  function handleDrop(e: DragEvent, canvasEl: HTMLElement) {
    e.preventDefault()

    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance || !e.dataTransfer) return

    const groupJsonData = e.dataTransfer.getData('application/json')
    const markerId = e.dataTransfer.getData('text/plain')
    if (!groupJsonData) return

    // 计算拖拽位置相对于画布的偏移
    const canvasRect = canvasEl.getBoundingClientRect()
    const dropX = e.clientX - canvasRect.left
    const dropY = e.clientY - canvasRect.top
    // 在拖拽之前先删除相同markerId的对象
    removeObjectsByMarkerId(markerId)

    // 检查是否拖拽到emitter上
    if (isDropOnEmitter(dropX, dropY)) {
      handleEmitterDrop(groupJsonData, markerId, dropX, dropY)
    }
    else{
      handleMarkerDrop(groupJsonData, markerId, dropX, dropY)
    }
  }

  return {
    canvasRef,
    containerColor,
    setCanvas,
    setDrawedObjectDataType,
    adjustLayer,
    removeObjectsByMarkerId,
    isDropOnEmitter,
    getBezierApproxLength,
    calculateBezierPoint,
    getEmitterSampledPoints,
    addMarkers,
    handleEmitterDrop,
    handleMarkerDrop,
    handleDragOver,
    handleDrop
  }
})
