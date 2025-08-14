import { defineStore } from 'pinia'
import type { Canvas } from 'fabric'
import { Group, ActiveSelection } from 'fabric'
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useObjectColorPickerStore } from '~/stores/objectColorPicker'
import { useForceDrawingStore } from '~/stores/forceDrawing'
const selectedModeStore = useSelectedModeStore()
const forceDrawingStore = useForceDrawingStore()
const objectColorPickerStore = useObjectColorPickerStore()
const { objectColor } = storeToRefs(objectColorPickerStore)
export const useObjectActionsStore = defineStore('objectActions', () => {
    const canvasRef = ref<(() => Canvas | null) | null>(null)
    const showDeleteBtn = ref(false)
    const actionBtnPosition = ref({ top: '0px', left: '0px' })
    const showClosePathBtn = ref(false)
    const showGroupBtn = ref(false)
    const showColorBtn = ref(false)
    const showLayerUpBtn = ref(false)
    const showLayerDownBtn = ref(false)
    const currentPathObj = ref<any>(null) //如果是需要响应式，则需要使用currentPathObj.value，如果只是画布操作，直接canvas.activeObject()
    // 设置 canvas 引用
    function setCanvas(canvas: () => Canvas | null) {
        canvasRef.value = canvas
    }
    const isPathClosed = computed(() => {
        const obj = currentPathObj.value
        return !!(obj && obj.fill && obj.fill !== 'transparent' && obj.fill !== 'rgba(0,0,0,0)')
    })
    const isGroupMode = computed(() => {
        const obj = currentPathObj.value
        return !!(obj && obj.type === 'group')
    })

    const isMultipleSelection = computed(() => {
        const obj = currentPathObj.value
        return !!(obj && obj.type === 'activeselection')
    })
    function setCurrentPathObj() {
        const canvasInstance = canvasRef.value?.()
        const obj = canvasInstance?.getActiveObject()
        currentPathObj.value = obj
    }
    function updateActionBtnVisble() {
        const canvasInstance = canvasRef.value?.()
        showDeleteBtn.value = true
        showClosePathBtn.value = true
        showGroupBtn.value = true
        showColorBtn.value = true
        showLayerUpBtn.value = true
        showLayerDownBtn.value = true
        if (!currentPathObj.value) {
            showDeleteBtn.value = false
            showClosePathBtn.value = false
            showGroupBtn.value = false
            showColorBtn.value = false
            showLayerUpBtn.value = false
            showLayerDownBtn.value = false
        }
        if (isGroupMode.value || isMultipleSelection.value) {
            showClosePathBtn.value = false
            showColorBtn.value = false
        }
        if (!isGroupMode.value && !isMultipleSelection.value) {
            showGroupBtn.value = false
        }
        if(selectedModeStore.selectedMode === 'emitter') { 
            showClosePathBtn.value = false
            showGroupBtn.value = false
            showColorBtn.value = false
            showLayerUpBtn.value = false
            showLayerDownBtn.value = false
        }
        if(selectedModeStore.selectedMode === 'force') { 
            showClosePathBtn.value = false
            showGroupBtn.value = false
            showColorBtn.value = false
            showLayerUpBtn.value = false
            showLayerDownBtn.value = false
            if(forceDrawingStore.forceType === 'fieldForce') {
                showDeleteBtn.value = false
            }
        }
        const activeObject = canvasInstance?.getActiveObject() 
        if(activeObject && activeObject.get('dataType') === 'container' && activeObject.get('type') === 'image') {
            showClosePathBtn.value = false 
        }
    }
    function updateActionBtnPosition() {
        const canvasInstance = canvasRef.value?.()
        if (!currentPathObj.value) {
            return
        }
        // 获取画布的变换信息
        const zoom = canvasInstance.getZoom()
        const vpt = canvasInstance.viewportTransform

        // 计算对象在画布容器中的实际位置
        const tr = currentPathObj.value.aCoords.tr
        const btnOffsetX = 20
        const btnOffsetY = 20

        // 应用画布变换
        const x = (tr.x * zoom) + (vpt[4] || 0)
        const y = (tr.y * zoom) + (vpt[5] || 0)

        actionBtnPosition.value = {
            top: `${y - btnOffsetY}px`,
            left: `${x + btnOffsetX}px`,
        } 
    }
    function deleteActiveObject() {
        const canvasInstance = canvasRef.value?.()
        const obj = canvasInstance?.getActiveObject()
        if (isMultipleSelection.value) {
            const objects = obj.getObjects()
            canvasInstance.remove(...objects)
            canvasInstance.discardActiveObject()
            canvasInstance.renderAll()
        } else if (obj && canvasInstance) {
            canvasInstance.remove(obj)
            canvasInstance.discardActiveObject()
            canvasInstance.renderAll()
        }
    }
    function togglePathClosed() {
        if (!currentPathObj.value) return
        const canvasInstance = canvasRef.value?.()
        if (!isPathClosed.value) {
            const strokeColor = currentPathObj.value.stroke || '#000'
            currentPathObj.value.set('fill', strokeColor)
        } else {
            currentPathObj.value.set('fill', null)
        }
        canvasInstance?.requestRenderAll()
        // 触发object:modified事件，让slide能够检测到变化
        canvasInstance?.fire('object:modified', { target: currentPathObj.value })
    }
    function toggleGroup() {
        const canvasInstance = canvasRef.value?.()
        const activeObject = canvasInstance?.getActiveObject()
        if (!activeObject || !canvasInstance) return

        // 检查是否为组对象（拆分组）
        if (isGroupMode.value) {
            // 使用removeAll()方法获取组中的所有对象并移除它们
            const objects = activeObject.removeAll()
            // 将对象重新添加到画布
            canvasInstance.add(...objects)

            // 从画布中移除组对象
            canvasInstance.remove(activeObject)

            // 创建ActiveSelection，保持多选状态
            const activeSelection = new ActiveSelection(objects, {
                canvas: canvasInstance
            })

            // 设置为活动对象
            canvasInstance.setActiveObject(activeSelection)
            canvasInstance.requestRenderAll()
        } else {
            // 分组：检查是否为多选对象
            if (isMultipleSelection.value) {
                // 获取所有选中的对象
                const objects = activeObject.getObjects()

                // 从画布中移除原始对象
                canvasInstance.remove(...objects)

                // 创建新的组，使用原始对象
                const group = new Group(objects, {
                    dataType: selectedModeStore.selectedMode
                })
                // 将组添加到画布
                canvasInstance.add(group)
                if (selectedModeStore.selectedMode === 'container') {
                    canvasInstance.sendObjectToBack(group);
                }
                canvasInstance.setActiveObject(group)
                canvasInstance.requestRenderAll()
            }
        }
    }
    function applyColor() { 
        const canvasInstance = canvasRef.value?.()
        const activeObject = currentPathObj.value 
        if (!activeObject || !canvasInstance) return

        const selectedColor = objectColor.value

        activeObject.set('stroke', selectedColor)
        if (activeObject.fill && activeObject.fill !== 'transparent' && activeObject.fill !== 'rgba(0,0,0,0)') {
            activeObject.set('fill', selectedColor)
        }
        canvasInstance.requestRenderAll()
        // 触发object:modified事件
        canvasInstance.fire('object:modified', { target: activeObject })
    }

    function getCurrentObjectColor() {
        const canvasInstance = canvasRef.value?.()
        const activeObject = currentPathObj.value
        if (!activeObject || !canvasInstance) return null

        // 优先返回 stroke 颜色，如果没有则返回 fill 颜色
        if (activeObject.stroke) {
            return activeObject.stroke
        } else if (activeObject.fill && activeObject.fill !== 'transparent' && activeObject.fill !== 'rgba(0,0,0,0)') {
            return activeObject.fill
        }

        // 默认颜色
        return '#000000'
    }

    function bringForward() {
        const canvasInstance = canvasRef.value?.()
        const activeObject = canvasInstance?.getActiveObject()
        if (!activeObject || !canvasInstance) return

        if (isMultipleSelection.value) {
            // 多选对象：将所有对象移到前面
            const objects = activeObject.getObjects()
            objects.forEach((obj: any) => {
                canvasInstance.bringObjectForward(obj)
            })
        } else if (isGroupMode.value) {
            // Group对象：将组移到前面
            canvasInstance.bringObjectForward(activeObject)
        } else {
            // 单个对象
            canvasInstance.bringObjectForward(activeObject)
        }

        canvasInstance.requestRenderAll()
        // 触发object:modified事件
        canvasInstance.fire('object:modified', { target: activeObject })
    }

    function sendBackwards() {
        const canvasInstance = canvasRef.value?.()
        const activeObject = canvasInstance?.getActiveObject()
        if (!activeObject || !canvasInstance) return

        // 获取所有对象
        const allObjects = canvasInstance.getObjects()
        // 统计container对象的数量
        const containerCount = allObjects.filter(obj => obj.get('dataType') === 'container').length
        if (containerCount>0) {
            // 如果有container对象，检查当前对象是否已经是倒数第二层
            const currentIndex = allObjects.indexOf(activeObject)
            if (currentIndex <= containerCount) { 
                return
            }
        }
        // 如果没有container对象，可以移动到最底层

        if (isMultipleSelection.value) {
            // 多选对象：将所有对象移到后面
            const objects = activeObject.getObjects()
            objects.forEach((obj: any) => {
                canvasInstance.sendObjectBackwards(obj)
            })
        } else if (isGroupMode.value) {
            // Group对象：将组移到后面
            canvasInstance.sendObjectBackwards(activeObject)
        } else {
            // 单个对象
            canvasInstance.sendObjectBackwards(activeObject)
        }

        canvasInstance.requestRenderAll()
        // 触发object:modified事件
        canvasInstance.fire('object:modified', { target: activeObject })
    }

    function hideBtns() {
        showDeleteBtn.value = false
        showClosePathBtn.value = false
        showGroupBtn.value = false
        showColorBtn.value = false
        showLayerUpBtn.value = false
        showLayerDownBtn.value = false
        // currentPathObj.value = null
    }

    return {
        showDeleteBtn,
        showClosePathBtn,
        showGroupBtn,
        showColorBtn,
        showLayerUpBtn,
        showLayerDownBtn,
        actionBtnPosition,
        isGroupMode,
        isMultipleSelection,
        isPathClosed,
        updateActionBtnVisble,
        updateActionBtnPosition,
        deleteActiveObject,
        togglePathClosed,
        toggleGroup,
        applyColor,
        getCurrentObjectColor,
        bringForward,
        sendBackwards,
        hideBtns,
        setCanvas,
        setCurrentPathObj
    }
}) 