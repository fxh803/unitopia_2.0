import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface MarkerData {
  id: string
  thumbnail: string
  jsonData: any
}

export const useMarkerStore = defineStore('marker', () => {
  // 存储所有 marker 数据
  const markers = ref<MarkerData[]>([])
  
  // 添加新的 marker
  const addMarker = (marker: Omit<MarkerData, 'id'>) => {
    const newMarker: MarkerData = {
      ...marker,
      id: `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    markers.value.push(newMarker)
    return newMarker
  }
  
  // 删除 marker
  const deleteMarker = (id: string) => {
    const markerIndex = markers.value.findIndex(marker => marker.id === id)
    if (markerIndex !== -1) {
      markers.value.splice(markerIndex, 1)
      return true
    }
    return false
  }
  
  // 清空所有 markers
  const clearAllMarkers = () => {
    markers.value = []
  }
  
  return {
    markers,
    addMarker, 
    deleteMarker,
    clearAllMarkers
  }
})
