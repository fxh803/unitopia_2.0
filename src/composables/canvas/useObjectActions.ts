import { ref, computed } from 'vue'
import type { Canvas } from 'fabric'

export function useObjectActions(canvas: () => Canvas | null) {
  const showDeleteBtn = ref(false)
  const deleteBtnPosition = ref({ top: '0px', left: '0px' })
  const showClosePathBtn = ref(false)
  const closePathBtnPosition = ref({ top: '0px', left: '0px' })
  const currentPathObj = ref<any>(null)

  function updateDeleteBtnPosition() {
    const canvasInstance = canvas()
    const obj = canvasInstance?.getActiveObject()
    if (!obj) {
      showDeleteBtn.value = false
      return
    }
    const tr = obj.aCoords.tr
    const btnOffsetX = 20
    const btnOffsetY = 20
    deleteBtnPosition.value = {
      top: `${tr.y - btnOffsetY}px`,
      left: `${tr.x + btnOffsetX}px`,
    }
    showDeleteBtn.value = true
  }

  function deleteActiveObject() {
    const canvasInstance = canvas()
    const obj = canvasInstance?.getActiveObject()
    if (obj && canvasInstance) {
      canvasInstance.remove(obj)
      canvasInstance.discardActiveObject()
      canvasInstance.renderAll()
    }
  }

  function updateClosePathBtnPosition() {
    const canvasInstance = canvas()
    const obj = canvasInstance?.getActiveObject()
    currentPathObj.value = obj
    if (!obj) {
      showClosePathBtn.value = false
      return
    }
    const tr = obj.aCoords.tr
    const btnOffsetX = -20
    const btnOffsetY = 20
    closePathBtnPosition.value = {
      top: `${tr.y - btnOffsetY}px`,
      left: `${tr.x + btnOffsetX}px`,
    }
    showClosePathBtn.value = true
  }

  const isPathClosed = computed(() => {
    const obj = currentPathObj.value
    return !!(obj && obj.fill && obj.fill !== 'transparent' && obj.fill !== 'rgba(0,0,0,0)')
  })

  function togglePathClosed() {
    if (!currentPathObj.value) return
    const canvasInstance = canvas()
    if (!isPathClosed.value) {
      const strokeColor = currentPathObj.value.stroke || '#000'
      currentPathObj.value.set('fill', strokeColor)
    } else {
      currentPathObj.value.set('fill', null)
    }
    canvasInstance?.requestRenderAll()
  }

  function hideBtns() {
    showDeleteBtn.value = false
    showClosePathBtn.value = false
    currentPathObj.value = null
  }

  return {
    showDeleteBtn,
    deleteBtnPosition,
    showClosePathBtn,
    closePathBtnPosition,
    currentPathObj,
    updateDeleteBtnPosition,
    deleteActiveObject,
    updateClosePathBtnPosition,
    isPathClosed,
    togglePathClosed,
    hideBtns,
  }
} 