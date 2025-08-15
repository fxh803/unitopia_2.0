import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Canvas } from 'fabric'
import { useOverviewStore } from '~/stores/overview'

export const useCollageSeriesStore = defineStore('collageSeries', () => {
    // 拼贴系列状态
    const collageSeries = ref<{
        slideId: string,
        json: string,
        preview: string,
        dataTypeArray: any[],
        markerIdArray: any[],
        forceTypeArray: any[],
        uploadTypeArray: any[]
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
            markerIdArray: [],
            forceTypeArray: [],
            uploadTypeArray: []
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
            if (obj.get('dataType') === 'marker') {
                obj.set('opacity', 0)
            }else{
                obj.set('opacity', 1)
            }
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
        const forceTypeArray = objects.map((obj: any) => obj.get('forceType'))
        const uploadTypeArray = objects.map((obj: any) => obj.get('uploadType'))
        collageSeries.value[currentSlideIndex.value] = {
            slideId: collageSeries.value[currentSlideIndex.value].slideId,
            json,
            preview,
            dataTypeArray,
            markerIdArray,
            forceTypeArray,
            uploadTypeArray,
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
            markerIdArray: [],
            forceTypeArray: [],
            uploadTypeArray: []
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
        const forceTypeArray = collageSeries.value[idx].forceTypeArray || []
        const uploadTypeArray = collageSeries.value[idx].uploadTypeArray || []
        // 清空当前画布
        clearCanvas()
        if (jsonObj.objects.length > 0) {
            canvasInstance.loadFromJSON(json, () => {
                setTimeout(() => {
                    canvasInstance.renderAll()
                    // 恢复自定义属性 
                    console.log(dataTypeArray, markerIdArray, forceTypeArray, uploadTypeArray)
                    restoreCustomProperties(canvasInstance, dataTypeArray, markerIdArray, forceTypeArray, uploadTypeArray)
                    stopListen.value = false
                    overviewStore.updateMarkerObjects()
                }, 200)
            })
        } else {
            stopListen.value = false
            overviewStore.updateMarkerObjects()
        }

    }

    // 复制幻灯片
    function handleDuplicateSlide(idx: number) {
        if (idx < 0 || idx >= collageSeries.value.length) return

        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance) return

        stopListen.value = true

        // 获取要复制的幻灯片
        const originalSlide = collageSeries.value[idx]
        
        // 创建新的 slideId
        const newSlideId = generateSlideId()
        
        // 复制幻灯片数据
        const duplicatedSlide = {
            slideId: newSlideId,
            json: originalSlide.json,
            preview: originalSlide.preview,
            dataTypeArray: [...originalSlide.dataTypeArray],
            markerIdArray: [...originalSlide.markerIdArray],
            forceTypeArray: [...originalSlide.forceTypeArray],
            uploadTypeArray: [...originalSlide.uploadTypeArray]
        }

        // 在复制目标后面插入新幻灯片
        collageSeries.value.splice(idx + 1, 0, duplicatedSlide)

        // 复制数据绑定设置
        overviewStore.copyDataBindingSettings(originalSlide.slideId, newSlideId)

        // 如果复制的幻灯片在当前幻灯片之前或等于当前幻灯片，需要调整当前索引
        if (idx <= currentSlideIndex.value) {
            currentSlideIndex.value += 1
        }

        stopListen.value = false
        overviewStore.updateMarkerObjects()

        console.log(`Slide ${idx} duplicated successfully`)
    }

    // 删除幻灯片
    function handleDeleteCollageSeries(idx: number) {
        if (collageSeries.value.length <= 1) return // 至少保留一个幻灯片

        // 获取要删除的幻灯片的 slideId
        const slideToDelete = collageSeries.value[idx]
        const slideIdToDelete = slideToDelete.slideId

        // 如果删除的是当前幻灯片 
        if (idx === currentSlideIndex.value) {
            if (currentSlideIndex.value > 0) {
                currentSlideIndex.value = Math.max(0, idx - 1)
                handleCollageSeriesSelect(Math.max(0, idx - 1))
            }
            else {
                handleCollageSeriesSelect(idx + 1)
                currentSlideIndex.value = 0
            }

        } else if (idx < currentSlideIndex.value) {
            currentSlideIndex.value -= 1
        }
        collageSeries.value.splice(idx, 1)
        overviewStore.updateMarkerObjects()
    }




    // 恢复自定义属性
    function restoreCustomProperties(canvasInstance: Canvas, dataTypeArray: any, markerIdArray: any[] = [], forceTypeArray: any[] = [], uploadTypeArray: any[] = []) {
        const objects = canvasInstance.getObjects()
        // 遍历画布对象和JSON对象，恢复自定义属性
        objects.forEach((obj, index) => {
            if (dataTypeArray[index]) {
                obj.set('dataType', dataTypeArray[index])
                if(dataTypeArray[index] === 'emitter'){
                    obj.lockScalingX = true
                    obj.lockScalingY = true 
                    obj.lockRotation = true 
                }
            }
            if (markerIdArray[index]) {
                obj.set('markerId', markerIdArray[index])
            }
            if (forceTypeArray[index]) {
                obj.set('forceType', forceTypeArray[index])
                // 恢复力对象的锁定属性
                if (forceTypeArray[index] === 'fieldForce' ) {
                    obj.lockScalingX = true
                    obj.lockScalingY = true 
                    obj.lockMovementX = true
                    obj.lockMovementY = true 
                }
                else if (forceTypeArray[index] === 'pointForce') {
                    obj.lockScalingX = true
                    obj.lockScalingY = true
                    obj.lockRotation = true 
                }
            }
            if (uploadTypeArray[index]) {
                obj.set('uploadType', uploadTypeArray[index])
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
        canvasRef,
        setCanvas,
        initializeEmptySlide,
        updateCurrentSlide,
        addNewSlide,
        handleCollageSeriesSelect,
        handleDuplicateSlide,
        handleDeleteCollageSeries,
        getCurrentSlideId,
        restoreCustomProperties
    }
}) 