<script setup lang="ts"> 
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useAnimationStore } from '~/stores/animation'
import { storeToRefs } from 'pinia'

const selectedModeStore = useSelectedModeStore()
const animationStore = useAnimationStore()
const {selectedMode} = storeToRefs(selectedModeStore)
const {collaging,result_data} = storeToRefs(animationStore)
const {setSelectedMode} = selectedModeStore
</script>

<template>
  <!-- 一级工具栏：模式选择 -->
  <div v-show="!collaging&&!result_data.length>0" class="toolbar-container px-2 py-4 border border-[#e6e6e6] rounded-tr-xl rounded-br-xl bg-white flex flex-col gap-3 shadow left-0 absolute z-10" style="top: 150px;">
    <button
      class="toolbar-btn rounded flex h-10 items-center cursor-pointer overflow-hidden transition-all"
      :class="[
        selectedMode === 'container'
          ? 'bg-[var(--primary-color)] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]',
        collaging ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      @click="setSelectedMode('container')" 
    >
      <span class="i-carbon:area-custom flex-shrink-0 w-10 flex items-center justify-center" />
      <span class="text-sm font-medium whitespace-nowrap">Container</span>
    </button>
    <button
      class="toolbar-btn rounded flex h-10 items-center cursor-pointer overflow-hidden transition-all"
      :class="[
        selectedMode === 'emitter'
          ? 'bg-[var(--primary-color)] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]',
        collaging ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      @click="setSelectedMode('emitter')" 
    >
      <div class="i-carbon:anchor flex-shrink-0 w-10 flex items-center justify-center"></div>
      <span class="text-sm font-medium whitespace-nowrap">Emitter</span>
    </button>
    <button
      class="toolbar-btn rounded flex h-10 items-center cursor-pointer overflow-hidden transition-all"
      :class="[
        selectedMode === 'force'
          ? 'bg-[var(--primary-color)] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]',
        collaging ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      @click="setSelectedMode('force')" 
    >
      <span class="i-carbon:radio-button flex-shrink-0 w-10 flex items-center justify-center" />
      <span class="text-sm font-medium whitespace-nowrap">Force</span>
    </button>
  </div>
</template>

<style scoped>
.toolbar-container {
  width: auto;
}

.toolbar-btn {
  width: 40px; /* w-10 */
  gap: 0;
}

.toolbar-btn span:last-child {
  opacity: 0;
  width: 0;
  overflow: hidden;
  transition: opacity 0.2s, width 0.2s;
}

.toolbar-container:hover .toolbar-btn {
  width: auto;
  padding-right: 12px; /* px-3 */
  gap: 8px; /* gap-2 */
}

.toolbar-container:hover .toolbar-btn span:last-child {
  opacity: 1;
  width: auto;
}
</style>
 