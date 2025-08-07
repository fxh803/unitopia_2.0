import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Canvas } from 'fabric'
import { useOverviewStore } from '~/stores/overview'

export const useCollageSeriesStore = defineStore('collageSeries', () => {
    // 拼贴系列状态
    const collageSeries = ref<{ json: string, preview: string, dataTypeArray: any[] }[]>([])
    const currentSlideIndex = ref(0)
    const stopListen = ref(false) // 添加标志
    const canvasRef = ref<(() => Canvas | null) | null>(null)
    const overviewStore = useOverviewStore()

    // 设置 canvas 引用
    function setCanvas(canvas: () => Canvas | null) {
        canvasRef.value = canvas
    }

    // 初始化一个空白幻灯片
    function initializeEmptySlide() { 
        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance) return

        const json = JSON.stringify(canvasInstance.toJSON())
        const preview = canvasInstance.toDataURL({
            format: 'png',
            multiplier: 2
        })
        collageSeries.value = [{ json, preview, dataTypeArray: [] }]
        currentSlideIndex.value = 0
    }

    // 更新当前幻灯片
    function updateCurrentSlide() { 
        if (stopListen.value) return // 如果是幻灯片操作，不更新

        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance || collageSeries.value.length === 0) return

        // 临时保存所有对象的原始透明度
        const originalOpacities = new Map()
        canvasInstance.getObjects().forEach((obj: any) => {
            originalOpacities.set(obj, obj.opacity)
            obj.set('opacity', 1)
        })

        const json = JSON.stringify(canvasInstance.toJSON())
        const preview = canvasInstance.toDataURL({
            format: 'png',
            multiplier: 2
        })

        // 恢复所有对象的原始透明度
        canvasInstance.getObjects().forEach((obj: any) => {
            const originalOpacity = originalOpacities.get(obj)
            if (originalOpacity !== undefined) {
                obj.set('opacity', originalOpacity)
            }
        })
        //遍历jsonObj，将他们的dataType做成一个数组
        const dataTypeArray = canvasInstance.getObjects().map((obj: any) => obj.get('dataType'))
        console.log("debug:",dataTypeArray)
        collageSeries.value[currentSlideIndex.value] = { json, preview, dataTypeArray }
    }

    // 清空画布
    function clearCanvas() { 
        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance) return

        const objects = canvasInstance.getObjects().concat() 
        if(objects.length > 0){
            objects.forEach(obj => canvasInstance.remove(obj))
        }
    }

    // 添加新幻灯片
    function addNewSlide() { 
        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance) return
        stopListen.value = true
        // 清空画布
        clearCanvas()
        
        // 创建新的空白幻灯片
        const json = JSON.stringify(canvasInstance.toJSON())
        const preview = canvasInstance.toDataURL({
            format: 'png',
            multiplier: 2
        })
        collageSeries.value.push({ json, preview, dataTypeArray: [] })
        currentSlideIndex.value = collageSeries.value.length - 1
        stopListen.value = false 
    }

    // 选择幻灯片
    function handleCollageSeriesSelect(idx: number) { 
        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance || !collageSeries.value[idx]) return
        stopListen.value = true
        currentSlideIndex.value = idx
        const json = collageSeries.value[idx].json
        const jsonObj = typeof json === 'string' ? JSON.parse(json) : json
        const dataTypeArray = collageSeries.value[idx].dataTypeArray
     
        // 清空当前画布
        clearCanvas() 
        if(jsonObj.objects.length > 0){
            canvasInstance.loadFromJSON(json, () => {
                setTimeout(() => {
                    if (canvasInstance) {
                        canvasInstance.renderAll()
                        // 恢复自定义属性
                        restoreCustomProperties(canvasInstance, dataTypeArray) 
                        overviewStore.updateMarkerObjects()
                    }
                    stopListen.value = false
                }, 200)
            })
        }else{
            stopListen.value = false
        }
        
    }

    // 删除幻灯片
    function handleDeleteCollageSeries(idx: number) { 
        if (collageSeries.value.length <= 1) return // 至少保留一个幻灯片

        // 如果删除的是当前幻灯片 
        if (idx === currentSlideIndex.value) {
            currentSlideIndex.value = Math.max(0, idx - 1)
            handleCollageSeriesSelect(currentSlideIndex.value)
        } else if(idx < currentSlideIndex.value){
            currentSlideIndex.value -= 1
        }
        collageSeries.value.splice(idx, 1) 
    }

    // 恢复自定义属性
    function restoreCustomProperties(canvasInstance: Canvas, dataTypeArray: any) {
        const objects = canvasInstance.getObjects() 
        // 遍历画布对象和JSON对象，恢复自定义属性
        objects.forEach((obj, index) => {
            if (dataTypeArray[index]) {
                obj.set('dataType', dataTypeArray[index])
            }
        })
    }

    

    return {
        collageSeries,
        currentSlideIndex,
        stopListen,
        setCanvas,
        initializeEmptySlide,
        updateCurrentSlide,
        addNewSlide,
        handleCollageSeriesSelect,
        handleDeleteCollageSeries
    }
}) 