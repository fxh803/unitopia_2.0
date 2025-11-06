import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Canvas } from 'fabric'

export const useHoverInfoPanelStore = defineStore('hoverInfoPanel', () => {
  const showPanel = ref(false)
  const panelPosition = ref({ x: 0, y: 0 })
  const markerData = ref<any>(null)
  
  // 当前悬浮的 marker 对象
  let currentMarker: any = null
  
  // 更新面板位置
  function updatePanelPosition(e: MouseEvent, canvasInstance: Canvas | null) {
    if (!canvasInstance) return
    
    const canvasEl = canvasInstance.getElement()
    if (!canvasEl) return
    
    const canvasRect = canvasEl.getBoundingClientRect()
    
    // 计算相对于画布的位置
    const relativeX = e.clientX - canvasRect.left
    const relativeY = e.clientY - canvasRect.top
    
    // 面板显示在鼠标右下方，偏移 10px
    const offsetX = 10
    const offsetY = 10
    
    // 确保面板不超出画布边界
    const panelWidth = 300 // 预估面板宽度
    const panelHeight = 200 // 预估面板高度
    
    let x = relativeX + offsetX
    let y = relativeY + offsetY
    
    // 如果右侧空间不足，显示在左侧
    if (x + panelWidth > canvasRect.width) {
      x = relativeX - panelWidth - offsetX
    }
    
    // 如果下方空间不足，显示在上方
    if (y + panelHeight > canvasRect.height) {
      y = relativeY - panelHeight - offsetY
    }
    
    panelPosition.value = { x, y }
  }
  
  // 处理 marker 悬浮
  function handleMarkerHover(e: any, canvasInstance: Canvas | null) {
    const target = e.target
    if (target && target.get('dataType') === 'marker') {
      const data = target.get('data')
      if (data) {
        currentMarker = target
        markerData.value = data
        showPanel.value = true
        // 使用当前鼠标位置更新面板位置
        if (e.e && canvasInstance) {
          updatePanelPosition(e.e, canvasInstance)
        }
      }
    }
  }
  
  // 处理鼠标离开 marker
  function handleMarkerOut(e: any) {
    const target = e.target
    if (target && target.get('dataType') === 'marker') {
      // 如果离开的是当前悬浮的 marker，隐藏面板
      if (target === currentMarker || !currentMarker) {
        showPanel.value = false
        markerData.value = null
        currentMarker = null
      }
    }
  }
  
  // 处理画布鼠标移动
  function handleCanvasMouseMove(e: any, canvasInstance: Canvas | null) {
    if (showPanel.value && e.e && canvasInstance) {
      updatePanelPosition(e.e, canvasInstance)
    }
  }
  
  return {
    showPanel,
    panelPosition,
    markerData,
    updatePanelPosition,
    handleMarkerHover,
    handleMarkerOut,
    handleCanvasMouseMove
  }
})

