<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAnimationStore } from '~/stores/animation'
import Table from './Table.vue'
import MarkerMappingPanel from './MarkerMappingPanel.vue'

// 拼贴处理状态store
const animationStore = useAnimationStore()
const { collaging ,result_data} = storeToRefs(animationStore)
</script>

<template>
  <aside class="border-r border-gray-200 bg-gray-50 h-full w-full flex flex-col relative">
    <!-- 拼贴处理状态遮罩 -->
    <div 
      v-if="collaging||result_data.length>0"
      class="absolute inset-0 bg-gray-300 bg-opacity-50 z-30 flex items-center justify-center"
    >
    </div>
    
    <!-- 内容区域 - 上半部分Table，下半部分SubCanvasArea -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- 上半部分：Table -->
      <div class="flex-1 min-h-0">
        <Table />
      </div>
      
      <!-- 分隔线 -->
      <div class="border-t border-gray-200"></div>
      
      <!-- 下半部分：左右两等边 -->
      <div class="flex-1 min-h-0 flex flex-col">
        <!-- 工具栏 -->
        <div class="flex justify-between items-center p-2 border-b border-gray-200 bg-gray-50 h-10 z-10 flex-shrink-0 shadow-sm">
          <span class="text-sm text-gray-600">Data Editor</span>
        </div>
        
        <!-- 内容区域 -->
        <div class="flex-1 min-h-0 flex">
          <!-- 左半边 -->
          <div class="w-1/2 border-r border-gray-200">
            <MarkerCanvasArea />
          </div>
          <!-- 右半边 -->
          <div class="w-1/2"> 
            <MarkerMappingPanel />
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
