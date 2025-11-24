import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBrushSizeStore = defineStore('brushSize', () => {
    // 主画布画笔大小
    const brushWidth = ref(6)
    // Marker画布画笔大小
    const markerBrushWidth = ref(6)

    return {
        brushWidth,
        markerBrushWidth
    }
}) 