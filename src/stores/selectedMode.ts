import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSelectedModeStore = defineStore('selectedMode', () => {
    // 颜色选择器状态
    const selectedMode = ref<'marker' | 'container' | null>(null)
    
    // 计算是否为Container模式
    const isContainerMode = computed(() => selectedMode.value === 'container')

    const setSelectedMode = (mode: 'marker' | 'container' | null) => {
        // 如果点击的是当前已选中的模式，则取消选择（设为null）
        if (selectedMode.value === mode) {
            selectedMode.value = null
        } else {
            selectedMode.value = mode
        }
    }


    return {
        selectedMode,
        isContainerMode,
        setSelectedMode
    }
})  