import { ref } from 'vue'
import type { Canvas } from 'fabric'

export function useHistory(canvas: () => Canvas | null) {
  const history = ref<{ json: string, preview: string }[]>([])

  function saveSnapshot() {
    const canvasInstance = canvas()
    if (!canvasInstance) return
    canvasInstance.renderAll()
    const json = JSON.stringify(canvasInstance.toJSON())
    const preview = canvasInstance.toDataURL({ format: 'png', multiplier: 2 })
    history.value.unshift({ json, preview })
  }

  function handleHistorySelect(idx: number) {
    const canvasInstance = canvas()
    if (!canvasInstance || !history.value[idx]) return;
    const json = history.value[idx].json;
    const jsonObj = typeof json === 'string' ? JSON.parse(json) : json;
    if(jsonObj.objects.length === 0) return;
    
    const objects = canvasInstance.getObjects().concat();
    objects.forEach(obj => canvasInstance && canvasInstance.remove(obj));
    canvasInstance && canvasInstance.discardActiveObject();
    canvasInstance && canvasInstance.loadFromJSON(json, () => {
      setTimeout(() => {
        if (canvasInstance) {
          canvasInstance.renderAll();
        }
      }, 500)
    });
  }

  function handleDeleteHistory(idx: number) {
    history.value.splice(idx, 1)
  }

  return {
    history,
    saveSnapshot,
    handleHistorySelect,
    handleDeleteHistory,
  }
} 