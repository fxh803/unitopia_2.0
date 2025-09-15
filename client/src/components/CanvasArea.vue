<script setup lang="ts">
import { Canvas, PencilBrush, Group } from 'fabric'
import * as fabric from 'fabric'
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useObjectActionsStore } from '~/stores/objectActions'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useBrushSizeStore } from '~/stores/brushsize'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useCanvasStore } from '~/stores/canvas'
import { useShapeDrawingStore } from '~/stores/shapeDrawing'
import { useBezierDrawingStore } from '~/stores/bezierDrawing'
import { useForceDrawingStore } from '~/stores/forceDrawing'
import { useAnimationStore } from '~/stores/animation'
import { useBackgroundStore } from '~/stores/background'
import { handleMarkerDropCanvas, pharseData } from '~/composables/server'
const animationStore = useAnimationStore()
const { collaging, result_data } = storeToRefs(animationStore)
const selectedModeStore = useSelectedModeStore()
const { selectedMode, isContainerMode } = storeToRefs(selectedModeStore)

const brushSizeStore = useBrushSizeStore()
const { brushWidth } = storeToRefs(brushSizeStore)

const collageSeriesStore = useCollageSeriesStore()
const { collageSeries, currentSlideIndex, stopListen } = storeToRefs(collageSeriesStore)
const {
  initializeEmptySlide,
  updateCurrentSlide,
  addNewSlide,
  handleCollageSeriesSelect,
  handleDeleteCollageSeries
} = collageSeriesStore

const canvasModeStore = useCanvasModeStore()
const canvasStore = useCanvasStore()
const { mode } = storeToRefs(canvasModeStore)
const { setMode } = canvasModeStore
const { setDrawedObjectDataType, adjustLayer, containerColor } = canvasStore

const objectActionsStore = useObjectActionsStore()
const {
  updateActionBtnPosition,
  updateActionBtnVisble,
  hideBtns,
  setCurrentPathObj,
} = objectActionsStore

const shapeDrawingStore = useShapeDrawingStore()
const { isDrawingShape, shapeStart, previewShape } = storeToRefs(shapeDrawingStore)
const {
  addShapeEventListeners,
  removeShapeEventListeners
} = shapeDrawingStore

const forceDrawingStore = useForceDrawingStore()
const { addForcePointListener, removeForcePointListener, startBlinkAnimation, stopBlinkAnimation } = forceDrawingStore
const bezierDrawingStore = useBezierDrawingStore()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const canvasAreaRef = ref<HTMLDivElement | null>(null)
const canvasWrapperRef = ref<HTMLDivElement | null>(null)
const canvasSize = ref(400)
let canvas: Canvas | null = null

const backgroundStore = useBackgroundStore()
function getDpr() {
  return window.devicePixelRatio || 1
}

function resizeCanvasForDPR() {
  if (!canvas || !canvasEl.value) return
  const dpr = getDpr()
  const size = canvasSize.value
  canvasEl.value.width = size * dpr
  canvasEl.value.height = size * dpr
  canvas.setWidth(size)
  canvas.setHeight(size)
  // canvas.setZoom(dpr)
  canvas.renderAll()
}

function updateCanvasSize() {
  const parent = canvasAreaRef.value
  if (parent) {
    const rect = parent.getBoundingClientRect()
    // 减少边距，给画布更多空间
    const size = Math.floor(Math.min(rect.width, rect.height) - 20)
    canvasSize.value = Math.max(size, 200) // 增加最小尺寸
    if (canvas) {
      resizeCanvasForDPR()
    }
  }
}

