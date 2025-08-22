import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Canvas } from 'fabric'
import { useOverviewStore } from '~/stores/overview'
import { useBackgroundStore } from '~/stores/background'
import { FabricImage } from 'fabric'

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
    async function addNewSlide() {
        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance) return
        stopListen.value = true

        // 检查当前是否有背景
        const backgroundStore = useBackgroundStore()
        const hasBackground = backgroundStore.background

        // 清空画布
        clearCanvas()

        // 创建新的空白幻灯片
        let json = JSON.stringify(canvasInstance.toJSON())
        let preview: string
        let dataTypeArray: any[] = []
        let markerIdArray: any[] = []
        let forceTypeArray: any[] = []
        let uploadTypeArray: any[] = []

        // 如果有背景，添加到JSON数据中
        if (hasBackground) {
            try {
                // 解析JSON数据
                const slideData = JSON.parse(json)
                // 使用fabric.js的Promise方式加载图片
                const fabricImg = await FabricImage.fromURL(backgroundStore.background)

                // 设置图片属性
                fabricImg.set({
                    left: canvasInstance.width / 2,
                    top: canvasInstance.height / 2,
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    evented: false,
                    dataType: 'background',
                    uploadType: 'background_png'
                })

                // 计算合适的缩放比例，使图片完全适应画布
                const canvasWidth = canvasInstance.width || 400
                const canvasHeight = canvasInstance.height || 400

                const scaleX = canvasWidth / fabricImg.width
                const scaleY = canvasHeight / fabricImg.height
                const scale = Math.min(scaleX, scaleY) // 使用Math.min确保图片完全适应画布，不会超出边界

                fabricImg.set({
                    scaleX: scale,
                    scaleY: scale
                })

                slideData.objects.unshift(fabricImg.toObject())

                // 更新JSON数据
                json = JSON.stringify(slideData)

                // 更新四个数组
                dataTypeArray.unshift('background')
                uploadTypeArray.unshift('background_png')
                markerIdArray.unshift(null)
                forceTypeArray.unshift(null)

                canvasInstance.add(fabricImg)
                canvasInstance.renderAll()
                
                // 生成包含背景的preview
                preview = canvasInstance.toDataURL({
                    format: 'png',
                    multiplier: 2
                })

            } catch (error) {
                console.error('为新slide添加背景时出错:', error)
                // 如果出错，使用默认的空白preview
                preview = canvasInstance.toDataURL({
                    format: 'png',
                    multiplier: 2
                })
            }
        } else {
            // 没有背景时，使用默认的空白preview
            preview = canvasInstance.toDataURL({
                format: 'png',
                multiplier: 2
            })
        }

        const slideId = generateSlideId()

        collageSeries.value.push({
            slideId,
            json,
            preview,
            dataTypeArray,
            markerIdArray,
            forceTypeArray,
            uploadTypeArray
        })

        currentSlideIndex.value = collageSeries.value.length - 1
        stopListen.value = false
        // overviewStore.updateMarkerObjects()
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
                    // overviewStore.updateMarkerObjects()
                }, 200)
            })
        } else {
            stopListen.value = false
            // overviewStore.updateMarkerObjects()
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
        // overviewStore.updateMarkerObjects()

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
        // overviewStore.updateMarkerObjects()
    }




    // 恢复自定义属性
    function restoreCustomProperties(canvasInstance: Canvas, dataTypeArray: any, markerIdArray: any[] = [], forceTypeArray: any[] = [], uploadTypeArray: any[] = []) {
        const objects = canvasInstance.getObjects()
        // 遍历画布对象和JSON对象，恢复自定义属性
        objects.forEach((obj, index) => {
            obj.set('selectable', false)
            obj.set('evented', false)
            if (dataTypeArray[index]) {
                obj.set('dataType', dataTypeArray[index])
                if (dataTypeArray[index] === 'emitter') {
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
                if (forceTypeArray[index] === 'fieldForce') {
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

    // 为所有slide添加背景对象
    async function addBackgroundToAllSlides(backgroundObject: any) {
        if (collageSeries.value.length === 0) return
        stopListen.value = true

        // 使用for...of循环支持await，排除当前slide
        for (let index = 0; index < collageSeries.value.length; index++) {
            // 跳过当前slide，因为它的背景已经在画布中了
            if (index === currentSlideIndex.value) continue

            const slide = collageSeries.value[index]
            try {
                // 解析slide的JSON数据
                const slideData = JSON.parse(slide.json)

                // 检查是否已经存在背景对象
                const existingBackgroundIndex = slide.dataTypeArray.findIndex((dataType: any) =>
                    dataType === 'background'
                )
                console.log('existingBackgroundIndex', existingBackgroundIndex)
                // 如果存在背景对象，替换它；如果不存在，添加到最前面（最底层）
                if (existingBackgroundIndex !== -1) {
                    slideData.objects[existingBackgroundIndex] = backgroundObject
                } else {
                    slideData.objects.unshift(backgroundObject) // 添加到最前面，确保在最底层
                }

                // 更新slide的JSON数据
                collageSeries.value[index].json = JSON.stringify(slideData)

                // 更新四个数组，确保数据一致性
                if (existingBackgroundIndex !== -1) {
                    // 如果存在背景对象，更新对应位置的数组数据
                    slide.dataTypeArray[existingBackgroundIndex] = 'background'
                    slide.uploadTypeArray[existingBackgroundIndex] = 'background_png'
                    // markerId和forceType保持为null，因为背景对象没有这些属性
                    slide.markerIdArray[existingBackgroundIndex] = null
                    slide.forceTypeArray[existingBackgroundIndex] = null
                } else {
                    // 如果不存在背景对象，在数组开头添加对应的数据
                    slide.dataTypeArray.unshift('background')
                    slide.uploadTypeArray.unshift('background_png')
                    slide.markerIdArray.unshift(null)
                    slide.forceTypeArray.unshift(null)
                }

                // 重新生成preview
                await regenerateSlidePreview(index, slideData)

            } catch (error) {
                console.error(`更新slide ${index} 背景时出错:`, error)
            }
        }
        stopListen.value = false
    }

    // 从所有slide中移除背景对象
    async function removeBackgroundFromAllSlides() {
        if (collageSeries.value.length === 0) return
        stopListen.value = true

        // 使用for...of循环支持await，排除当前slide
        for (let index = 0; index < collageSeries.value.length; index++) {
            // 跳过当前slide，因为它的背景已经通过backgroundStore.clearBackground()清除了
            if (index === currentSlideIndex.value) continue

            const slide = collageSeries.value[index]
            try {
                // 解析slide的JSON数据
                const slideData = JSON.parse(slide.json)

                if (slideData.objects) {
                    // 找到背景对象的索引
                    const backgroundIndex = slide.dataTypeArray.findIndex((dataType: any) =>
                        dataType === 'background'
                    )

                    if (backgroundIndex !== -1) {
                        // 移除背景对象
                        slideData.objects.splice(backgroundIndex, 1)

                        // 更新slide的JSON数据
                        collageSeries.value[index].json = JSON.stringify(slideData)

                        // 从相关数组中移除对应的数据
                        slide.dataTypeArray.splice(backgroundIndex, 1)
                        slide.uploadTypeArray.splice(backgroundIndex, 1)
                        slide.markerIdArray.splice(backgroundIndex, 1)
                        slide.forceTypeArray.splice(backgroundIndex, 1)

                        // 重新生成preview
                        await regenerateSlidePreview(index, slideData)
                    }
                }

            } catch (error) {
                console.error(`从slide ${index} 移除背景时出错:`, error)
            }
        }
        stopListen.value = false
    }

    // 重新生成slide的preview
    async function regenerateSlidePreview(slideIndex: number, slideData: any) {
        try {
            const canvas = canvasRef.value?.()
            if (!canvas) return
            //新建临时画布
            // 画布大小与原fabric画布一致
            const originalWidth = canvas.width
            const originalHeight = canvas.height

            const tempCanvas = new Canvas(document.createElement('canvas'), {
                width: originalWidth,
                height: originalHeight
            })
            //加载幻灯片数据
            await tempCanvas.loadFromJSON(slideData)
            //渲染画布
            tempCanvas.renderAll()

            // 生成新的preview
            const newPreview = tempCanvas.toDataURL({
                format: 'png',
                multiplier: 2
            })

            // 更新slide的preview
            collageSeries.value[slideIndex].preview = newPreview

            // 清理临时画布
            tempCanvas.dispose()

        } catch (error) {
            console.error(`重新生成slide ${slideIndex} preview时出错:`, error)
        }
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
    restoreCustomProperties,
    addBackgroundToAllSlides,
    removeBackgroundFromAllSlides,
    regenerateSlidePreview
}
}) 