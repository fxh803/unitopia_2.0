<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useObjectActionsStore } from '~/stores/objectActions'
import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import { useSelectedModeStore } from '~/stores/selectedMode'
import ObjectColorPicker from './ObjectColorPicker.vue'

const objectActionsStore = useObjectActionsStore()
const selectedModeStore = useSelectedModeStore()
const {
    isContainerMode
} = storeToRefs(selectedModeStore)
const {
    showDeleteBtn, 
    showClosePathBtn, 
    showGroupBtn, 
    showLayerUpBtn, 
    showLayerDownBtn,
    showColorBtn,
    actionBtnPosition,
    isPathClosed,
    isGroupMode
} = storeToRefs(objectActionsStore)
const {
    deleteActiveObject,
    togglePathClosed,
    toggleGroup,
    bringForward,
    sendBackwards
} = objectActionsStore

// 删除对象并关闭圆盘
const handleDeleteObject = () => {
    deleteActiveObject()
    closeWheel()
}

// 控制转盘显示状态
const showWheel = ref(false)

// 更多按钮的引用
const moreBtnRef = ref<HTMLButtonElement>()

// 转盘位置
const wheelPosition = ref({ left: '0px', top: '0px' })

// 切换转盘显示
const toggleWheel = async () => {
    if (!showWheel.value) {
        // 获取按钮的屏幕位置
        await nextTick()
        if (moreBtnRef.value) {
            const rect = moreBtnRef.value.getBoundingClientRect()
            wheelPosition.value = {
                left: `${rect.left + rect.width / 2}px`,
                top: `${rect.top + rect.height / 2}px`
            }
        }
    }
    showWheel.value = !showWheel.value
}

// 点击转盘外部关闭转盘
const closeWheel = () => {
    showWheel.value = false
}

// 转盘配置
const wheelRadius = 80 // 转盘半径
const buttonRadius = 20 // 按钮半径

// 计算按钮位置的函数
const calculateButtonPosition = (angle: number) => {
    const radian = (angle * Math.PI) / 180
    const x = Math.cos(radian) * (wheelRadius - 10)
    const y = Math.sin(radian) * (wheelRadius - 10)
    return {
        left: `calc(50% + ${x}px - ${buttonRadius}px)`,
        top: `calc(50% + ${y}px - ${buttonRadius}px)`
    }
}

// 计算各个按钮的位置
const deleteBtnPos = computed(() => calculateButtonPosition(30)) 
const closePathBtnPos = computed(() => calculateButtonPosition(90))  
const groupBtnPos = computed(() => calculateButtonPosition(-30)) 
const layerDownBtnPos = computed(() => calculateButtonPosition(150))   
const layerUpBtnPos = computed(() => calculateButtonPosition(210))  
const colorBtnPos = computed(() => calculateButtonPosition(-90))  
</script>

<template>
    <!-- 更多按钮 -->
    <button v-if="showDeleteBtn || showClosePathBtn || showGroupBtn || showLayerUpBtn || showLayerDownBtn || showColorBtn"
        ref="moreBtnRef" class="more-btn" :style="actionBtnPosition" @click="toggleWheel">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path
                d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
        </svg>
    </button>

    <!-- 转盘容器 -->
    <div v-if="showWheel" class="wheel-overlay" @click="closeWheel">
        <div class="wheel-container" :style="wheelPosition" @click.stop>
            <!-- 转盘分段 -->
            <div class="wheel-segments">
                <div class="wheel-segment"></div>
                <div class="wheel-segment"></div>
                <div class="wheel-segment"></div>
                <div class="wheel-segment"></div>
                <div class="wheel-segment"></div>
                <div class="wheel-segment"></div>
            </div>

            <!-- 中心更多按钮 -->
            <button class="wheel-center-more-btn" @click="toggleWheel">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path
                        d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
                </svg>
            </button>

            <div class="wheel-content">
                <!-- 删除按钮 -->
                <button v-if="showDeleteBtn" class="wheel-btn delete-wheel-btn" :style="deleteBtnPos"
                    @click="handleDeleteObject">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                        viewBox="0 0 16 16">
                        <path
                            d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                        <path fill-rule="evenodd"
                            d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                    </svg>
                </button>

                <!-- 封闭路径按钮 -->
                <button v-if="showClosePathBtn" class="wheel-btn close-path-wheel-btn" :style="closePathBtnPos"
                    @click="togglePathClosed">
                    <svg v-if="!isPathClosed" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                        fill="currentColor" viewBox="0 0 16 16">
                        <circle cx="8" cy="8" r="7" stroke="white" stroke-width="2" fill="none" />
                        <path d="M4 8l2 2 4-4" stroke="white" stroke-width="2" fill="none" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                        viewBox="0 0 16 16">
                        <circle cx="8" cy="8" r="7" stroke="white" stroke-width="2" fill="none" />
                        <path d="M5 5l6 6M11 5l-6 6" stroke="white" stroke-width="2" fill="none" />
                    </svg>
                </button>

                <!-- 分组/拆分组按钮 -->
                <button v-if="showGroupBtn" class="wheel-btn group-wheel-btn" :style="groupBtnPos" @click="toggleGroup">
                    <div v-if="!isGroupMode" class="i-carbon:group-objects"></div>
                    <div v-else class="i-carbon:ungroup-objects"></div>
                </button>

                <!-- 层级上移按钮 -->
                <button v-if="showLayerUpBtn && !isContainerMode" class="wheel-btn layer-up-wheel-btn"
                    :style="layerUpBtnPos" @click="bringForward">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                        viewBox="0 0 16 16">
                        <path d="M8 2L2 8h3v6h6V8h3L8 2z" />
                    </svg>
                </button>

                <!-- 层级下移按钮 -->
                <button v-if="showLayerDownBtn && !isContainerMode" class="wheel-btn layer-down-wheel-btn"
                    :style="layerDownBtnPos" @click="sendBackwards">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                        viewBox="0 0 16 16">
                        <path d="M8 14L2 8h3V2h6v6h3L8 14z" />
                    </svg>
                </button>
                <!-- 取色器按钮 -->
                <ObjectColorPicker :style="colorBtnPos" class="wheel-btn color-wheel-btn" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.more-btn {
    position: absolute; 
    background-color: #6b7280;
    color: white;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
}