function addCanvasEventListeners() {
  canvas.on({
    'selection:created': () => {
      setCurrentPathObj()
      updateActionBtnVisble()
      updateActionBtnPosition()

    },
    'selection:updated': () => {
      setCurrentPathObj()
      updateActionBtnVisble()
      updateActionBtnPosition()

    },
    'selection:cleared': hideBtns,
    'object:moving': hideBtns,
    'object:scaling': hideBtns,
    'object:rotating': hideBtns,
    'object:modified': () => {
      setCurrentPathObj()
      updateActionBtnVisble()
      updateActionBtnPosition()
      updateCurrentSlide()
    },
    'object:added': (e) => {
      setDrawedObjectDataType(e)
      updateCurrentSlide()
      adjustLayer()
    },
    'object:removed': () => {
      updateCurrentSlide()
    },
    'mouse:over': (e) => {
      // 鼠标悬停在对象上时添加偏透明蓝色效果
      if (e.target && e.target.get('dataType') === 'container') {
        e.target.set('opacity', 0.7)
        canvas.renderAll()
      } 
      if (e.target && e.target.get('dataType') === 'emitter') {
        // emitter是group，需要遍历其中的子对象设置透明度
        e.target.getObjects().forEach((childObj: any) => {
          childObj.set('opacity', 0.5)
        })
        canvas.renderAll()
      }
    },
    'mouse:out': (e) => {
      // 鼠标离开对象时恢复原始透明度
      if (e.target && e.target.get('dataType') === 'container') {
        e.target.set('opacity', 1)      
        canvas.renderAll()
      }
      if (e.target && e.target.get('dataType') === 'emitter') {
        // emitter是group，需要遍历其中的子对象恢复透明度
        e.target.getObjects().forEach((childObj: any) => {
          childObj.set('opacity', 1)
        })
        canvas.renderAll()
      }
    }
  })
}
function removeCanvasEventListeners() {
  canvas.off('selection:created')
  canvas.off('selection:updated')
  canvas.off('selection:cleared')
  canvas.off('object:moving')
  canvas.off('object:scaling')
  canvas.off('object:rotating')
  canvas.off('object:modified')
  canvas.off('object:added')
  canvas.off('object:removed')
  canvas.off('mouse:over')
  canvas.off('mouse:out')
}
watch(collaging, (newVal) => {
  if (newVal) {
    removeCanvasEventListeners()
  } else {
    addCanvasEventListeners()
  }
})
watch(stopListen, (newVal) => {
  if (!newVal) {
    addCanvasEventListeners()
  } else {
    removeCanvasEventListeners()
  }
})
watch(selectedMode, (newMode, oldMode) => {
  if (newMode !== oldMode || newMode === null) {
    setMode(null)
    if (selectedMode.value === null) {
      canvas?.getObjects().forEach(obj => {
        if (obj.get('dataType') === 'marker') {
          obj.selectable = true;
          obj.evented = true;
        }
      });
      canvas?.renderAll();
    }
  }
  if (newMode === 'force') {
    startBlinkAnimation()
  } else {
    stopBlinkAnimation()
  }
})
// 监听 mode 变化，自动清理 shape 预览和事件
watch(mode, () => {
  if (!canvas) return
  if (mode.value !== 'rect' && mode.value !== 'ellipse') {
    removeShapeEventListeners();
  }
  else {
    addShapeEventListeners();
  }
  if (mode.value === 'force') {
    addForcePointListener()
  }
  else {
    removeForcePointListener()
  }
})


// 画笔宽度变化时同步到画布
watch(brushWidth, (val) => {
  if (canvas && (mode.value === 'draw' || mode.value === 'erase')) {
    const dpr = getDpr()
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = val * dpr
    }
  }
})

// 处理拖拽预览图到主画布
function handleDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

// 删除指定markerId的所有对象
function removeObjectsByMarkerId(markerId: string) {
  if (!canvas) return

  const objects = canvas.getObjects().concat()
  objects.forEach(obj => {
    if (obj.get('dataType') === 'marker' && obj.get('markerId') === markerId) {
      canvas.remove(obj)
    }
  })
  canvas.discardActiveObject()
  canvas.renderAll()
}

