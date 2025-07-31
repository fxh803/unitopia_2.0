import { ref } from 'vue'
import type { Canvas } from 'fabric'

export function useHistory(canvas: () => Canvas | null) {
  const history = ref<{ json: string, preview: string }[]>([])
  const currentSlideIndex = ref(0)
  const isSliding = ref(false) // 添加标志 

  // 初始化一个空白幻灯片
  function initializeEmptySlide() {
    console.log('useHistory: initializeEmptySlide')
    const canvasInstance = canvas()
    if (!canvasInstance) return

    canvasInstance.renderAll()
    const json = JSON.stringify(canvasInstance.toJSON())
    const preview = canvasInstance.toDataURL({
      format: 'png',
      multiplier: 2
    })
    history.value = [{ json, preview }]
    currentSlideIndex.value = 0
  }

  // 更新当前幻灯片
  function updateCurrentSlide() {
    console.log('useHistory: updateCurrentSlide')
    if (isSliding.value) return // 如果是幻灯片操作，不更新

    const canvasInstance = canvas()
    if (!canvasInstance || history.value.length === 0) return

    canvasInstance.renderAll()
    const json = JSON.stringify(canvasInstance.toJSON())
    const preview = canvasInstance.toDataURL({
      format: 'png',
      multiplier: 2
    })
    history.value[currentSlideIndex.value] = { json, preview }
  }

  // 清空画布
  function clearCanvas() {
    console.log('useHistory: clearCanvas')
    const canvasInstance = canvas()
    if (!canvasInstance) return

    const objects = canvasInstance.getObjects().concat()
    objects.forEach(obj => canvasInstance.remove(obj))
    canvasInstance.discardActiveObject()
  }

  // 添加新幻灯片
  function addNewSlide() {
    console.log('useHistory: addNewSlide')
    const canvasInstance = canvas()
    if (!canvasInstance) return
    isSliding.value = true
    // 清空画布
    clearCanvas()

    // 创建新的空白幻灯片
    const json = JSON.stringify(canvasInstance.toJSON())
    const preview = canvasInstance.toDataURL({
      format: 'png',
      multiplier: 2
    })
    history.value.push({ json, preview })
    currentSlideIndex.value = history.value.length - 1
    isSliding.value = false
  }

  // 选择幻灯片
  function handleHistorySelect(idx: number) {
    console.log('useHistory: handleHistorySelect', idx)
    const canvasInstance = canvas()
    if (!canvasInstance || !history.value[idx]) return
    isSliding.value = true
    currentSlideIndex.value = idx
    const json = history.value[idx].json
    const jsonObj = typeof json === 'string' ? JSON.parse(json) : json

    // 清空当前画布
    clearCanvas()

    // 加载选中的幻灯片
    canvasInstance.loadFromJSON(json, () => {
      setTimeout(() => {
        if (canvasInstance) {
          canvasInstance.renderAll()
        }
        isSliding.value = false
      }, 100)
    })
  }

  // 删除幻灯片
  function handleDeleteHistory(idx: number) {
    console.log('useHistory: handleDeleteHistory', idx)

    if (history.value.length <= 1) return // 至少保留一个幻灯片

    isSliding.value = true

    // // 如果删除的是当前幻灯片 
    // if (idx === currentSlideIndex.value) {
    //   currentSlideIndex.value = Math.max(0, idx - 1)
    //   handleHistorySelect(currentSlideIndex.value)
    // }
    // // 如果删除的幻灯片在当前幻灯片之前，需要调整索引
    // else if (idx < currentSlideIndex.value) {
    //   currentSlideIndex.value--
    // }
    history.value.splice(idx, 1)
    isSliding.value = false
  }

  // 监听画布变化，自动更新当前幻灯片
  function setupCanvasChangeListener() {
    console.log('useHistory: setupCanvasChangeListener')
    const canvasInstance = canvas()
    if (!canvasInstance) return

    canvasInstance.on('object:added', updateCurrentSlide)
    canvasInstance.on('object:modified', updateCurrentSlide)
    canvasInstance.on('object:removed', updateCurrentSlide)
  }

  return {
    history,
    currentSlideIndex,
    isSliding,
    initializeEmptySlide,
    updateCurrentSlide,
    addNewSlide,
    handleHistorySelect,
    handleDeleteHistory,
    setupCanvasChangeListener,
  }
} 