import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSelectedModeStore = defineStore('selectedMode', () => {
    // 颜色选择器状态
    const selectedMode = ref<'container' | 'emitter' | 'force' | null>('container')
    const canvasRef = ref<(() => Canvas | null) | null>(null)

    // 设置canvas引用
    function setCanvas(canvas: () => Canvas | null) {
        canvasRef.value = canvas
    }

    // 处理模式切换时的对象透明度
    function handleModeSwitch(newMode: 'container' | 'emitter' | 'force' | null) {
        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance) return

        const objects = canvasInstance.getObjects()
        
        objects.forEach(obj => {
            // 根据对象类型设置透明度
            const objType = obj.get('dataType')
            
            if (newMode === null) {
                    obj.set('opacity', 1)
            } else if (objType === newMode) {
                // 当前模式的对象保持完全不透明
                obj.set('opacity', 1)
            } else if (objType && objType !== newMode) {
                // 其他模式的对象变成半透明
                if (objType === 'background') {
                    obj.set('opacity', 1)
                } else {
                    obj.set('opacity', 0.5)
                }
            }
        })
        
        canvasInstance.renderAll()
    }

    const setSelectedMode = (mode: 'container' | 'emitter' | 'force' | null) => {
        // 如果点击的是当前已选中的模式，则取消选择（设为null）
        if (selectedMode.value === mode) {
            selectedMode.value = null
        } else {
            selectedMode.value = mode
        }
        // 处理模式切换
        handleModeSwitch(selectedMode.value)
    }

    return {
        selectedMode,
        setSelectedMode,
        setCanvas,
        handleModeSwitch
    }
})  