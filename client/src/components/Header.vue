<script setup lang="ts">
// 页头无需复杂逻辑
//导入server composables
import { collectAllSlidesData, sendDataToServer } from '~/composables/server'
import { useAnimationStore } from '~/stores/animation'
import { useCanvasStore } from '~/stores/canvas'
import { useTutorialStore } from '~/stores/tutorial'
import { storeToRefs } from 'pinia'
import { ref, watch, computed } from 'vue'
import {fabric} from 'fabric'
import { FabricImage } from 'fabric'
const animationStore = useAnimationStore()
const canvasStore = useCanvasStore()
const tutorialStore = useTutorialStore()
const { collaging, progress, result_data, replaying,now_overview_idx,totalOverview, time_interval } = storeToRefs(animationStore)

// 计算进度百分比
const percentage = ref(0)

// 计算是否显示replay按钮
const showReplayButton = computed(() => result_data.value && result_data.value.length > 0 && !collaging.value)
const showBackToEditButton = computed(() => !collaging.value&&result_data.value.length>0)
const showExportButton = computed(() => !collaging.value&&result_data.value.length>0)
const showRunButton = computed(() => result_data.value.length===0 || collaging.value)

// 监听progress变化，计算进度
watch(progress, (newProgress) => {
  if (newProgress && collaging.value || replaying.value) {
    const type = newProgress.type
    const totalsteps = newProgress.totalSteps
    const steps = newProgress.steps
    const now_collage = newProgress.now_collage
    const total_collage = newProgress.total_collage
    const now_overview = newProgress.now_overview_idx 
    if (totalsteps > 0 && total_collage > 0 && totalOverview.value > 0) {
      const currentTypeProgress = steps / totalsteps
      
      // 计算当前overview内的进度
      const currentOverviewProgress = (now_collage + currentTypeProgress / 2 + 1 / 2 * type) / total_collage
      
      // 计算前面overview的累计进度
      const previousOverviewProgress = now_overview / totalOverview.value
      
      // 计算当前overview占总进度的比例
      const currentOverviewWeight = 1 / totalOverview.value
      
      // 总进度 = 前面overview的进度 + 当前overview的进度
      percentage.value = (previousOverviewProgress + currentOverviewProgress * currentOverviewWeight) * 100
      
      // 确保百分比在0-100之间
      percentage.value = Math.min(Math.max(percentage.value, 0), 100)
    }
  } else {
    percentage.value = 0
  }
})

// 处理replay按钮点击
const handleReplay = () => {
  if (replaying.value) {
    animationStore.stopReplay()
  } else {
    percentage.value = 0
    animationStore.replay()
  }
}

const handleRun = () => {
  if (collaging.value) {
    return
  }else{
    if (result_data.value.length>0) {
      animationStore.resetData()
      animationStore.removeElements()
      animationStore.removeAnimation() 
    }
    sendDataToServer()
  }
}

const handleBackToEdit = async () => {
  animationStore.backToEdit()
}

// 处理调速拉条变化
const handleSpeedChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const speedMultiplier = parseFloat(target.value)
  
  // 将倍速转换为时间间隔 (基础时间2000ms / 倍速)
  const baseInterval = 2000
  const newInterval = Math.round(baseInterval / speedMultiplier)
  animationStore.time_interval = newInterval
  
  // 如果正在replay，需要重新设定timer
  if (replaying.value) {
    animationStore.updateReplayTimer()
  }
}

// 计算当前倍速显示
const currentSpeedMultiplier = computed(() => {
  const baseInterval = 2000
  return (baseInterval / time_interval.value).toFixed(1)
})

