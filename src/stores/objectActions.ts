import { defineStore } from 'pinia'
import type { Canvas } from 'fabric'
import { Group, ActiveSelection } from 'fabric'
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useObjectColorPickerStore } from '~/stores/objectColorPicker'
const selectedModeStore = useSelectedModeStore()
const objectColorPickerStore = useObjectColorPickerStore()
const {objectColor} = storeToRefs(objectColorPickerStore)
export const useObjectActionsStore = defineStore('objectActions', () => {
    const canvasRef = ref<(() => Canvas | null) | null>(null)
    const showDeleteBtn = ref(false)
    const deleteBtnPosition = ref({ top: '0px', left: '0px' })
    const showClosePathBtn = ref(false)
    const closePathBtnPosition = ref({ top: '0px', left: '0px' })
    const showGroupBtn = ref(false)
    const groupBtnPosition = ref({ top: '0px', left: '0px' })
    const showColorBtn = ref(false)
    const colorBtnPosition = ref({ top: '0px', left: '0px' })
    const currentPathObj = ref<any>(null)
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
    function updateDeleteBtnPosition() { 
        const canvasInstance = canvasRef.value?.()
        if (!currentPathObj.value) {
            showDeleteBtn.value = false
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

        deleteBtnPosition.value = {
            top: `${y - btnOffsetY}px`,
            left: `${x + btnOffsetX}px`,
        }
        showDeleteBtn.value = true
    }
    function updateClosePathBtnPosition() { 
        const canvasInstance = canvasRef.value?.()
        if (!currentPathObj.value) {
            showClosePathBtn.value = false
            return
        }
        if (isGroupMode.value || isMultipleSelection.value) {
            showClosePathBtn.value = false
            return
        }
        // 获取画布的变换信息
        const zoom = canvasInstance.getZoom()
        const vpt = canvasInstance.viewportTransform

        // 计算对象在画布容器中的实际位置
        const tr = currentPathObj.value.aCoords.tr
        const btnOffsetX = -20
        const btnOffsetY = 20

        // 应用画布变换
        const x = (tr.x * zoom) + (vpt[4] || 0)
        const y = (tr.y * zoom) + (vpt[5] || 0)

        closePathBtnPosition.value = {
            top: `${y - btnOffsetY}px`,
            left: `${x + btnOffsetX}px`,
        }
        showClosePathBtn.value = true
    }
    function updateGroupBtnPosition() {     
        const canvasInstance = canvasRef.value?.()
        if (!currentPathObj.value) {
            showGroupBtn.value = false
            return
        }

        if (!isGroupMode.value && !isMultipleSelection.value) {
            showGroupBtn.value = false
            return
        }

        // 获取画布的变换信息
        const zoom = canvasInstance.getZoom()
        const vpt = canvasInstance.viewportTransform

        // 计算选择框的左上角位置
        const tr = currentPathObj.value.aCoords.tr
        const btnOffsetX = -20
        const btnOffsetY = 20

        // 应用画布变换
        const x = (tr.x * zoom) + (vpt[4] || 0)
        const y = (tr.y * zoom) + (vpt[5] || 0)

        groupBtnPosition.value = {
            top: `${y - btnOffsetY}px`,
            left: `${x + btnOffsetX}px`,
        }
        showGroupBtn.value = true
    }
    function deleteActiveObject() {
        const canvasInstance = canvasRef.value?.()
        const obj = currentPathObj.value
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
                canvasInstance.setActiveObject(group)
                canvasInstance.requestRenderAll()
            }
        }
    }

    function updateColorBtnPosition() {
        const canvasInstance = canvasRef.value?.()
        if (!currentPathObj.value) {
            showColorBtn.value = false
            return
        }
        if (isGroupMode.value || isMultipleSelection.value) {
            showColorBtn.value = false
            return
        }

        // 获取画布的变换信息
        const zoom = canvasInstance.getZoom()
        const vpt = canvasInstance.viewportTransform

        // 计算选择框的左上角位置
        const tr = currentPathObj.value.aCoords.tr
        const btnOffsetX = -60  // 放在其他按钮右侧
        const btnOffsetY = 20

        // 应用画布变换
        const x = (tr.x * zoom) + (vpt[4] || 0)
        const y = (tr.y * zoom) + (vpt[5] || 0)

        colorBtnPosition.value = {
            top: `${y - btnOffsetY}px`,
            left: `${x + btnOffsetX}px`,
        }
        showColorBtn.value = true
    }

    function applyColor() {
        console.log('applyColor')
        const canvasInstance = canvasRef.value?.()
        const activeObject = currentPathObj.value
        console.log(activeObject)
        if (!activeObject || !canvasInstance) return

        const selectedColor = objectColor.value
        console.log(selectedColor)
        if (isMultipleSelection.value) {
            // 多选对象：应用到所有选中的对象
            const objects = activeObject.getObjects()
            objects.forEach((obj: any) => {
                obj.set('stroke', selectedColor)
                if (obj.fill && obj.fill !== 'transparent' && obj.fill !== 'rgba(0,0,0,0)') {
                    obj.set('fill', selectedColor)
                }
            })
        } else if (isGroupMode.value) {
            // Group对象：应用到组内所有对象
            const objects = activeObject.getObjects()
            objects.forEach((obj: any) => {
                obj.set('stroke', selectedColor)
                if (obj.fill && obj.fill !== 'transparent' && obj.fill !== 'rgba(0,0,0,0)') {
                    obj.set('fill', selectedColor)
                }

            })
        } else { 
            activeObject.set('stroke', selectedColor)
            if (activeObject.fill && activeObject.fill !== 'transparent' && activeObject.fill !== 'rgba(0,0,0,0)') {
                activeObject.set('fill', selectedColor)
            }

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

    function hideBtns() {
        showDeleteBtn.value = false
        showClosePathBtn.value = false
        showGroupBtn.value = false
        showColorBtn.value = false
        // currentPathObj.value = null
    }

    return {
        showDeleteBtn,
        deleteBtnPosition,
        showClosePathBtn,
        closePathBtnPosition,
        showGroupBtn,
        groupBtnPosition,
        showColorBtn,
        colorBtnPosition,
        isGroupMode,
        isMultipleSelection,
        updateDeleteBtnPosition,
        deleteActiveObject,
        updateClosePathBtnPosition,
        updateGroupBtnPosition,
        updateColorBtnPosition,
        isPathClosed,
        togglePathClosed,
        toggleGroup,
        applyColor,
        getCurrentObjectColor,
        hideBtns,
        setCanvas,
        setCurrentPathObj
    }
}) 