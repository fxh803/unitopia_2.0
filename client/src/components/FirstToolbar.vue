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
  <div v-show="!collaging&&!result_data.length>0" class="px-4 py-2 border border-[#e6e6e6] rounded-xl bg-white flex flex-row gap-3 shadow top-2 left-1/2 -translate-x-1/2 absolute z-10">
    <button
      class="rounded flex h-10 px-3 items-center gap-2 cursor-pointer"
      :class="[
        selectedMode === 'container'
          ? 'bg-[var(--primary-color)] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]',
        collaging ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      title="Container Mode"
      @click="setSelectedMode('container')" 
    >
      <span class="i-carbon:area-custom" />
      <span class="text-sm font-medium">Container</span>
    </button>
    <button
      class="rounded flex h-10 px-3 items-center gap-2 cursor-pointer"
      :class="[
        selectedMode === 'emitter'
          ? 'bg-[var(--primary-color)] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]',
        collaging ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      title="Emitter Mode"
      @click="setSelectedMode('emitter')" 
    >
    <div class="i-carbon:anchor"></div>
    <span class="text-sm font-medium">Emitter</span>
    </button>
    <button
      class="rounded flex h-10 px-3 items-center gap-2 cursor-pointer"
      :class="[
        selectedMode === 'force'
          ? 'bg-[var(--primary-color)] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]',
        collaging ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      title="Force Mode"
      @click="setSelectedMode('force')" 
    >
      <span class="i-carbon:radio-button" />
      <span class="text-sm font-medium">Force</span>
    </button>
  </div>
</template>
 