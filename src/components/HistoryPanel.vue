<script setup lang="ts">
import { defineProps, defineEmits, ref } from 'vue'

const props = defineProps<{ 
  history: { json: string, preview: string }[]
  currentSlideIndex?: number
}>()
const emit = defineEmits(['select', 'delete', 'add-new'])

// 折叠状态
const isCollapsed = ref(false)

function handleClick(idx: number) {
  emit('select', idx)
}

function handleDelete(idx: number) {
  emit('delete', idx)
}

function handleAddNew() {
  emit('add-new')
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <div class="relative flex h-full">
    <!-- 面板内容 -->
    <aside 
      class="py-4 bg-white flex flex-col h-full items-center overflow-y-auto transition-all duration-300 shadow-right border-r border-gray-200 overflow-x-hidden relative"
      :class="isCollapsed ? 'w-13' : 'w-48'"
    >
      <!-- 收起按钮 - 放在右上角 -->
      <button
        @click="toggleCollapse"
        class="absolute top-3 right-3 z-20 bg-white hover:bg-gray-100 transition-all duration-200 p-1.5 rounded"
        :title="isCollapsed ? 'Expand' : 'Collapse'"
      >
        <div 
          class="w-5 h-5 text-gray-500 transition-all duration-300"
          :class="isCollapsed ? 'i-carbon:open-panel-left' : 'i-carbon:open-panel-filled-left'"
        ></div>
      </button>

      <!-- 标题 -->
      <div class="w-full px-2 mb-2">
        <h3 
          class="text-sm text-gray-400 transition-opacity duration-300 border-b border-gray-200 pb-2"
          :class="isCollapsed ? 'opacity-0' : 'opacity-100'"
        >
          History
        </h3>
      </div>
      
      <!-- 历史记录列表 -->
      <div 
        v-if="!isCollapsed"
        class="w-full px-2 h-full overflow-y-auto"
      >
        <div
          v-for="(item, idx) in props.history"
          :key="idx"
          class="relative mb-3 border rounded flex h-24 items-center justify-center group cursor-pointer"
          :class="[
            idx === props.currentSlideIndex 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-[#e6e6e6] bg-[#f5f5f5]'
          ]"
          @click="handleClick(idx)"
        >
          <button
            v-if="props.history.length > 1"
            class="absolute top-1 right-1 z-10 hidden group-hover:block bg-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-red-500 hover:text-white"
            @click.stop="handleDelete(idx)"
            title="Delete"
          >×</button>
          <img :src="item.preview" class="max-h-full max-w-full object-contain">
        </div>
        
        <!-- 添加新幻灯片按钮 -->
        <button
          @click="handleAddNew"
          class="w-full mb-3 border-2 border-dashed border-gray-300 rounded bg-gray-50 flex h-24 w-40 items-center justify-center hover:bg-gray-100 transition-colors"
          title="Add New Slide"
        >
          <div class="text-gray-400 text-2xl">+</div>
        </button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.shadow-right {
  box-shadow: 4px 0 8px -4px rgba(0,0,0,0.08);
}
</style>
