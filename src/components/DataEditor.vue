<script setup lang="ts">
import { ref } from 'vue'
import Table from './Table.vue'


// 切换状态
const activeTab = ref<'table' | 'overview'>('table')

// 切换标签页
const switchTab = (tab: 'table' | 'overview') => {
  activeTab.value = tab
}
</script>

<template>
  <aside class="border-r border-gray-200 bg-gray-50 h-full w-full flex flex-col relative">
    <!-- 切换栏 -->
    <div class="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2">
      <div class="flex justify-center space-x-6">
        <button class="relative px-1 py-2 text-sm font-medium transition-colors duration-200" :class="[
          activeTab === 'table'
            ? 'text-[#0d99ff]'
            : 'text-gray-400 hover:text-gray-600'
        ]" @click="switchTab('table')">
          Table
          <!-- 下划线指示器 -->
          <div v-if="activeTab === 'table'"
            class="absolute bottom-0 left-0 h-0.5 bg-[#0d99ff] transition-all duration-200 w-full"></div>
        </button>
        <button class="relative px-1 py-2 text-sm font-medium transition-colors duration-200" :class="[
          activeTab === 'overview'
            ? 'text-[#0d99ff]'
            : 'text-gray-400 hover:text-gray-600'
        ]" @click="switchTab('overview')">
          Overview
          <!-- 下划线指示器 -->
          <div v-if="activeTab === 'overview'"
            class="absolute bottom-0 left-0 h-0.5 bg-[#0d99ff] transition-all duration-200 w-full"></div>
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-hidden">
      <!-- Table 模式 -->
      <div v-if="activeTab === 'table'" class="h-full">
        <Table />
      </div>

      <!-- Overview 模式 -->
      <div v-else-if="activeTab === 'overview'" class="h-full p-6">
        <div class="flex items-center justify-center h-full">
          <div class="text-center text-gray-500">
            <div class="text-6xl mb-4">📊</div>
            <h3 class="text-lg font-medium mb-2">Overview 模式</h3>
            <p class="text-sm">这里将显示数据概览和统计信息</p>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