// 新建 Workspace：简单刷新页面
const handleRefresh = () => {
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

// 打开教程
const handleHelp = () => {
  tutorialStore.openTutorial()
}
</script>

<template>
  <div class="relative">
    <header class="px-6 border-b border-gray-200 bg-[var(--primary-color)] flex h-12 w-full shadow items-center z-20">
      <h1 class="text-xl text-gray-800 font-bold flex items-center gap-2">
        <img src="/UNITVIZ2.svg" alt="UnitoPia Logo" class="h-8 w-auto" />
        UnitoPia
      </h1>

      <!-- 始终显示：新建 Workspace 按钮 -->
      <button
        class="ml-6 flex items-center gap-2 px-4 h-full bg-[var(--primary-color)] text-[var(--title-color)] transition-colors duration-200 font-medium hover:bg-[var(--primary-hover-color)] cursor-pointer"
        @click="handleRefresh"
      >
        <span class="i-carbon:document-add text-base"></span>
        <span>New Workspace</span>
      </button>
      
      <!-- 播放按钮 -->
      <button 
        data-tutorial="run-button"
        class="ml-50px flex items-center gap-2 px-6 h-full bg-[var(--primary-color)] text-[var(--title-color)] transition-colors duration-200 font-medium hover:bg-[var(--primary-hover-color)]"
        :class="[replaying ? 'opacity-50 cursor-not-allowed' : '']"
        :disabled="replaying"
        @click="handleRun"
      >
        <div 
          v-if="!collaging"
          class="i-carbon:play text-lg"
        ></div>
        <div 
          v-else
          class="i-carbon:renew animate-spin text-lg"
        ></div>
        <span>{{ collaging ?  'Running...' : result_data.length>0 ? 'reRun' : 'Run' }}</span>
       
      </button>
      
      <!-- Replay 按钮 - 当result_data不为空时显示 -->
      <button 
        v-if="showReplayButton"
        class="flex items-center gap-2 px-6 h-full bg-[var(--primary-color)] text-[var(--title-color)] transition-colors duration-200 font-medium  hover:bg-[var(--primary-hover-color)]"
        @click="handleReplay"
      >
        <div 
          v-if="!replaying"
          class="i-carbon:reset text-lg" 
        ></div>
        <div 
          v-else
          class="i-carbon:renew animate-spin text-lg"
        ></div>
        <span>{{ replaying ? 'replaying...' : 'play' }}</span>
      </button>
      
      <!-- Export 按钮 -->
      <button v-show="showExportButton" 
      class="flex items-center gap-2 px-6 h-full bg-[var(--primary-color)] hover:bg-[var(--primary-hover-color)] text-[var(--title-color)] transition-colors duration-200 font-medium"
      :class="[ 
          replaying ? 'opacity-50 cursor-not-allowed' : ''
        ]">
        <div class="i-carbon:export text-lg"></div>
        <span>Export</span>
      </button>
      
      <!-- Back to Edit 按钮 -->
      <button 
        v-show="showBackToEditButton"
        class="flex items-center gap-2 px-6 h-full bg-[var(--primary-color)] hover:bg-[var(--primary-hover-color)] text-[var(--title-color)] transition-colors duration-200 font-medium"
        :class="[
          replaying ? 'opacity-50 cursor-not-allowed' : ''
        ]"
        :disabled="replaying"
        @click="handleBackToEdit"
      >
        <div class="i-carbon:edit text-lg"></div>
        <span>Back to Edit</span>
      </button>

      <!-- Help 按钮 - 靠右 -->
      <button
        class="ml-auto flex items-center gap-2 px-4 h-full bg-[var(--primary-color)] text-[var(--title-color)] transition-colors duration-200 font-medium hover:bg-[var(--primary-hover-color)]"
        @click="handleHelp"
      >
        <span class="i-carbon:help text-lg"></span>
        <span>Help</span>
      </button>
      
      <!-- 调速拉条 - 只在replay模式下显示 -->
      <div 
        v-if="replaying"
        class="flex items-center gap-3 px-6 h-full bg-white border-l border-gray-200"
      >
        <div class="i-carbon:time text-lg text-gray-600"></div>
        <span class="text-sm text-gray-600 font-medium">Speed:</span>
        <input
          type="range"
          min="0.5"
          max="4.0"
          step="0.1"
          :value="currentSpeedMultiplier"
          @input="handleSpeedChange"
          class="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <span class="text-xs text-gray-500 min-w-12">{{ currentSpeedMultiplier }}x</span>
      </div>
    </header>

    <!-- 进度条 - 移到header外部，使用fixed定位 -->
    <div 
      v-if="collaging||replaying"
      class="fixed top-11 left-0 w-full bg-gray-200 h-2 z-50"
    >
      <div 
        class="bg-[#fb9830] h-full transition-all duration-300 ease-out"
        :style="{ width: percentage + '%' }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.slider {
  -webkit-appearance: none;
  appearance: none;
  background: #e5e7eb;
  outline: none;
  border-radius: 8px;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.slider::-webkit-slider-thumb:hover {
  background: #2563eb;
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #3b82f6;
  cursor: pointer;
  border-radius: 50%;
  border: none;
  transition: background-color 0.2s;
}

.slider::-moz-range-thumb:hover {
  background: #2563eb;
}
</style>
