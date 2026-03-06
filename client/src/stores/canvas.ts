import { defineStore, storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useBezierDrawingStore } from '~/stores/bezierDrawing'
import { useBackgroundStore } from '~/stores/background'
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useObjectActionsStore } from '~/stores/objectActions'
import { useTableStore } from '~/stores/table'
import { useHoverInfoPanelStore } from '~/stores/hoverInfoPanel'
import { useAnimationStore } from '~/stores/animation'
import { Group } from 'fabric'
import paper from 'paper'
import { handleMarkerDropCanvas } from '~/composables/server'
import { useMarkInstanceStore, type MarkInstance, type ColorStop } from '~/stores/markInstance'
import { useMarkerStore } from '~/stores/marker'
import * as fabric from 'fabric'
export const useCanvasStore = defineStore('canvas', () => {
  const canvasRef = ref<(() => Canvas | null) | null>(null)
  const containerColor = ref([100, 100, 100, 0.8])
  // Segment 加载状态
  const isSegmentLoading = ref(false)
  
  function setSegmentLoading(loading: boolean) {
    isSegmentLoading.value = loading
  }
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
  const collageSeriesStore = useCollageSeriesStore()
  const objectActionsStore = useObjectActionsStore()
  const hoverInfoPanelStore = useHoverInfoPanelStore()

  // 防抖更新当前 slide
  let updateSlideTimer: ReturnType<typeof setTimeout> | null = null
  const debouncedUpdateCurrentSlide = () => {
    if (updateSlideTimer) {
      clearTimeout(updateSlideTimer)
    }
    updateSlideTimer = setTimeout(() => {
      collageSeriesStore.updateCurrentSlide()
      updateSlideTimer = null
    }, 300) // 300ms 防抖延迟
  }

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
        // 首次高亮时记住原始不透明度，后面恢复时用
        if (obj._origOpacity == null) {
          obj._origOpacity = obj.opacity ?? 1
        }
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
        const orig = obj._origOpacity
        if (orig != null) {
          obj.set('opacity', orig)
          obj._origOpacity = undefined
        }
        // 如果没有记录过 _origOpacity，就保持当前 opacity，不去强制改成 1
      }
    })
    canvasInstance.renderAll()
  }

  function handleMarkerHoverOpacity(target: any, options: { isMouseOut?: boolean } = {}) {
    if (!target || target.get('dataType') !== 'marker') return

    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    const activeObject = canvasInstance.getActiveObject()
    const hasActiveMarker = activeObject && activeObject.get('dataType') === 'marker'

    if (hasActiveMarker) {
      updateMarkerOpacity(activeObject)
    } else if (options.isMouseOut) {
      restoreAllMarkerOpacity()
    } else {
      updateMarkerOpacity(target)
    }
  }
  function handleMarkerSelect() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return
    const activeObject = canvasInstance.getActiveObject()
    if (activeObject && activeObject.get('dataType') === 'marker') {
      updateMarkerOpacity(activeObject)
    }
  }
  // 添加画布事件监听器
  function addCanvasEventListeners() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    canvasInstance.on({
      'selection:created': (e) => {
        objectActionsStore.setCurrentPathObj()
        objectActionsStore.updateActionBtnVisble()
        objectActionsStore.updateActionBtnPosition()
        handleMarkerSelect()
        hoverInfoPanelStore.handleSelection(e, canvasInstance)
      },
      'selection:updated': (e) => {
        objectActionsStore.setCurrentPathObj()
        objectActionsStore.updateActionBtnVisble()
        objectActionsStore.updateActionBtnPosition()
        handleMarkerSelect()
        hoverInfoPanelStore.handleSelection(e, canvasInstance)
      },
      'selection:cleared': () => {
        objectActionsStore.hideBtns()
        // 取消选中时，恢复所有marker的透明度
        restoreAllMarkerOpacity()
        // 隐藏信息面板
        hoverInfoPanelStore.handleSelectionCleared()
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
        debouncedUpdateCurrentSlide()
        adjustLayer()
        // 询问是否闭合路径
        askToClosePath(e.target)
      },
      'object:removed': () => {
        debouncedUpdateCurrentSlide()
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
        handleMarkerHoverOpacity(e.target)
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
        handleMarkerHoverOpacity(e.target, { isMouseOut: true })
        // 处理鼠标离开 marker，隐藏信息面板
        hoverInfoPanelStore.handleMarkerOut(e, canvasInstance)
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
      if (path.get('dataType') === undefined) {
        // 根据当前选择的模式设置dataType
        path.set('dataType', selectedModeStore.selectedMode);
        if (canvasModeStore.mode !== 'move') {
          path.set('selectable', false)
          path.set('evented', false)
        }
        return
      }
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

  // // 删除指定markerId的所有对象
  // function removeObjectsByMarkerId(markerId: string) {
  //   const canvasInstance = canvasRef.value?.()
  //   if (!canvasInstance) return

  //   const objects = canvasInstance.getObjects().concat()
  //   objects.forEach(obj => {
  //     if (obj.get('dataType') === 'marker' && obj.get('markerId') === markerId) {
  //       canvasInstance.remove(obj)
  //     }
  //   })
  //   canvasInstance.discardActiveObject()
  //   canvasInstance.renderAll()
  // }

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
  function getBezierApproxLength(p0: { x: number, y: number }, p1: { x: number, y: number }, p2: { x: number, y: number }, p3: { x: number, y: number }): number {
    // 使用控制多边形估算长度
    const d1 = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2))
    const d2 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    const d3 = Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2))
    return d1 + d2 + d3
  }

  // 计算贝塞尔曲线上的点
  function calculateBezierPoint(p0: { x: number, y: number }, p1: { x: number, y: number }, p2: { x: number, y: number }, p3: { x: number, y: number }, t: number): { x: number, y: number } {
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
          p0: { x: number, y: number },
          p1: { x: number, y: number },
          p2: { x: number, y: number },
          p3: { x: number, y: number }
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

  // 十六进制颜色转 RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  // RGB 转十六进制颜色
  const rgbToHex = (r: number, g: number, b: number): string => {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(x).toString(16)
          return hex.length === 1 ? '0' + hex : hex
        })
        .join('')
    )
  }

  // 颜色插值函数
  const interpolateColor = (colorStart: string, colorEnd: string, t: number): string => {
    const rgbStart = hexToRgb(colorStart)
    const rgbEnd = hexToRgb(colorEnd)
    if (!rgbStart || !rgbEnd) return colorStart

    const r = rgbStart.r + (rgbEnd.r - rgbStart.r) * t
    const g = rgbStart.g + (rgbEnd.g - rgbStart.g) * t
    const b = rgbStart.b + (rgbEnd.b - rgbStart.b) * t

    return rgbToHex(r, g, b)
  }

  // 基于多停靠点的颜色和透明度插值
  const interpolateColorFromStops = (stops: ColorStop[], t: number): { color: string; opacity: number } => {
    if (!stops.length) {
      return { color: '#ffffff', opacity: 1 }
    }
    const sorted = [...stops].sort((a, b) => a.position - b.position)
    if (t <= sorted[0].position) {
      return { color: sorted[0].color, opacity: sorted[0].opacity }
    }
    if (t >= sorted[sorted.length - 1].position) {
      const last = sorted[sorted.length - 1]
      return { color: last.color, opacity: last.opacity }
    }
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]
      const b = sorted[i + 1]
      if (t >= a.position && t <= b.position) {
        const span = b.position - a.position || 1
        const localT = (t - a.position) / span
        const color = interpolateColor(a.color, b.color, localT)
        const opacity = a.opacity + (b.opacity - a.opacity) * localT
        return { color, opacity }
      }
    }
    const fallback = sorted[sorted.length - 1]
    return { color: fallback.color, opacity: fallback.opacity }
  }

  // 为字符串值生成颜色映射（相同值相同颜色），基于色带停靠点
  const getStringValueColorMapForRows = (
    rows: any[],
    field: string,
    stops: ColorStop[]
  ): Map<string, string> => {
    const colorMap = new Map<string, string>()
    if (!rows || rows.length === 0) return colorMap

    const uniqueValues = new Set<string>()
    rows.forEach((row: any) => {
      const value = row?.[field]
      if (value !== undefined && value !== null && value !== '') {
        uniqueValues.add(String(value))
      }
    })

    const uniqueValuesArray = Array.from(uniqueValues).sort()
    uniqueValuesArray.forEach((value, index) => {
      const t = uniqueValuesArray.length > 1 ? index / (uniqueValuesArray.length - 1) : 0
      const { color } = interpolateColorFromStops(stops, t)
      colorMap.set(value, color)
    })

    return colorMap
  }

  // 基于单个 mark 实例的 drop 处理（非 group）
  async function handleSingleInstanceDrop(
    mark: MarkInstance,
    dropX: number,
    dropY: number,
    dropOnEmitter: boolean,
    canvasInstance: any,
    tableStore: ReturnType<typeof useTableStore>
  ) {
    if (!mark.markerJsonData) return

    // 构造参与归一化的数据集合（使用该实例覆盖的实体）
    const indices = mark.entityIndices ?? []

    // 当前约束：encoding 只会选一个 channel，这里取出 channel、对应字段名以及颜色模式
    let channelKey: MarkEncodingChannel | null = null
    let fieldForEncoding: string | undefined
    let colorMode: 'numeric' | 'categorical' | undefined
    if (mark.encoding) {
      const encoding: any = mark.encoding
      if (encoding.colorMode) {
        colorMode = encoding.colorMode
      }
      const entries = Object.entries(encoding).filter(([k]) => k !== 'colorMode')
      if (entries.length > 0) {
        channelKey = entries[0][0] as MarkEncodingChannel
        fieldForEncoding = entries[0][1] as string
      }
    }

    const rows: any[] = []
    const values: number[] = []

    indices.forEach(idx => {
      const row = tableStore.tableData[idx] as any
      rows.push(row)
      if (fieldForEncoding && row && row[fieldForEncoding] != null) {
        const v = Number(row[fieldForEncoding])
        values.push(!isNaN(v) && v > 0 ? v : 1)
      } else {
        values.push(1)
      }
    })

    // 基于 dataScale 的规则做简单归一化（20~70）
    const minDisplaySize = 20
    const maxDisplaySize = 70
    const defaultSize = 45
    const minValue = values.length ? Math.min(...values) : 1
    const maxValue = values.length ? Math.max(...values) : 1
    const normalize = (value: number, min: number, max: number) => {
      if (max === min) return (minDisplaySize + maxDisplaySize) / 2
      return minDisplaySize + ((value - min) / (max - min)) * (maxDisplaySize - minDisplaySize)
    }
    const normalized = values.map(v => normalize(v, minValue, maxValue))

    // 如果是颜色编码，预先为每个实体计算好颜色（仅依赖色带 colorStops）
    let colors: string[] | null = null
    let opacities: number[] | null = null
    if (channelKey === 'color' && fieldForEncoding) {
      colors = []
      opacities = []
      const useNumeric = colorMode === 'numeric'
      const useCategorical = colorMode === 'categorical'

      if (useNumeric) {
        const rawStops = (mark as any).colorStops as ColorStop[] | undefined
        const stops: ColorStop[] =
          rawStops && rawStops.length >= 2
            ? rawStops
            : [
                { position: 0, color: '#A7C8FB', opacity: 1 },
                { position: 1, color: '#5592F9', opacity: 1 },
              ]
        const numericValues = values.length ? values : [1]
        const minVal = Math.min(...numericValues)
        const maxVal = Math.max(...numericValues)
        const span = maxVal - minVal || 1
        for (let i = 0; i < rows.length; i++) {
          const raw = numericValues[i] ?? minVal
          const tNorm = Math.max(0, Math.min(1, (raw - minVal) / span))
          const { color, opacity } = interpolateColorFromStops(stops, tNorm)
          colors.push(color)
          opacities.push(opacity)
        }
      } else if (useCategorical) {
        const categoricalColors = (mark as any).categoricalColors as Record<string, string> | undefined
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const value = row && fieldForEncoding in row ? row[fieldForEncoding] : undefined
          const valueStr = value != null ? String(value) : ''
          const mapped = categoricalColors ? categoricalColors[valueStr] : undefined
          colors.push(mapped || '')
          opacities.push(1)
        }
      }
    }

    // 计算用于放置的点位：
    // - 如果丢在 emitter 上，沿 emitter 采样
    // - 否则使用后端的布局服务（容器区域）
    let pos: Array<{ x: number; y: number }> = []
    const markerCount = indices.length || values.length || 1

    if (dropOnEmitter) {
      pos = getEmitterSampledPoints(markerCount)
    } else {
      const result = await handleMarkerDropCanvas([dropX, dropY], markerCount, null)
      pos = (result.init_pos as Array<{ x: number; y: number }>) || []
    }

    for (let i = 0; i < pos.length; i++) {
      const object = await fabric.util.enlivenObjects(mark.markerJsonData, 'fabric')
      const group = new Group(object)
      group.set({
        left: pos[i].x,
        top: pos[i].y,
        selectable: false,
        evented: false,
        dataType: 'marker',
        hasControls: false,
        originX: 'center',
        originY: 'center',
        markerId: mark.id,
        data: rows[i]
      })

      if (selectedModeStore.selectedMode === null) {
        group.selectable = true
        group.evented = true
      }
      // 根据数据中的 width 和 height 调节对象大小
      const currentWidth = group.width || group.getScaledWidth()
      const currentHeight = group.height || group.getScaledHeight()
      const normalizedValue = normalized[i]
      const currentSize = Math.max(currentWidth, currentHeight)

      //一开始先按比例缩放
      let scaleX = defaultSize / currentSize
      let scaleY = defaultSize / currentSize

      if (channelKey === 'width') {
        scaleX = normalizedValue / currentSize
      } else if (channelKey === 'height') {
        scaleY = normalizedValue / currentSize
      } else if (channelKey === 'size') {
        scaleX = normalizedValue / currentSize
        scaleY = normalizedValue / currentSize
      } else { 
        scaleX = defaultSize / currentSize
        scaleY = defaultSize / currentSize
      }

      group.set({
        scaleX: scaleX,
        scaleY: scaleY
      })

      // 如果存在颜色编码，为当前实体应用插值颜色
      if (colors && colors[i]) {
        const interpolatedColor = colors[i]
        const objects = group.getObjects()
        objects.forEach((obj: any) => {
          const hasStroke =
            obj.stroke && obj.stroke !== 'transparent' && obj.stroke !== 'rgba(0,0,0,0)'
          const hasFill =
            obj.fill && obj.fill !== 'transparent' && obj.fill !== 'rgba(0,0,0,0)'

          if (hasStroke) {
            obj.set('stroke', interpolatedColor)
          }
          if (hasFill) {
            obj.set('fill', interpolatedColor)
          }
        })
        if (opacities && opacities[i] != null) {
          group.set('opacity', opacities[i])
        }
      }

      // 添加到主画布（此时所有属性都已设置好）
      canvasInstance.add(group)
      // 强制更新对象
      group.setCoords()
      canvasInstance.renderAll()
    }
  }

  // 基于 group mark 实例的 drop 处理
  async function handleGroupInstanceDrop(
    mark: MarkInstance,
    dropX: number,
    dropY: number,
    dropOnEmitter: boolean,
    canvasInstance: any,
    tableStore: ReturnType<typeof useTableStore>
  ) {
    // 1. 找出「合格」的子实例：有实体且有可用的 marker 形状
    const qualifiedChildren = (mark.children || []).filter(child =>
      child &&
      child.entities > 0 &&
      Array.isArray(child.entityIndices) &&
      child.entityIndices.length > 0 &&
      child.markerJsonData
    )

    if (qualifiedChildren.length === 0) {
      console.warn('[handleGroupInstanceDrop] no qualified children for group mark', mark.id)
      return
    }

    // 2. 计算所有合格子实例的实体总数，用于计算布局位置
    const totalEntities = qualifiedChildren.reduce((sum, child) => {
      return sum + (child.entityIndices?.length || child.entities || 0)
    }, 0)

    if (totalEntities <= 0) {
      console.warn('[handleGroupInstanceDrop] totalEntities is 0 for group mark', mark.id)
      return
    }

    // 3. 根据总数量计算位置：如果在 emitter 上就沿 emitter 采样，否则调用后端布局
    let pos: Array<{ x: number; y: number }> = []
    if (dropOnEmitter) {
      pos = getEmitterSampledPoints(totalEntities)
    } else {
      const result = await handleMarkerDropCanvas([dropX, dropY], totalEntities, null)
      pos = (result.init_pos as Array<{ x: number; y: number }>) || []
    }

    if (!pos || pos.length === 0) {
      console.warn('[handleGroupInstanceDrop] no positions returned for group mark', mark.id)
      return
    }

    // 4. 依次遍历每个合格子实例，把它覆盖的实体映射到全局 pos 上
    const minDisplaySize = 20
    const maxDisplaySize = 70
    const defaultSize = 45

    let globalIndex = 0

    for (const child of qualifiedChildren) {
      const indices = child.entityIndices || []
      if (indices.length === 0) continue

      // 编码：group 子实例只使用自己的 encoding
      const encoding = (child.encoding || {}) as any
      let channelKey: MarkEncodingChannel | null = null
      let fieldForEncoding: string | undefined
      let colorMode: 'numeric' | 'categorical' | undefined
      if (encoding.colorMode) {
        colorMode = encoding.colorMode
      }
      const entries = Object.entries(encoding).filter(([k]) => k !== 'colorMode')
      if (entries.length > 0) {
        channelKey = entries[0][0] as MarkEncodingChannel
        fieldForEncoding = entries[0][1] as string
      }

      const rows: any[] = []
      const values: number[] = []

      indices.forEach(idx => {
        const row = tableStore.tableData[idx] as any
        rows.push(row)
        if (fieldForEncoding && row && row[fieldForEncoding] != null) {
          const v = Number(row[fieldForEncoding])
          values.push(!isNaN(v) && v > 0 ? v : 1)
        } else {
          values.push(1)
        }
      })

      // 对该子实例内部做简单归一化（20~70）
      const minValue = values.length ? Math.min(...values) : 1
      const maxValue = values.length ? Math.max(...values) : 1
      const normalize = (value: number, min: number, max: number) => {
        if (max === min) return (minDisplaySize + maxDisplaySize) / 2
        return minDisplaySize + ((value - min) / (max - min)) * (maxDisplaySize - minDisplaySize)
      }
      const normalized = values.map(v => normalize(v, minValue, maxValue))

      // 如果是颜色编码，预先为该子实例的每个实体计算好颜色
      let colors: string[] | null = null
      let opacities: number[] | null = null
      if (channelKey === 'color' && fieldForEncoding) {
        colors = []
        opacities = []
        const useNumeric = colorMode === 'numeric'
        const useCategorical = colorMode === 'categorical'

        if (useNumeric) {
          const childColorStops = (child as any).colorStops as ColorStop[] | undefined
          const stops: ColorStop[] =
            childColorStops && childColorStops.length >= 2
              ? childColorStops
              : [
                  { position: 0, color: '#A7C8FB', opacity: 1 },
                  { position: 1, color: '#5592F9', opacity: 1 },
                ]
          const numericValues = values.length ? values : [1]
          const minVal = Math.min(...numericValues)
          const maxVal = Math.max(...numericValues)
          const span = maxVal - minVal || 1
          for (let i = 0; i < rows.length; i++) {
            const raw = numericValues[i] ?? minVal
            const tNorm = Math.max(0, Math.min(1, (raw - minVal) / span))
            const { color, opacity } = interpolateColorFromStops(stops, tNorm)
            colors.push(color)
            opacities.push(opacity)
          }
        } else if (useCategorical) {
          const categoricalColors = (child as any).categoricalColors as
            | Record<string, string>
            | undefined
          const defaultStops: ColorStop[] = [
            { position: 0, color: '#A7C8FB', opacity: 1 },
            { position: 1, color: '#5592F9', opacity: 1 },
          ]
          const colorMap = getStringValueColorMapForRows(rows, fieldForEncoding, defaultStops)
          const fallbackColor = defaultStops[0]?.color || '#ffffff'
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const value = row && fieldForEncoding in row ? row[fieldForEncoding] : undefined
            const valueStr = value != null ? String(value) : ''
            const mapped =
              (categoricalColors && categoricalColors[valueStr]) ||
              colorMap.get(valueStr) ||
              fallbackColor
            colors.push(mapped)
            opacities.push(1)
          }
        }
      }

      // 为该子实例的每个实体添加一个 mark
      for (let i = 0; i < indices.length; i++) {
        if (globalIndex >= pos.length) break

        const p = pos[globalIndex]
        globalIndex += 1

        const object = await fabric.util.enlivenObjects(child.markerJsonData, 'fabric')
        const group = new Group(object)
        group.set({
          left: p.x,
          top: p.y,
          selectable: false,
          evented: false,
          dataType: 'marker',
          hasControls: false,
          originX: 'center',
          originY: 'center',
          markerId: child.id,
          data: rows[i]
        })

        if (selectedModeStore.selectedMode === null) {
          group.selectable = true
          group.evented = true
        }

        const currentWidth = group.width || group.getScaledWidth()
        const currentHeight = group.height || group.getScaledHeight()
        const normalizedValue = normalized[i]
        const currentSize = Math.max(currentWidth, currentHeight)

        let scaleX = defaultSize / currentSize
        let scaleY = defaultSize / currentSize

        if (channelKey === 'width') {
          scaleX = normalizedValue / currentSize
        } else if (channelKey === 'height') {
          scaleY = normalizedValue / currentSize
        } else if (channelKey === 'size') {
          scaleX = normalizedValue / currentSize
          scaleY = normalizedValue / currentSize
        } else {
          scaleX = defaultSize / currentSize
          scaleY = defaultSize / currentSize
        }

        group.set({
          scaleX,
          scaleY
        })
        // 如果存在颜色编码，为当前实体应用插值颜色
        if (colors && colors[i]) {
          const interpolatedColor = colors[i]
          const objects = group.getObjects()
          objects.forEach((obj: any) => {
            const hasStroke =
              obj.stroke && obj.stroke !== 'transparent' && obj.stroke !== 'rgba(0,0,0,0)'
            const hasFill =
              obj.fill && obj.fill !== 'transparent' && obj.fill !== 'rgba(0,0,0,0)'

            if (hasStroke) {
              obj.set('stroke', interpolatedColor)
            }
            if (hasFill) {
              obj.set('fill', interpolatedColor)
            }
          })
          if (opacities && opacities[i] != null) {
            group.set('opacity', opacities[i])
          }
        }

        canvasInstance.add(group)
        group.setCoords()
        canvasInstance.renderAll()
      }
    }
  }

  // 处理拖拽预览图到主画布
  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  async function handleDrop(e: DragEvent, canvasEl: HTMLElement) {
    e.preventDefault()
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // 只支持从 Marks 区拖来的 Mark 实例
    const markInstanceId = e.dataTransfer?.getData('mark-instance-id')
    if (!markInstanceId) return

    const canvasRect = canvasEl.getBoundingClientRect()
    const dropX = e.clientX - canvasRect.left
    const dropY = e.clientY - canvasRect.top

    const dropOnEmitter = isDropOnEmitter(dropX, dropY)

    const markInstanceStore = useMarkInstanceStore()
    const { markInstances } = markInstanceStore
    const tableStore = useTableStore()

    const mark = markInstances.find((m: MarkInstance) => m.id === markInstanceId)
    if (!mark) return

    if (mark.isGroup) {
      await handleGroupInstanceDrop(mark, dropX, dropY, dropOnEmitter, canvasInstance, tableStore)
      return
    }

    await handleSingleInstanceDrop(mark, dropX, dropY, dropOnEmitter, canvasInstance, tableStore)
  }

  // 获取路径的起点和终点
  function getPathStartAndEndPoints(path: any): { start: { x: number; y: number } | null, end: { x: number; y: number } | null } {
    if (!path || !path.path || !Array.isArray(path.path)) {
      return { start: null, end: null }
    }

    const pathData = path.path
    let startPoint: { x: number; y: number } | null = null
    let endPoint: { x: number; y: number } | null = null

    // 遍历路径段，找到起点和终点
    for (const segment of pathData) {
      if (!Array.isArray(segment) || segment.length === 0) continue

      const command = segment[0]

      if (command === 'M') {
        // 移动到点 - 这是起点
        startPoint = { x: segment[1], y: segment[2] }
      } else if (command === 'L') {
        // 直线到点 - 更新终点
        endPoint = { x: segment[1], y: segment[2] }
      } else if (command === 'Q') {
        // 二次贝塞尔曲线 - 最后一个坐标是终点
        endPoint = { x: segment[3], y: segment[4] }
      } else if (command === 'C') {
        // 三次贝塞尔曲线 - 最后一个坐标是终点
        endPoint = { x: segment[5], y: segment[6] }
      } else if (command === 'Z' || command === 'z') {
        // 闭合路径命令，终点就是起点
        if (startPoint) {
          endPoint = { ...startPoint }
        }
      }
    }

    return { start: startPoint, end: endPoint }
  }

  // 计算两点之间的距离
  function calculateDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // 询问是否闭合路径
  function askToClosePath(path: any) {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance || !path) return

    // 跳过预览形状
    if (path.get('isPreview')) return

    // 只有当对象是 container 类型时才触发
    if (path.get('dataType') !== 'container') return

    // 上传的图不需要
    if (path.type === 'image') return

    const canvasModeStore = useCanvasModeStore()
    // 在其他模式下，不询问是否闭合路径
    if (canvasModeStore.mode !== 'draw' && canvasModeStore.mode !== 'rect' && canvasModeStore.mode !== 'ellipse') return
    
    
    // 对于 draw 模式，检查起点和终点距离
    if (canvasModeStore.mode === 'draw' && path.type === 'path' && path.path) {
        const { start, end } = getPathStartAndEndPoints(path)
        
        if (start && end) {
          // 计算起点和终点的距离
          const distance = calculateDistance(start, end)
          // 如果距离大于 100 像素，不询问是否闭合路径
          if (distance > 100) {
            return
          }
        }
      }
    
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
  function getDataBinding() {
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

  async function renderResult() { 
    const collageSeriesStore = useCollageSeriesStore()
    const { overviews, currentOverviewIndex, currentSlideIndex } = storeToRefs(collageSeriesStore)
    const currentOverview = overviews.value[currentOverviewIndex.value]
    if (currentOverview && currentOverview.collageSeries.length > 0) {
      const lastSlide = currentOverview.collageSeries[currentOverview.collageSeries.length - 1]
      // 如果最后一个 slide 是结果，删除它
      if ((lastSlide as any).isResult === true) {
        currentOverview.collageSeries.pop()  
      }
    }

    collageSeriesStore.addNewSlide(true)
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
        const markerId = `result_marker`
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

            // 先设置基本属性
            obj.set({
              selectable: true,
              evented: true,
              dataType: 'marker',
              data: data,
              markerId: markerId
            })

            // 添加到画布
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
              top: centerPoint.y
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
  isSegmentLoading,
  setSegmentLoading,
  setCanvas,
  addCanvasEventListeners,
  removeCanvasEventListeners,
  setDrawedObjectDataType,
  adjustLayer,
  // removeObjectsByMarkerId,
  isDropOnEmitter,
  getBezierApproxLength,
  calculateBezierPoint,
  getEmitterSampledPoints,
  // addMarkers,
  // handleEmitterDrop,
  // handleMarkerDrop,
  handleDragOver,
    handleDrop,
  askToClosePath,
  handleClosePathConfirm,
  renderResult,
  enlivenAllContainerObjects
}
})
