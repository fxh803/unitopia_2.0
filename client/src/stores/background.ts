import { defineStore } from 'pinia'

export const useBackgroundStore = defineStore('background', () => {
  const background = ref(null)
  const creatingBackground = ref(false)
  const canvasRef = ref<(() => Canvas | null) | null>(null)
  const setCanvas = (canvas: () => Canvas | null) => {
    canvasRef.value = canvas
  }

  const clearBackground = () => {
    background.value = null
    const canvasInstance = canvasRef.value?.()
    if (!canvasInstance) return
    const objects = canvasInstance.getObjects()
    objects.forEach(obj => {
      if (obj.get('dataType') === 'background') {
        canvasInstance.remove(obj)
      }
    })
    canvasInstance.renderAll()
  }
  return {
    background,
    creatingBackground,
    canvasRef,
    setCanvas,
    clearBackground
  }
})