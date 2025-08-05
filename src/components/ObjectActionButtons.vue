<script setup lang="ts">
import { useObjectActionsStore } from '~/stores/objectActions'
import { storeToRefs } from 'pinia'
import { watch } from 'vue'

const objectActionsStore = useObjectActionsStore()
const {
    showDeleteBtn,
    deleteBtnPosition,
    showClosePathBtn,
    closePathBtnPosition,
    showGroupBtn,
    groupBtnPosition,
    isPathClosed,
    isGroupMode
} = storeToRefs(objectActionsStore)
const {
    deleteActiveObject,
    togglePathClosed,
    toggleGroup
} = objectActionsStore 
</script>

<template>
    <!-- 删除按钮 -->
    <button v-if="showDeleteBtn" class="delete-btn" :style="deleteBtnPosition" @click="deleteActiveObject">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path
                d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
            <path fill-rule="evenodd"
                d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
        </svg>
    </button>

    <!-- 封闭路径按钮 -->
    <button v-if="showClosePathBtn" class="close-path-btn" :style="closePathBtnPosition" @click="togglePathClosed">
        <svg v-if="!isPathClosed" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
            viewBox="0 0 16 16">
            <!-- 蓝色圆圈+对勾 -->
            <circle cx="8" cy="8" r="7" stroke="white" stroke-width="2" fill="none" />
            <path d="M4 8l2 2 4-4" stroke="white" stroke-width="2" fill="none" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <!-- 红色圆圈+叉 -->
            <circle cx="8" cy="8" r="7" stroke="white" stroke-width="2" fill="none" />
            <path d="M5 5l6 6M11 5l-6 6" stroke="white" stroke-width="2" fill="none" />
        </svg>
    </button>

    <!-- 分组/拆分组按钮 -->
    <button v-if="showGroupBtn" class="group-btn" :style="groupBtnPosition" @click="toggleGroup">
        <!-- Group图标 -->
        <div v-if="!isGroupMode" class="i-carbon:group-objects"></div> 
        <div v-else class="i-carbon:ungroup-objects"></div> 
    </button>
</template>

<style scoped>
.delete-btn {
    position: absolute;
    z-index: 10;
    background-color: #f87171;
    /* red-400 */
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
    transform: translate(-50%, -50%);
    transition: all 0.2s ease;
    /* pointer-events: none; */
    /* 让事件穿透按钮，到达下面的控制点 */
}
.delete-btn:hover {
    background-color: #ef4444;
    /* red-500 */
    transform: translate(-50%, -50%) scale(1.1);
}

.close-path-btn {
    position: absolute;
    z-index: 10;
    background-color: #60a5fa;
    /* blue-400 */
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
    transform: translate(-50%, -50%);
    transition: all 0.2s ease;
    pointer-events: all;
}

.close-path-btn:hover {
    background-color: #2563eb;
    /* blue-600 */
    transform: translate(-50%, -50%) scale(1.1);
}

.group-btn {
    position: absolute;
    z-index: 10;
    background-color: #ffffff;
    /* green-500 */
    color: #0d99ff;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    transform: translate(-50%, -50%);
    transition: all 0.2s ease;
    pointer-events: all;
}

.group-btn:hover {
    /* background-color: #e0e0e0; */
    /* green-600 */
    transform: translate(-50%, -50%) scale(1.1);
}
</style>