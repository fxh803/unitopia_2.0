import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Canvas } from 'fabric'
import { useBackgroundStore } from '~/stores/background'
import { FabricImage } from 'fabric'

export const useCollageSeriesStore = defineStore('collageSeries', () => {
    // 总览对象类型
    interface Overview {
        overviewId: string,
        preview: string,
        collageSeries: {
            slideId: string,
            json: string,
            preview: string,
            dataTypeArray: any[],
            markerIdArray: any[],
            forceTypeArray: any[],
            dataArray: any[],
        // 每个 object 的基础不透明度（用于跨 slide / 模式恢复）
        origOpacityArray?: number[],
            // 每个 slide 的个性化设置
            iterations?: number,
            render_size?: number,
            rotation?: boolean,
            hole?: boolean,
            orientation?: 'free' | 'center',
            margin?: number,
            emitter_type?: string,
            isResult?: boolean
        }[]
    }

    // 总览状态
    const overviews = ref<Overview[]>([])
    const currentOverviewIndex = ref(0)
    const currentSlideIndex = ref(0)

    // 为了保持向后兼容，保留 collageSeries 作为计算属性
    const collageSeries = computed(() => {
        if (overviews.value.length === 0) return []
        return overviews.value[currentOverviewIndex.value]?.collageSeries || []
    })
    const stopListen = ref(false) // 添加标志
    const canvasRef = ref<(() => Canvas | null) | null>(null)

    // 生成唯一的 slide ID
    function generateSlideId(): string {
        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substr(2, 9)
        return `slide-${timestamp}-${randomId}`
    }

    // 生成唯一的总览 ID
    function generateOverviewId(): string {
        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substr(2, 9)
        return `overview-${timestamp}-${randomId}`
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
        const overviewId = generateOverviewId()

        // 创建第一个总览，包含一个空白幻灯片
        overviews.value = [{
            overviewId,
            preview: preview, // 初始预览就是第一个幻灯片的预览
                collageSeries: [{
                    slideId,
                    json,
                    preview,
                    dataTypeArray: [],
                    markerIdArray: [],
                    forceTypeArray: [],
                    dataArray: [],
                    origOpacityArray: [],
                    // 每个 slide 的个性化设置
                    iterations: 150,
                    render_size: 1000,
                    rotation: true,
                    hole: false,
                    orientation: 'free',
                    margin: 0,
                    emitter_type: ''
                }]
        }]
        currentOverviewIndex.value = 0
        currentSlideIndex.value = 0
    }

    // 更新当前幻灯片
    function updateCurrentSlide() {
        if (stopListen.value) return // 如果是幻灯片操作，不更新

        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance || overviews.value.length === 0) return

        const currentOverview = overviews.value[currentOverviewIndex.value]
        if (!currentOverview || currentOverview.collageSeries.length === 0) return

        // 更新当前幻灯片的预览（保持原有逻辑）
        const currentSlide = currentOverview.collageSeries[currentSlideIndex.value]

        // 临时保存所有对象用于处理透明度和自定义属性
        const objects = canvasInstance.getObjects()
        const originalOpacities = new Map<any, number | undefined>()
        objects.forEach((obj: any) => {
            originalOpacities.set(obj, obj.opacity)
            obj.opacity = 1
        })

        const json = JSON.stringify(canvasInstance.toJSON())
        const preview = canvasInstance.toDataURL({
            format: 'png',
            multiplier: 2
        })

        // 恢复所有对象的原始透明度
        objects.forEach((obj: any) => {
            const originalOpacity = originalOpacities.get(obj)
            if (originalOpacity !== undefined) {
                obj.set('opacity', originalOpacity)
            }
        })

        // 保存所有对象的 dataType、markerId、forceType、data 以及基础透明度
        const dataTypeArray = objects.map((obj: any) => obj.get('dataType'))
        const markerIdArray = objects.map((obj: any) => obj.get('markerId'))
        const forceTypeArray = objects.map((obj: any) => obj.get('forceType'))
        const dataArray = objects.map((obj: any) => obj.get('data'))
        const origOpacityArray = objects.map((obj: any) => {
            // 如果有自定义的 _origOpacity，则优先使用，否则使用当前不透明度
            const anyObj = obj as any
            if (typeof anyObj._origOpacity === 'number') return anyObj._origOpacity as number
            const current = obj.opacity
            return typeof current === 'number' ? current : 1
        })
        // console.log(dataTypeArray, markerIdArray, forceTypeArray, dataArray)

        currentSlide.json = json
        currentSlide.preview = preview
        currentSlide.dataTypeArray = dataTypeArray
        currentSlide.markerIdArray = markerIdArray
        currentSlide.forceTypeArray = forceTypeArray
        currentSlide.dataArray = dataArray
        currentSlide.origOpacityArray = origOpacityArray

        // 生成总览的预览（合并所有幻灯片）
        generateOverviewPreview()
    }

    // 生成总览预览
    async function generateOverviewPreview() {
        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance || overviews.value.length === 0) return

        const currentOverview = overviews.value[currentOverviewIndex.value]
        if (!currentOverview || currentOverview.collageSeries.length === 0) return

        // 检查是否存在结果 slide（isResult 为 true）
        const resultSlide = currentOverview.collageSeries.find((slide: any) => slide.isResult === true)
        if (resultSlide && resultSlide.preview) {
            // 如果存在结果 slide，直接使用它的 preview
            currentOverview.preview = resultSlide.preview
            return
        }

        // 合并当前总览下所有幻灯片的 JSON 对象
        const mergedObjects: any[] = []

        // 遍历所有幻灯片，合并它们的对象
        currentOverview.collageSeries.forEach((slide, slideIndex) => {
            try {
                const slideData = typeof slide.json === 'string' ? JSON.parse(slide.json) : slide.json
                if (slideData.objects && Array.isArray(slideData.objects)) {
                    // 为每个对象添加来源信息，跳过背景对象
                    slideData.objects.forEach((obj: any, objIndex: number) => {
                        // 跳过背景对象 - 检查dataTypeArray而不是obj.dataType
                        if (slide.dataTypeArray[objIndex] === 'background') return

                        const mergedObj = {
                            ...obj,
                            slideIndex: slideIndex,
                            originalObjIndex: objIndex
                        }
                        mergedObjects.push(mergedObj)
                    })
                }
            } catch (error) {
                console.error(`解析幻灯片 ${slideIndex} 的 JSON 时出错:`, error)
            }
        })

        // 如果有总览背景，添加到合并对象的最前面（最底层）
        const backgroundStore = useBackgroundStore()
        const overviewBackground = backgroundStore.getCurrentOverviewBackground(currentOverview.overviewId)
        if (overviewBackground) {
            try {
                // 使用fabric.js的Promise方式加载背景图片
                const fabricImg = await FabricImage.fromURL(overviewBackground)

                // 设置背景图片属性
                fabricImg.set({
                    left: (canvasInstance.width || 400) / 2,
                    top: (canvasInstance.height || 400) / 2,
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    evented: false,
                    dataType: 'background'
                })

                // 计算合适的缩放比例，使图片完全适应画布
                const canvasWidth = canvasInstance.width || 400
                const canvasHeight = canvasInstance.height || 400

                const scaleX = canvasWidth / fabricImg.width
                const scaleY = canvasHeight / fabricImg.height
                const scale = Math.min(scaleX, scaleY)

                fabricImg.set({
                    scaleX: scale,
                    scaleY: scale
                })

                // 将背景对象添加到合并对象的最前面（最底层）
                const backgroundObj = {
                    ...fabricImg.toObject(),
                    slideIndex: -1, // 背景对象特殊标记
                    originalObjIndex: -1
                }
                mergedObjects.unshift(backgroundObj)
            } catch (error) {
                console.error('加载总览背景时出错:', error)
            }
        }

        // 创建合并后的 JSON 数据
        const mergedJsonData = {
            version: "5.3.0",
            objects: mergedObjects,
            background: "",
            backgroundImage: null,
            backgroundImageOpacity: 1,
            backgroundImageStretch: false,
            width: canvasInstance.width || 400,
            height: canvasInstance.height || 400,
            originX: "left",
            originY: "top",
            clipPath: null
        }

        // 创建临时画布来生成总览预览
        const tempCanvas = new Canvas(document.createElement('canvas'), {
            width: canvasInstance.width || 400,
            height: canvasInstance.height || 400
        })

        try {
            // 加载合并后的数据到临时画布
            await tempCanvas.loadFromJSON(mergedJsonData)
            tempCanvas.renderAll()

            // 生成总览预览
            const overviewPreview = tempCanvas.toDataURL({
                format: 'png',
                multiplier: 2
            })

            // 将预览保存到总览对象中
            currentOverview.preview = overviewPreview

            // 清理临时画布
            tempCanvas.dispose()
        } catch (error) {
            console.error('生成总览预览时出错:', error)
            tempCanvas.dispose()
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
    async function addNewSlide(isResult: boolean = false) {
        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance || overviews.value.length === 0) return
        stopListen.value = true

        // 获取当前总览
        const currentOverview = overviews.value[currentOverviewIndex.value]
        if (!currentOverview) {
            stopListen.value = false
            return
        }

        // 检查当前总览是否有背景
        const backgroundStore = useBackgroundStore()
        const currentOverviewBackground = backgroundStore.getCurrentOverviewBackground(currentOverview.overviewId)

        // 清空画布
        clearCanvas()

        // 创建新的空白幻灯片
        let json = JSON.stringify(canvasInstance.toJSON())
        let preview: string
        let dataTypeArray: any[] = []
        let markerIdArray: any[] = []
        let forceTypeArray: any[] = []
        let dataArray: any[] = []

        // 如果当前总览有背景，添加到JSON数据中
        if (currentOverviewBackground) {
            try {
                // 解析JSON数据
                const slideData = JSON.parse(json)
                // 使用fabric.js的Promise方式加载图片
                const fabricImg = await FabricImage.fromURL(currentOverviewBackground)

                // 设置图片属性
                fabricImg.set({
                    left: canvasInstance.width / 2,
                    top: canvasInstance.height / 2,
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    evented: false,
                    dataType: 'background'
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

                // 更新数组
                dataTypeArray.unshift('background')
                markerIdArray.unshift(null)
                forceTypeArray.unshift(null)
                dataArray.unshift(null)

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

        const newSlide = {
            slideId,
            json,
            preview,
            dataTypeArray,
            markerIdArray,
            forceTypeArray,
            dataArray,
            origOpacityArray: [],
            // 初始化个性化设置默认值
            iterations: 150,
            render_size: 1000,
            rotation: true,
            hole: false,
            orientation: 'free',
            margin: 0,
            emitter_type: '',
            isResult: isResult
        }

        // 如果不是结果 slide，需要检查是否有结果 slide，如果有则插入到结果之前
        if (!isResult) {
            // 查找结果 slide 的索引（结果必定在最后）
            const lastIndex = currentOverview.collageSeries.length - 1
            const lastSlide = currentOverview.collageSeries[lastIndex]
            if (lastSlide && (lastSlide as any).isResult === true) {
                // 如果最后一个 slide 是结果，在它之前插入
                currentOverview.collageSeries.splice(lastIndex, 0, newSlide)
                currentSlideIndex.value = lastIndex
            } else {
                // 没有结果 slide，直接 push
                currentOverview.collageSeries.push(newSlide)
                currentSlideIndex.value = currentOverview.collageSeries.length - 1
            }
        } else {
            // 是结果 slide，直接 push 到最后
            currentOverview.collageSeries.push(newSlide)
            currentSlideIndex.value = currentOverview.collageSeries.length - 1
        }

        stopListen.value = false
    }

    // 选择幻灯片
    function handleCollageSeriesSelect(idx: number) {
        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance || overviews.value.length === 0) return

        const currentOverview = overviews.value[currentOverviewIndex.value]
        if (!currentOverview || !currentOverview.collageSeries[idx]) return

        stopListen.value = true
        currentSlideIndex.value = idx
        const json = currentOverview.collageSeries[idx].json
        const jsonObj = typeof json === 'string' ? JSON.parse(json) : json
        const dataTypeArray = currentOverview.collageSeries[idx].dataTypeArray
        const markerIdArray = currentOverview.collageSeries[idx].markerIdArray || []
        const forceTypeArray = currentOverview.collageSeries[idx].forceTypeArray || []
        const dataArray = currentOverview.collageSeries[idx].dataArray || []
        const origOpacityArray = currentOverview.collageSeries[idx].origOpacityArray || []
        // 清空当前画布
        clearCanvas()
        if (jsonObj.objects.length > 0) {
            canvasInstance.loadFromJSON(json, () => {
                setTimeout(() => {
                    // 确保背景色为白色
                    canvasInstance.backgroundColor = '#fffef8'
                    canvasInstance.renderAll()
                    // 恢复自定义属性
                    restoreCustomProperties(canvasInstance, dataTypeArray, markerIdArray, forceTypeArray, dataArray, origOpacityArray)
                    // updateCurrentSlide()

                    stopListen.value = false
                }, 50)
            })
        } else {
            // 确保空白画布也有白色背景
            canvasInstance.backgroundColor = '#fffef8'
            canvasInstance.renderAll()
            stopListen.value = false
        }

    }

    // 复制幻灯片
    function handleDuplicateSlide(idx: number) {
        if (overviews.value.length === 0) return

        const currentOverview = overviews.value[currentOverviewIndex.value]
        if (!currentOverview || idx < 0 || idx >= currentOverview.collageSeries.length) return

        const canvasInstance = canvasRef.value?.()
        if (!canvasInstance) return

        stopListen.value = true

        // 获取要复制的幻灯片
        const originalSlide = currentOverview.collageSeries[idx]

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
            dataArray: [...(originalSlide.dataArray || [])],
            origOpacityArray: [...(originalSlide.origOpacityArray || [])],
            // 复制个性化设置
            iterations: (originalSlide as any).iterations ?? 150,
            render_size: (originalSlide as any).render_size ?? 1000,
            rotation: (originalSlide as any).rotation ?? true,
            hole: (originalSlide as any).hole ?? false,
            orientation: (originalSlide as any).orientation ?? 'free'
        }

        // 在复制目标后面插入新幻灯片
        currentOverview.collageSeries.splice(idx + 1, 0, duplicatedSlide)

        // 如果复制的幻灯片在当前幻灯片之前或等于当前幻灯片，需要调整当前索引
        if (idx <= currentSlideIndex.value) {
            currentSlideIndex.value += 1
        }

        stopListen.value = false

    }

    // 删除幻灯片
    function handleDeleteCollageSeries(idx: number) {
        if (overviews.value.length === 0) return

        const currentOverview = overviews.value[currentOverviewIndex.value]
        if (!currentOverview || currentOverview.collageSeries.length <= 1) return // 至少保留一个幻灯片

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
        currentOverview.collageSeries.splice(idx, 1)
        generateOverviewPreview()
    }




    // 恢复自定义属性
    function restoreCustomProperties(
        canvasInstance: Canvas,
        dataTypeArray: any[],
        markerIdArray: any[] = [],
        forceTypeArray: any[] = [],
        dataArray: any[] = [],
        origOpacityArray: number[] = []
    ) {
        const objects = canvasInstance.getObjects()
        // 遍历画布对象和JSON对象，恢复自定义属性
        objects.forEach((obj, index) => {
            obj.set('selectable', false)
            obj.set('evented', false)
            if (dataTypeArray[index]) {
                obj.set('dataType', dataTypeArray[index])
                if (dataTypeArray[index] === 'emitter') {
                    obj.hasControls = false
                }
                if (dataTypeArray[index] === 'marker') {
                    obj.hasControls = false
                    obj.selectable = true
                    obj.evented = true
                }
            }
            if (markerIdArray[index]) {
                obj.set('markerId', markerIdArray[index])
            }
            if (forceTypeArray[index]) {
                obj.set('forceType', forceTypeArray[index])
                // 恢复力对象的锁定属性
                if (forceTypeArray[index] === 'fieldForce') {
                    obj.setControlVisible('tl', false);
                    obj.setControlVisible('tr', false);
                    obj.setControlVisible('br', false);
                    obj.setControlVisible('bl', false);
                    obj.setControlVisible('ml', false);
                    obj.setControlVisible('mt', false);
                    obj.setControlVisible('mr', false);
                    obj.setControlVisible('mb', false);
                }
                else if (forceTypeArray[index] === 'pointForce') {
                    obj.hasControls = false
                }
            }
            if (dataArray[index] !== undefined && dataArray[index] !== null) {
                obj.set('data', dataArray[index])
            }
            if (origOpacityArray[index] !== undefined && origOpacityArray[index] !== null) {
                const baseOpacity = origOpacityArray[index]
                ;(obj as any)._origOpacity = baseOpacity
                obj.set('opacity', baseOpacity)
            }
        })
    }



    // 为当前总览的所有slide添加背景对象
    async function addBackgroundToAllSlides(backgroundObject: any) {
        if (overviews.value.length === 0) return
        const currentOverview = overviews.value[currentOverviewIndex.value]
        if (!currentOverview || currentOverview.collageSeries.length === 0) return

        stopListen.value = true

        // 使用for...of循环支持await，排除当前slide
        for (let index = 0; index < currentOverview.collageSeries.length; index++) {
            // 跳过当前slide，因为它的背景已经在画布中了
            if (index === currentSlideIndex.value) continue

            const slide = currentOverview.collageSeries[index]
            try {
                // 解析slide的JSON数据
                const slideData = JSON.parse(slide.json)

                // 检查是否已经存在背景对象
                const existingBackgroundIndex = slide.dataTypeArray.findIndex((dataType: any) =>
                    dataType === 'background'
                )
                // 如果存在背景对象，替换它；如果不存在，添加到最前面（最底层）
                if (existingBackgroundIndex !== -1) {
                    slideData.objects[existingBackgroundIndex] = backgroundObject
                } else {
                    slideData.objects.unshift(backgroundObject) // 添加到最前面，确保在最底层
                }

                // 更新slide的JSON数据
                currentOverview.collageSeries[index].json = JSON.stringify(slideData)

                // 更新数组，确保数据一致性
                if (existingBackgroundIndex !== -1) {
                    // 如果存在背景对象，更新对应位置的数组数据
                    slide.dataTypeArray[existingBackgroundIndex] = 'background'
                    // markerId、forceType 和 data 保持为 null，因为背景对象没有这些属性
                    slide.markerIdArray[existingBackgroundIndex] = null
                    slide.forceTypeArray[existingBackgroundIndex] = null
                    slide.dataArray[existingBackgroundIndex] = null
                } else {
                    // 如果不存在背景对象，在数组开头添加对应的数据
                    slide.dataTypeArray.unshift('background')
                    slide.markerIdArray.unshift(null)
                    slide.forceTypeArray.unshift(null)
                    slide.dataArray.unshift(null)
                }

                // 重新生成preview
                await regenerateSlidePreview(index, slideData)

            } catch (error) {
                console.error(`更新slide ${index} 背景时出错:`, error)
            }
        }
        stopListen.value = false
    }

    // 从当前总览的所有slide中移除背景对象
    async function removeBackgroundFromAllSlides() {
        if (overviews.value.length === 0) return
        const currentOverview = overviews.value[currentOverviewIndex.value]
        if (!currentOverview || currentOverview.collageSeries.length === 0) return

        stopListen.value = true

        // 使用for...of循环支持await，排除当前slide
        for (let index = 0; index < currentOverview.collageSeries.length; index++) {
            // 跳过当前slide，因为它的背景已经通过backgroundStore.clearBackground()清除了
            if (index === currentSlideIndex.value) continue

            const slide = currentOverview.collageSeries[index]
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
                        currentOverview.collageSeries[index].json = JSON.stringify(slideData)

                        // 从相关数组中移除对应的数据
                        slide.dataTypeArray.splice(backgroundIndex, 1)
                        slide.markerIdArray.splice(backgroundIndex, 1)
                        slide.forceTypeArray.splice(backgroundIndex, 1)
                        slide.dataArray.splice(backgroundIndex, 1)

                        // 重新生成preview
                        await regenerateSlidePreview(index, slideData)
                    }
                }

            } catch (error) {
                console.error(`从slide ${index} 移除背景时出错:`, error)
            }
        }
        stopListen.value = false
        generateOverviewPreview()
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


    // 添加新总览
    function addNewOverview() {
        const overviewId = generateOverviewId()
        const slideId = generateSlideId()
        stopListen.value = true
        clearCanvas()
        // 创建空白幻灯片
        const canvasInstance = canvasRef.value?.()
        let json = ''
        let preview = ''

        if (canvasInstance) {
            json = JSON.stringify(canvasInstance.toJSON())
            preview = canvasInstance.toDataURL({
                format: 'png',
                multiplier: 2
            })
        }

        const newOverview: Overview = {
            overviewId,
                    preview: preview, // 初始预览就是第一个幻灯片的预览
                collageSeries: [{
                    slideId,
                    json,
                    preview,
                    dataTypeArray: [],
                    markerIdArray: [],
                    forceTypeArray: [],
                    dataArray: [],
                    origOpacityArray: []
                }]
        }

        overviews.value.push(newOverview)
        currentOverviewIndex.value = overviews.value.length - 1
        currentSlideIndex.value = 0
        stopListen.value = false
    }

    // 选择总览
    function selectOverview(overviewIdx: number) {
        if (overviewIdx >= 0 && overviewIdx < overviews.value.length) {
            currentOverviewIndex.value = overviewIdx
            currentSlideIndex.value = 0
        }
    }

    // 删除总览
    function handleDeleteOverview(overviewIdx: number) {
        if (overviews.value.length <= 1) return // 至少保留一个总览

        stopListen.value = true

        // 获取要删除的总览ID，用于清理背景数据
        const overviewToDelete = overviews.value[overviewIdx]
        const overviewIdToDelete = overviewToDelete?.overviewId

        // 计算删除后的新当前总览索引
        let newCurrentOverviewIndex = currentOverviewIndex.value

        if (overviewIdx === currentOverviewIndex.value) {
            // 删除的是当前总览
            if (overviewIdx < overviews.value.length - 1) {
                // 不是最后一个，保持当前索引不变（下一个总览会自动成为当前索引）
                newCurrentOverviewIndex = overviewIdx
            } else {
                // 是最后一个，切换到前一个总览
                newCurrentOverviewIndex = overviewIdx - 1
            }
        } else if (overviewIdx < currentOverviewIndex.value) {
            // 删除的总览在当前总览之前，当前索引需要减1
            newCurrentOverviewIndex = currentOverviewIndex.value - 1
        }
        // 先删除总览
        overviews.value.splice(overviewIdx, 1)

        // 清理被删除总览的背景数据
        if (overviewIdToDelete) {
            const backgroundStore = useBackgroundStore()
            backgroundStore.clearCurrentOverviewBackground(overviewIdToDelete)
        }

        // 切换到新的当前总览
        currentOverviewIndex.value = newCurrentOverviewIndex
        currentSlideIndex.value = 0
        handleCollageSeriesSelect(0)

        stopListen.value = false
    }

    return {
        collageSeries,
        overviews,
        currentOverviewIndex,
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
        restoreCustomProperties,
        addBackgroundToAllSlides,
        removeBackgroundFromAllSlides,
        regenerateSlidePreview,
        addNewOverview,
        selectOverview,
        handleDeleteOverview,
        generateOverviewPreview
    }
})
