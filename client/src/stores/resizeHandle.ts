import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useResizeHandleStore = defineStore('resizeHandle', () => {
  // 左侧容器的宽度
  const leftWidth = ref(300)
  
  // 是否正在拖动
  const isDragging = ref(false)
  
  // 更新左侧宽度
  function updateLeftWidth(width: number) {
    leftWidth.value = width
  }
  
  // 设置拖动状态
  function setDragging(dragging: boolean) {
    isDragging.value = dragging
  }
  
  // 获取右侧容器的宽度（用于计算subCanvasArea的尺寸）
  function getRightWidth() {
    // 这里可以根据实际需要计算右侧宽度
    // 或者直接返回一个响应式的计算值
    return window.innerWidth - leftWidth.value
  }
  
  return {
    leftWidth,
    isDragging,
    updateLeftWidth,
    setDragging,
    getRightWidth
  }
})
