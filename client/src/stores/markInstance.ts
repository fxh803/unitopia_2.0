import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface MarkInstance {
  id: string
  name: string
  entities: number
  fieldType: 'numeric' | 'categorical' | null
  fieldName: string | null
}

export const useMarkInstanceStore = defineStore('markInstance', () => {
  const markInstances = ref<MarkInstance[]>([])

  function addMarkInstance(mark: Omit<MarkInstance, 'id'>) {
    const id = `mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    markInstances.value.push({
      id,
      ...mark,
    })
  }

  function removeMarkInstance(id: string) {
    markInstances.value = markInstances.value.filter(item => item.id !== id)
  }

  function clearAllMarkInstances() {
    markInstances.value = []
  }

  function updateMarkInstance(id: string, payload: Partial<Omit<MarkInstance, 'id'>>) {
    const target = markInstances.value.find(item => item.id === id)
    if (!target) return
    Object.assign(target, payload)
  }

  return {
    markInstances,
    addMarkInstance,
    removeMarkInstance,
    clearAllMarkInstances,
    updateMarkInstance,
  }
})

