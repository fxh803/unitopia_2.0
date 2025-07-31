<script setup lang="ts">
import { defineProps, defineEmits, ref } from 'vue'

const props = defineProps<{ history: { json: string, preview: string }[] }>()
const emit = defineEmits(['select', 'delete'])

// 折叠状态
const isCollapsed = ref(true)

function handleClick(idx: number) {
  emit('select', idx)
}

function handleDelete(idx: number) {
  emit('delete', idx)
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <div class="relative flex h-full">
    <!-- 左侧把手按钮 -->
    <button
      @click="toggleCollapse"
      class="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-20 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-2"
      :title="isCollapsed ? 'Expand' : 'Collapse'"
    >
      <svg 
        class="w-4 h-4 text-gray-500 transition-transform duration-300"
        :class="isCollapsed ? '' : 'rotate-180'"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <!-- 面板内容 -->
    <aside 
      class="py-4 bg-white flex flex-col h-full items-center overflow-y-auto transition-all duration-300 shadow-left border-l border-gray-200 overflow-x-hidden"
      :class="isCollapsed ? 'w-13' : 'w-48'"
    >
      <!-- 标题 -->
      <div class="w-full px-2 mb-2">
        <h3 
          class="text-sm text-gray-400 transition-opacity duration-300"
          :class="isCollapsed ? 'opacity-0' : 'opacity-100'"
        >
          History
        </h3>
      </div>
      
      <!-- 历史记录列表 -->
      <div 
        v-if="!isCollapsed"
        class="w-full px-2"
      >
        <div
          v-for="(item, idx) in props.history"
          :key="idx"
          class="relative mb-3 border border-[#e6e6e6] rounded bg-[#f5f5f5] flex h-24 w-40 items-center justify-center group"
          @click="handleClick(idx)"
          style="cursor:pointer;"
        >
          <button
            class="absolute top-1 right-1 z-10 hidden group-hover:block bg-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-red-500 hover:text-white"
            @click.stop="handleDelete(idx)"
            title="Delete"
          >×</button>
          <img :src="item.preview" class="max-h-full max-w-full object-contain">
        </div>
      </div>
      
      <!-- 折叠时显示的历史记录数量 -->
      <div 
        v-else 
        class="flex flex-col items-center space-y-2"
      >
        <div class="text-xs text-gray-500 font-medium">
          {{ props.history.length }}
        </div>
        <div class="text-xs text-gray-400">
          Records
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.shadow-left {
  box-shadow: -4px 0 8px -4px rgba(0,0,0,0.08);
}
</style>
