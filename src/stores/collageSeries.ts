import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Canvas } from 'fabric'
import { useOverviewStore } from '~/stores/overview'
import { ElStep } from 'element-plus'

export const useCollageSeriesStore = defineStore('collageSeries', () => {
    // 拼贴系列状态
    const collageSeries = ref<{ 
        slideId: string, 
        json: string, 
        preview: string, 
        dataTypeArray: any[], 
        markerIdArray: any[] 
    }[]>([])
    const currentSlideIndex = ref(0)
    const stopListen = ref(false) // 添加标志
    const canvasRef = ref<(() => Canvas | null) | null>(null)
    const overviewStore = useOverviewStore()

    // 生成唯一的 slide ID
    function generateSlideId(): string {
        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substr(2, 9)
        return `slide-${timestamp}-${randomId}`
    }

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
        const slideId = generateSlideId()
        collageSeries.value = [{ 
            slideId, 
            json, 
            preview, 
            dataTypeArray: [], 
            markerIdArray: [] 
        }]
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
        
        // 保存所有对象的 dataType 和 markerId
        const objects = canvasInstance.getObjects()
        const dataTypeArray = objects.map((obj: any) => obj.get('dataType'))
        const markerIdArray = objects.map((obj: any) => obj.get('markerId'))
        
        console.log("debug:", dataTypeArray)
        console.log("markerIds:", markerIdArray)
        
        collageSeries.value[currentSlideIndex.value] = { 
            slideId: collageSeries.value[currentSlideIndex.value].slideId,
            json, 
            preview, 
            dataTypeArray,
            markerIdArray 
        }
    }

    // 清空画布
    function clearCanvas() {
        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance) return

        const objects = canvasInstance.getObjects().concat()
        if (objects.length > 0) {
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
        const slideId = generateSlideId()
        collageSeries.value.push({ 
            slideId, 
            json, 
            preview, 
            dataTypeArray: [], 
            markerIdArray: [] 
        })
        currentSlideIndex.value = collageSeries.value.length - 1
        stopListen.value = false
        overviewStore.updateMarkerObjects()
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
        const markerIdArray = collageSeries.value[idx].markerIdArray || []

        // 清空当前画布
        clearCanvas()
        if (jsonObj.objects.length > 0) {
            canvasInstance.loadFromJSON(json, () => {
                setTimeout(() => {
                    canvasInstance.renderAll()
                    // 恢复自定义属性
                    restoreCustomProperties(canvasInstance, dataTypeArray, markerIdArray)
                    stopListen.value = false
                    overviewStore.updateMarkerObjects()
                }, 200)
            })
        } else {
            stopListen.value = false
            overviewStore.updateMarkerObjects()
        }

    }

    // 删除幻灯片
    function handleDeleteCollageSeries(idx: number) {
        if (collageSeries.value.length <= 1) return // 至少保留一个幻灯片

        // 获取要删除的幻灯片的 slideId
        const slideToDelete = collageSeries.value[idx]
        const slideIdToDelete = slideToDelete.slideId

        // 清理该幻灯片相关的数据绑定设置
        cleanupSlideSettings(slideIdToDelete)

        // 如果删除的是当前幻灯片 
        if (idx === currentSlideIndex.value) {
            if (currentSlideIndex.value > 0) {
                currentSlideIndex.value = Math.max(0, idx - 1)
                handleCollageSeriesSelect(Math.max(0, idx - 1))
            }
            else{
                handleCollageSeriesSelect(idx + 1)
                currentSlideIndex.value = 0
            }
           
        } else if (idx < currentSlideIndex.value) {
            currentSlideIndex.value -= 1
        }
        collageSeries.value.splice(idx, 1)
        overviewStore.updateMarkerObjects()
    }

    // 清理幻灯片相关的数据绑定设置
    function cleanupSlideSettings(slideId: string) {
        const dataBindingSettings = overviewStore.dataBindingSettings
        
        // 确保 dataBindingSettings 存在
        if (!dataBindingSettings || !dataBindingSettings.value) {
            console.log(`dataBindingSettings 不存在，跳过清理`)
            return
        }
        
        // 删除所有以该 slideId 开头的设置
        const keysToDelete: string[] = []
        dataBindingSettings.value.forEach((value, key) => {
            if (key.startsWith(`${slideId}-`)) {
                keysToDelete.push(key)
            }
        })
        
        keysToDelete.forEach(key => {
            dataBindingSettings.value.delete(key)
        })
        
        console.log(`清理幻灯片 ${slideId} 的相关设置，删除了 ${keysToDelete.length} 个设置项`)
    }

    // 恢复自定义属性
    function restoreCustomProperties(canvasInstance: Canvas, dataTypeArray: any, markerIdArray: any[] = []) {
        const objects = canvasInstance.getObjects()
        // 遍历画布对象和JSON对象，恢复自定义属性
        objects.forEach((obj, index) => {
            if (dataTypeArray[index]) {
                obj.set('dataType', dataTypeArray[index])
            }
            if (markerIdArray[index]) {
                obj.set('markerId', markerIdArray[index])
            }
        })
    }

    // 获取当前幻灯片的 slideId
    function getCurrentSlideId(): string {
        if (collageSeries.value.length === 0 || currentSlideIndex.value >= collageSeries.value.length) {
            return ''
        }
        return collageSeries.value[currentSlideIndex.value].slideId
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
        handleDeleteCollageSeries,
        getCurrentSlideId
    }
}) 