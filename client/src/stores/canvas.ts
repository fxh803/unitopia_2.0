import { defineStore, storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useBezierDrawingStore } from '~/stores/bezierDrawing'
import { useBackgroundStore } from '~/stores/background'
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useDataScaleStore } from '~/stores/dataScale'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useObjectActionsStore } from '~/stores/objectActions'
import { useHoverInfoPanelStore } from '~/stores/hoverInfoPanel'
import { useAnimationStore } from '~/stores/animation'
import { Group } from 'fabric'
import paper from 'paper'
import { handleMarkerDropCanvas, pharseData } from '~/composables/server'
import * as fabric from 'fabric'
export const useCanvasStore = defineStore('canvas', () => {
  const canvasRef = ref<(() => Canvas | null) | null>(null)
  const containerColor = ref([130, 130, 130, 0.8])
  // 路径闭合确认对话框状态
  const closePathConfirm = ref<{
    show: boolean
    path: any
    position: { x: number; y: number }
  }>({
    show: false,
    path: null,
    position: { x: 0, y: 0 }
  })
  
  // 导入其他 store
  const selectedModeStore = useSelectedModeStore()
  const bezierDrawingStore = useBezierDrawingStore()
  const backgroundStore = useBackgroundStore()
  const canvasModeStore = useCanvasModeStore()
  const dataScaleStore = useDataScaleStore()
  const collageSeriesStore = useCollageSeriesStore()
  const objectActionsStore = useObjectActionsStore()
  const hoverInfoPanelStore = useHoverInfoPanelStore()

  // 设置 canvas 引用
  function setCanvas(canvas: () => Canvas | null) {
    canvasRef.value = canvas
  }

  // 更新marker透明度：选中的marker保持正常，其他变低
  function updateMarkerOpacity(selectedMarker: any = null) {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return
    
    const allObjects = canvasInstance.getObjects()
    allObjects.forEach((obj: any) => {
      if (obj.get('dataType') === 'marker') {
        if (selectedMarker && obj === selectedMarker) {
          obj.set('opacity', 1)
        } else {
          obj.set('opacity', 0.3)
        }
      }
    })
    canvasInstance.renderAll()
  }

  // 恢复所有marker透明度
  function restoreAllMarkerOpacity() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return
    
    const allObjects = canvasInstance.getObjects()
    allObjects.forEach((obj: any) => {
      if (obj.get('dataType') === 'marker') {
        obj.set('opacity', 1)
      }
    })
    canvasInstance.renderAll()
  }

  // 添加画布事件监听器
  function addCanvasEventListeners() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    canvasInstance.on({
      'selection:created': () => {
        objectActionsStore.setCurrentPathObj()
        objectActionsStore.updateActionBtnVisble()
        objectActionsStore.updateActionBtnPosition()
        // 如果选中的是marker，更新透明度
        const activeObject = canvasInstance.getActiveObject()
        if (activeObject && activeObject.get('dataType') === 'marker') {
          updateMarkerOpacity(activeObject)
        }
      },
      'selection:updated': () => {
        objectActionsStore.setCurrentPathObj()
        objectActionsStore.updateActionBtnVisble()
        objectActionsStore.updateActionBtnPosition()
        // 如果选中的是marker，更新透明度
        const activeObject = canvasInstance.getActiveObject()
        if (activeObject && activeObject.get('dataType') === 'marker') {
          updateMarkerOpacity(activeObject)
        }
      },
      'selection:cleared': () => {
        objectActionsStore.hideBtns()
        // 取消选中时，恢复所有marker的透明度
        restoreAllMarkerOpacity()
      },
      'object:moving': () => {
        objectActionsStore.hideBtns()
      },
      'object:scaling': () => {
        objectActionsStore.hideBtns()
      },
      'object:rotating': () => {
        objectActionsStore.hideBtns()
      },
      'object:modified': () => {
        objectActionsStore.setCurrentPathObj()
        objectActionsStore.updateActionBtnVisble()
        objectActionsStore.updateActionBtnPosition()
        collageSeriesStore.updateCurrentSlide()
      },
      'object:added': (e) => {
        setDrawedObjectDataType(e)
        collageSeriesStore.updateCurrentSlide()
        adjustLayer()
        // 询问是否闭合路径
        askToClosePath(e.target)
      },
      'object:removed': () => {
        collageSeriesStore.updateCurrentSlide()
      },
      'mouse:over': (e) => {
        // 鼠标悬停在对象上时添加偏透明蓝色效果
        if (e.target && e.target.get('dataType') === 'container') {
          e.target.set('opacity', 0.7)
          canvasInstance.renderAll()
        } 
        if (e.target && e.target.get('dataType') === 'emitter') {
          // emitter是group，需要遍历其中的子对象设置透明度
          e.target.getObjects().forEach((childObj: any) => {
            childObj.set('opacity', 0.5)
          })
          canvasInstance.renderAll()
        }
        if (e.target && e.target.get('dataType') === 'marker') {
          // 检查是否有选中的marker
          const activeObject = canvasInstance.getActiveObject()
          if (activeObject && activeObject.get('dataType') === 'marker') {
            // 如果有选中的marker，保持选中marker的正常透明度，其他变低
            updateMarkerOpacity(activeObject)
          } else {
            // 如果没有选中的marker，当前悬停的marker保持正常透明度，其他marker变低透明度
            updateMarkerOpacity(e.target)
          }
        }
        // 处理 marker 悬浮显示信息面板
        hoverInfoPanelStore.handleMarkerHover(e, canvasInstance)
      },
      'mouse:out': (e) => {
        // 鼠标离开对象时恢复原始透明度
        if (e.target && e.target.get('dataType') === 'container') {
          e.target.set('opacity', 1)      
          canvasInstance.renderAll()
        }
        if (e.target && e.target.get('dataType') === 'emitter') {
          // emitter是group，需要遍历其中的子对象恢复透明度
          e.target.getObjects().forEach((childObj: any) => {
            childObj.set('opacity', 1)
          })
          canvasInstance.renderAll()
        }
        if (e.target && e.target.get('dataType') === 'marker') {
          // 检查是否有选中的marker
          const activeObject = canvasInstance.getActiveObject()
          if (activeObject && activeObject.get('dataType') === 'marker') {
            // 如果有选中的marker，保持选中marker的正常透明度，其他变低
            updateMarkerOpacity(activeObject)
          } else {
            // 如果没有选中的marker，恢复所有marker的透明度
            restoreAllMarkerOpacity()
          }
        }
        // 处理鼠标离开 marker，隐藏信息面板
        hoverInfoPanelStore.handleMarkerOut(e)
      },
      'mouse:move': (e) => {
        // 处理画布鼠标移动，更新信息面板位置
        hoverInfoPanelStore.handleCanvasMouseMove(e, canvasInstance)
      }
    })
  }

  // 移除画布事件监听器
  function removeCanvasEventListeners() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    canvasInstance.off('selection:created')
    canvasInstance.off('selection:updated')
    canvasInstance.off('selection:cleared')
    canvasInstance.off('object:moving')
    canvasInstance.off('object:scaling')
    canvasInstance.off('object:rotating')
    canvasInstance.off('object:modified')
    canvasInstance.off('object:added')
    canvasInstance.off('object:removed')
    canvasInstance.off('mouse:over')
    canvasInstance.off('mouse:out')
    canvasInstance.off('mouse:move')
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
      if(path.get('dataType') !== undefined){ 
        return
      }
      // 根据当前选择的模式设置dataType
      path.set('dataType', selectedModeStore.selectedMode);

      // 确保新添加的对象不可选（除非当前模式是 move）
      // 如果当前模式是 move，会根据对象类型在 canvasModeStore.setMode 中设置
      if (canvasModeStore.mode !== 'move') {
        path.set('selectable', false)
        path.set('evented', false)
      }

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
      // 使用 storeToRefs 解构 dataScaleStore 的响应式属性
      const { columnMapping, widthScale, heightScale, sizeScale } = storeToRefs(dataScaleStore)
      
      // 获取归一化参数
      const { data, normalized, mappingChannel, defaultSize } = dataScaleStore.getNormalizationParams(markerId) 

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
            markerId: markerId,
            data: data[i]
          })
          
          if (selectedModeStore.selectedMode === null) {
            group.selectable = true;
            group.evented = true;
          }

          // 根据数据中的 width 和 height 调节对象大小
          const currentWidth = group.width || group.getScaledWidth()
          const currentHeight = group.height || group.getScaledHeight() 
          const normalizedValue = normalized[i]
          const currentSize = Math.max(currentWidth, currentHeight)
          //一开始先按比例缩放
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
          group.set({
            scaleX: scaleX,
            scaleY: scaleY
          })
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

  // 询问是否闭合路径
  function askToClosePath(path: any) {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance || !path) return
    
    // 跳过预览形状
    if (path.get('isPreview')) return

    //跳过mode不是draw或rect或ellipse的状态
    const canvasModeStore = useCanvasModeStore()
    if (canvasModeStore.mode !== 'draw' && canvasModeStore.mode !== 'rect' && canvasModeStore.mode !== 'ellipse') return

    
    // 只有当对象是 container 类型时才触发
    if (path.get('dataType') !== 'container') return
    
    // 获取对象在画布上的位置
    const zoom = canvasInstance.getZoom()
    const vpt = canvasInstance.viewportTransform
    const pathBounds = path.getBoundingRect()
    
    // 计算对象在页面中的位置
    const canvasEl = canvasInstance.getElement()
    if (!canvasEl) return
    
    const canvasRect = canvasEl.getBoundingClientRect()
    const x = (pathBounds.left * zoom) + (vpt[4] || 0) + canvasRect.left
    const y = (pathBounds.top * zoom) + (vpt[5] || 0) + canvasRect.top
    
    // 设置确认对话框状态
    closePathConfirm.value = {
      show: true,
      path: path,
      position: { x, y }
    }
  }

  // 处理路径闭合确认
  function handleClosePathConfirm(confirmed: boolean) {
    const { path } = closePathConfirm.value
    if (!path) return
    
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return
    
    if (confirmed) {
      // 闭合路径：设置 fill 为 stroke 颜色
      const strokeColor = path.stroke || '#000'
      path.set('fill', strokeColor)
      path.set('stroke', 'rgba(0,0,0,0)')
      canvasInstance.requestRenderAll()
      //更新预览
      collageSeriesStore.updateCurrentSlide()
    }
    
    // 关闭确认对话框
    closePathConfirm.value = {
      show: false,
      path: null,
      position: { x: 0, y: 0 }
    }
  }
  function getDataBinding (){
    const hoverInfoPanelStore = useHoverInfoPanelStore()
    const allData = hoverInfoPanelStore.allData
  
    // 将所有 data 拍平成一维数组
    const flattenedData: Array<any> = []
  
    // 遍历所有 overview
    for (const overview of allData) {
      // 遍历每个 overview 的所有 slides
      for (const slide of overview.slides) {
        // 遍历每个 slide 的所有 dataBinding
        for (const binding of slide.dataBinding) {
          // 将每个 dataBinding 中的 data 数组拍平合并
          if (binding.data && Array.isArray(binding.data)) {
            flattenedData.push(...binding.data)
          }
        }
      }
    }
  
    return flattenedData
  }

  async function renderResult (){
    collageSeriesStore.addNewSlide() 
    const animationStore = useAnimationStore()
    const { process_id } = storeToRefs(animationStore)
    // 获取canvas实例
    const canvasInstance = canvasRef.value?.()
    if (canvasInstance) {
      try {
        //先放container对象
        const containerObjects = await enlivenAllContainerObjects()
        containerObjects.forEach((obj: any) => {
          obj.set({
            selectable: true,
            evented: true,
            dataType: 'container'
          })
          canvasInstance.add(obj)
        })

        // 遍历 paper 上所有对象，只保存 dataType 为 'marker' 的对象信息
        // 为每个 marker 生成唯一的 markerId
        const markerId = `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const allPaperObjects = paper.project.activeLayer.children
        const markerIndices: number[] = []
        allPaperObjects.forEach((obj, index) => {
          if (obj.dataType === 'marker') {
            markerIndices.push(index)
          }
        })
        console.log(markerIndices)
        // 将当前 paper.js 画布导出为 SVG
        const paperSvgString = paper.project.exportSVG({ asString: true })
  
        // 使用 Fabric.js 加载 SVG
        const loadedSVG = await fabric.loadSVGFromString(paperSvgString)
        console.log(loadedSVG)
        // 获取拍平的 data
        const flattenedData = getDataBinding()
  
        // 遍历所有 SVG 对象，只给 marker 类型的对象设置 dataType 和 data
        let markerDataIndex = 0
        loadedSVG.objects.forEach((obj: any, index: number) => {
          // 检查当前索引是否对应 marker 对象 
          if (markerIndices.includes(index)) {
            console.log(index)
            const data = flattenedData[markerDataIndex] || null
            
            // 先添加到画布，以便正确获取尺寸和位置
            canvasInstance.add(obj)
            obj.setCoords()
            
            // 获取对象的边界框中心点（基于当前 origin）
            const centerPoint = obj.getCenterPoint()
            
            // 设置 origin 为 center，并设置位置为中心点
            // 这样对象的视觉位置不会改变
            obj.set({
              originX: 'center',
              originY: 'center',
              left: centerPoint.x,
              top: centerPoint.y,
              selectable: true,
              evented: true,
              dataType: 'marker',
              data: data,
              markerId: markerId
            })
            
            // 更新坐标以确保位置正确
            obj.setCoords()
            
            markerDataIndex++
          } 
          
        })
        
        // 重新渲染画布
        canvasInstance.renderAll()
  
      } catch (error) {
        console.error('加载 SVG 结果失败:', error)
      }
    }
  }

  // 从当前 overview 的所有 slide 中获取所有 container 对象并进行 enlivenObjects
  async function enlivenAllContainerObjects() {
    const { currentOverviewIndex, overviews } = storeToRefs(collageSeriesStore)
    const currentOverview = overviews.value[currentOverviewIndex.value]
    
    if (!currentOverview || !currentOverview.collageSeries || currentOverview.collageSeries.length === 0) {
      console.warn('当前 overview 不存在或没有 slides')
      return []
    }

    const allContainerObjects: any[] = []

    // 遍历当前 overview 的所有 slides
    for (const slide of currentOverview.collageSeries) {
      try {
        // 解析 slide 的 JSON 数据
        const slideData = typeof slide.json === 'string' ? JSON.parse(slide.json) : slide.json
        
        if (!slideData.objects || !Array.isArray(slideData.objects)) {
          continue
        }

        // 收集所有 container 对象的 JSON
        const containerJsonArray: any[] = []
        
        slide.dataTypeArray.forEach((dataType: string, index: number) => {
          if (dataType === 'container' && slideData.objects[index]) {
            containerJsonArray.push(slideData.objects[index])
          }
        })

        // 如果有 container 对象，使用 enlivenObjects 处理
        if (containerJsonArray.length > 0) {
          try {
            const enlivenedObjects = await fabric.util.enlivenObjects(containerJsonArray, 'fabric')
            if (enlivenedObjects && enlivenedObjects.length > 0) {
              allContainerObjects.push(...enlivenedObjects)
            }
          } catch (enlivenError) {
            console.error(`处理 slide ${slide.slideId} 的 container 对象时出错:`, enlivenError)
          }
        }
      } catch (parseError) {
        console.error(`解析 slide ${slide.slideId} 的 JSON 时出错:`, parseError)
      }
    }

    return allContainerObjects
  }

  return {
    canvasRef,
    containerColor,
    closePathConfirm,
    setCanvas,
    addCanvasEventListeners,
    removeCanvasEventListeners,
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
    handleDrop,
    askToClosePath,
    handleClosePathConfirm,
    renderResult,
    enlivenAllContainerObjects
  }
})
