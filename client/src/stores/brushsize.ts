import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBrushSizeStore = defineStore('brushSize', () => {
    // 主画布画笔大小
    const brushWidth = ref(6)
    // Marker画布画笔大小
    const markerBrushWidth = ref(6)
    // 主画布画笔大小面板是否打开
    const isMainBrushSizePanelOpen = ref(false)
    // Marker画布画笔大小面板是否打开
    const isMarkerBrushSizePanelOpen = ref(false)

    // 设置主画布画笔大小面板打开状态
    const setMainBrushSizePanelOpen = (open: boolean) => {
        isMainBrushSizePanelOpen.value = open
    }

    // 设置Marker画布画笔大小面板打开状态
    const setMarkerBrushSizePanelOpen = (open: boolean) => {
        isMarkerBrushSizePanelOpen.value = open
    }

    return {
        brushWidth,
        markerBrushWidth,
        isMainBrushSizePanelOpen,
        isMarkerBrushSizePanelOpen,
        setMainBrushSizePanelOpen,
        setMarkerBrushSizePanelOpen
    }
}) 