.more-btn:hover {
    background-color: #4b5563;
    /* transform: translate(-50%, -50%) scale(1.1); */
}

.wheel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
}

.wheel-container {
    position: absolute;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    display: flex;
    transform: translate(-50%, -50%);
    align-items: center;
    justify-content: center;
    animation: wheel-appear 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    overflow: hidden;
    background: transparent;
    z-index: 10000;
}

.wheel-segments {
    position: absolute;
    width: 200px;
    height: 200px;
    border-radius: 50%;
}

.wheel-segment {
    position: absolute;
    width: 100px;
    height: 100px;
    border: 1px solid #eaeaea;
    position: absolute;
    left: 50%;
    top: 50%;
    transform-origin: bottom right;
    transform: translate(-100%, -100%) rotate(45deg) skew(15deg, 15deg);
    background: rgba(250, 250, 250, 0.8);
    cursor: pointer;
}

.wheel-segment:nth-child(1) {
    transform: translate(-100%, -100%) rotate(45deg) skew(15deg, 15deg);
}

.wheel-segment:nth-child(2) {
    transform: translate(-100%, -100%) rotate(105deg) skew(15deg, 15deg);
}

.wheel-segment:nth-child(3) {
    transform: translate(-100%, -100%) rotate(165deg) skew(15deg, 15deg);
}

.wheel-segment:nth-child(4) {
    transform: translate(-100%, -100%) rotate(225deg) skew(15deg, 15deg);
}

.wheel-segment:nth-child(5) {
    transform: translate(-100%, -100%) rotate(285deg) skew(15deg, 15deg);
}

.wheel-segment:nth-child(6) {
    transform: translate(-100%, -100%) rotate(345deg) skew(15deg, 15deg);
}



.wheel-center-more-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: #6b7280;
    color: white;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease; 
    z-index: 1000;
}

.wheel-center-more-btn:hover {
    background-color: #4b5563;
    transform: translate(-50%, -50%) scale(1.1); 
}

.wheel-content {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center; 
    background: transparent;
}


.wheel-btn {
    position: absolute;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: white;
    font-size: 16px;
}

.wheel-btn:hover {
    transform: scale(1.2);
}

/* 删除按钮 */
.delete-wheel-btn {
    background-color: #ef4444;
}

.delete-wheel-btn:hover {
    background-color: #dc2626;
}

/* 封闭路径按钮 */
.close-path-wheel-btn {
    background-color: #3b82f6;
}

.close-path-wheel-btn:hover {
    background-color: #2563eb;
}

/* 分组按钮 */
.group-wheel-btn {
    background-color: #10b981; 
}

.group-wheel-btn:hover {
    background-color: #059669;
}

/* 层级上移按钮 */
.layer-up-wheel-btn {
    background-color: #8b5cf6;
}

.layer-up-wheel-btn:hover {
    background-color: #7c3aed;
}

/* 层级下移按钮 */
.layer-down-wheel-btn {
    background-color: #f59e0b;
}

.layer-down-wheel-btn:hover {
    background-color: #d97706;
}

/* 取色器按钮 */
.color-wheel-btn {
    background-color: transparent;
    padding: 0;
}

/* 转盘出现动画 */
@keyframes wheel-appear {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
    }
    50% {
        transform: translate(-50%, -50%) scale(1.1);
        opacity: 0.8;
    }
    100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
}
</style>