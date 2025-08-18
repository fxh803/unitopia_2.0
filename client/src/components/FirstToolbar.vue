<script setup lang="ts"> 
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useAnimationStore } from '~/stores/animation'
import { storeToRefs } from 'pinia'

const selectedModeStore = useSelectedModeStore()
const animationStore = useAnimationStore()
const {selectedMode} = storeToRefs(selectedModeStore)
const {collaging} = storeToRefs(animationStore)
const {setSelectedMode} = selectedModeStore
</script>

<template>
  <!-- 一级工具栏：模式选择 -->
  <div class="px-2 py-4 border border-[#e6e6e6] rounded-xl bg-white flex flex-col gap-3 shadow left-6 top-1/2 absolute z-10 -translate-y-1/2">
    <button
      class="rounded flex h-10 w-10 items-center justify-center cursor-pointer"
      :class="[
        selectedMode === 'marker'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]',
        collaging ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      title="Marker Mode"
      @click="setSelectedMode('marker')"
      :disabled="collaging"
    >
      <span class="i-carbon:data-categorical" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center cursor-pointer"
      :class="[
        selectedMode === 'container'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]',
        collaging ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      title="Container Mode"
      @click="setSelectedMode('container')"
      :disabled="collaging"
    >
      <span class="i-carbon:area-custom" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center cursor-pointer"
      :class="[
        selectedMode === 'emitter'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]',
        collaging ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      title="Emitter Mode"
      @click="setSelectedMode('emitter')"
      :disabled="collaging"
    >
    <div class="i-carbon:anchor"></div>
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center cursor-pointer"
      :class="[
        selectedMode === 'force'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]',
        collaging ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      title="Force Mode"
      @click="setSelectedMode('force')"
      :disabled="collaging"
    >
      <span class="i-carbon:radio-button" />
    </button>
  </div>
</template>
 