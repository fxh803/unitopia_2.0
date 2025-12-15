import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Canvas } from 'fabric'
import { Canvas as FabricCanvas, Group } from 'fabric'
import { useMarkerCanvasModeStore } from '~/stores/markerCanvasMode'
import { useMarkerObjectActionsStore } from '~/stores/markerObjectActions'

export const useMarkerCanvasStore = defineStore('markerCanvas', () => {
  const canvasRef = ref<(() => Canvas | null) | null>(null)
  
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

  // 实时预览图状态
  const previewDataUrl = ref<string>('')
  const previewGroup = ref<Group | null>(null)

  // 更新预览图
  async function updatePreview() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // 获取画布上的所有对象
    const allObjects = canvasInstance.getObjects()
    //新建一个fabricjs的group，将所有objectsgroup一起
    const cloneObjects = await Promise.all(allObjects.map(async (obj) => {
      return obj.clone()
    }))
    previewGroup.value = new Group(cloneObjects)
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = 60
    tempCanvas.height = 60

    const tempFabricCanvas = new FabricCanvas(tempCanvas, {
      width: 60,
      height: 60,
      backgroundColor: '#fffef8'
    })
    const originWidth = previewGroup.value.width
    const originHeight = previewGroup.value.height
    // 计算缩放比例，确保对象适合缩略图 
    const scaleX = 50 / Math.max(originWidth, 1)
    const scaleY = 50 / Math.max(originHeight, 1)
    const scale = Math.min(scaleX, scaleY, 1) // 不超过原始大小
    //把克隆对象放到画布正中央，做好缩放，并导出给previewDataUrl
    previewGroup.value.set('left', 30)
    previewGroup.value.set('top', 30)
    previewGroup.value.set('scaleX', scale)
    previewGroup.value.set('scaleY', scale)
    previewGroup.value.set('originX', 'center')
    previewGroup.value.set('originY', 'center')
    previewGroup.value.set('opacity', 1)
    tempFabricCanvas.add(previewGroup.value)
    tempFabricCanvas.renderAll()
    previewDataUrl.value = tempFabricCanvas.toDataURL({ format: 'png', multiplier: 1, enableRetinaScaling: false as any })
  }

  // 设置 canvas 引用
  function setCanvas(canvas: () => Canvas | null) {
    canvasRef.value = canvas
  }

  // 添加画布事件监听器
  function addMarkerCanvasEventListeners() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    // 在函数内导入 store，避免循环依赖
    const markerCanvasModeStore = useMarkerCanvasModeStore()
    const markerObjectActionsStore = useMarkerObjectActionsStore()

    canvasInstance.on({
      'object:added': (e) => {
        updatePreview()
        
        // 确保新添加的对象不可选（除非当前模式是 move）
        // 如果当前模式是 move，会根据对象类型在 markerCanvasModeStore.setMode 中设置
        if (markerCanvasModeStore.mode !== 'move') {
          e.target.set('selectable', false)
          e.target.set('evented', false)
        }
        
        // 询问是否闭合路径
        askToClosePath(e.target)
      },
      'selection:created': () => {
        markerObjectActionsStore.setCurrentPathObj()
        markerObjectActionsStore.updateActionBtnVisble()
        markerObjectActionsStore.updateActionBtnPosition()
      },
      'selection:updated': () => {
        markerObjectActionsStore.setCurrentPathObj()
        markerObjectActionsStore.updateActionBtnVisble()
        markerObjectActionsStore.updateActionBtnPosition()
      },
      'selection:cleared': () => {
        markerObjectActionsStore.hideBtns()
      },
      'object:moving': () => {
        markerObjectActionsStore.hideBtns()
      },
      'object:scaling': () => {
        markerObjectActionsStore.hideBtns()
      },
      'object:rotating': () => {
        markerObjectActionsStore.hideBtns()
      },
      'object:modified': () => {
        markerObjectActionsStore.setCurrentPathObj()
        markerObjectActionsStore.updateActionBtnVisble()
        markerObjectActionsStore.updateActionBtnPosition()
        updatePreview()
      },
      'object:removed': () => {
        updatePreview()
      }
    })
  }

  // 移除画布事件监听器
  function removeMarkerCanvasEventListeners() {
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return

    canvasInstance.off('object:added')
    canvasInstance.off('selection:created')
    canvasInstance.off('selection:updated')
    canvasInstance.off('selection:cleared')
    canvasInstance.off('object:moving')
    canvasInstance.off('object:scaling')
    canvasInstance.off('object:rotating')
    canvasInstance.off('object:modified')
    canvasInstance.off('object:removed')
  }

  // 获取路径的起点和终点
  function getPathStartAndEndPoints(path: any): { start: { x: number; y: number } | null, end: { x: number; y: number } | null } {
    if (!path || !path.path || !Array.isArray(path.path)) {
      return { start: null, end: null }
    }

    const pathData = path.path
    console.log(pathData)
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
    
    // 只有mode为draw或rect或ellipse的状态才询问是否闭合路径
    const markerCanvasModeStore = useMarkerCanvasModeStore()
    if (markerCanvasModeStore.mode !== 'draw' && markerCanvasModeStore.mode !== 'rect' && markerCanvasModeStore.mode !== 'ellipse') return
    
    // 对于 draw 模式，检查起点和终点距离
    if (markerCanvasModeStore.mode === 'draw' && path.type === 'path' && path.path) {
      const { start, end } = getPathStartAndEndPoints(path)
      
      if (start && end) {
        // 计算起点和终点的距离
        const distance = calculateDistance(start, end)
        // 如果距离大于 50 像素，不询问是否闭合路径
        if (distance > 50) {
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
      canvasInstance.requestRenderAll()
    }
    
    // 关闭确认对话框
    closePathConfirm.value = {
      show: false,
      path: null,
      position: { x: 0, y: 0 }
    }
  }

  return {
    canvasRef,
    closePathConfirm,
    previewDataUrl,
    setCanvas,
    addMarkerCanvasEventListeners,
    removeMarkerCanvasEventListeners,
    updatePreview,
    askToClosePath,
    handleClosePathConfirm
  }
})