// 检测拖拽位置是否在emitter上
function isDropOnEmitter(dropX: number, dropY: number): boolean {
  if (!canvas) return false
  
  const objects = canvas.getObjects()
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
  if (!canvas) return []
  
  const objects = canvas.getObjects()
  
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
async function addMarkers( groupJson: string, pos: Array<{ x: number, y: number }>, markerId: string) {
  try {
      for (const p of pos) {
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
          if (selectedMode.value === null) {
            group.selectable = true;
            group.evented = true;
          }

          // 调节对象大小，最大高/宽为50，保持宽高比
          const maxSize = 40
          const currentWidth = group.width || group.getScaledWidth()
          const currentHeight = group.height || group.getScaledHeight()

          if (currentWidth > 0 && currentHeight > 0) {
            const scaleX = maxSize / Math.max(currentWidth, currentHeight)
            const scaleY = scaleX // 保持宽高比

            group.set({
              scaleX: scaleX,
              scaleY: scaleY
            })
          }

          // 添加到主画布（此时所有属性都已设置好）
          canvas.add(group)
          // 强制更新对象
          group.setCoords()
          canvas.renderAll()

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
function handleDrop(e: DragEvent) {
  e.preventDefault()

  if (!canvas || !e.dataTransfer) return

  const groupJsonData = e.dataTransfer.getData('application/json')
  const markerId = e.dataTransfer.getData('text/plain')
  if (!groupJsonData) return

  // 计算拖拽位置相对于画布的偏移
  const canvasRect = canvasEl.value?.getBoundingClientRect()
  if (!canvasRect) return

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

onMounted(async () => {
  await nextTick()
  // 延迟一下确保DOM完全渲染
  setTimeout(() => {
    updateCanvasSize()
  }, 200)

  if (canvasEl.value) {
    canvas = new Canvas(canvasEl.value, {
      backgroundColor: 'transparent',
      isDrawingMode: false,
      selection: false,
      width: canvasSize.value,
      height: canvasSize.value,
    })
    
    const dpr = getDpr()
    const brush = new PencilBrush(canvas)
    brush.color = '#000'
    brush.width = brushWidth.value * dpr
    canvas.freeDrawingBrush = brush

    // 设置 canvas 引用
    canvasModeStore.setCanvas(() => canvas)
    collageSeriesStore.setCanvas(() => canvas)
    objectActionsStore.setCanvas(() => canvas)
    shapeDrawingStore.setCanvas(() => canvas)
    selectedModeStore.setCanvas(() => canvas)
    bezierDrawingStore.setCanvas(() => canvas)
    forceDrawingStore.setCanvas(() => canvas)
    backgroundStore.setCanvas(() => canvas)
    canvasStore.setCanvas(() => canvas)
    // 初始化空白幻灯片
    initializeEmptySlide()
    addCanvasEventListeners()
  }

})


</script>

<template>
  <section class="bg-gray-900 flex h-full min-h-0 min-w-0 w-full">
    <!-- 拼贴系列面板 - 移动到左侧 -->
    <CollageSeriesPanel />
    <!-- 主画布区域 -->
    <div ref="canvasAreaRef"
      class="p-2 border-r border-[#e6e6e6] bg-[#E5E5E5] flex flex-1 flex-row min-h-0 min-w-0 items-center justify-center relative overflow-hidden"
      @dragover="handleDragOver" @drop="handleDrop">
      <!-- 一级工具栏：模式选择 - 放在头部 -->
      <FirstToolbar />
      <!-- 新增canvas-wrapper，包裹canvas和button -->
      <div ref="canvasWrapperRef" class="canvas-wrapper" style="position: relative;">
        <!-- 画布本体 -->
        <canvas ref="canvasEl" class="border border-[#e6e6e6] rounded-2xl canvas-with-grid" />
        <paperCanvas v-if="collaging || result_data.length > 0" />
        <!-- 对象操作按钮 -->
        <ObjectActionButtons />
      </div>
      <!-- Container工具栏：仅在container模式下显示 -->
      <ContainerToolbar v-if="selectedMode === 'container'" />
      <!-- Emitter工具栏：仅在emitter模式下显示 -->
      <EmitterToolbar v-if="selectedMode === 'emitter'" />
      <!-- Force工具栏：仅在force模式下显示 -->
      <ForceToolbar v-if="selectedMode === 'force'" />
      <!-- 画笔粗细调节面板，仅在绘制/擦除模式下显示 -->
      <BrushSizePanel v-if="mode === 'draw' || mode === 'erase'" />
    </div>
  </section>
</template>

<style scoped>
.canvas-with-grid {
  background-image: url('/transparency_grid.svg');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
}
</style>
