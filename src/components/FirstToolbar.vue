<script setup lang="ts"> 
import { useSelectedModeStore } from '~/stores/selectedMode'
import { storeToRefs } from 'pinia'
const selectedModeStore = useSelectedModeStore()
const {selectedMode} = storeToRefs(selectedModeStore)
const {setSelectedMode} = selectedModeStore
</script>

<template>
  <!-- 一级工具栏：模式选择 -->
  <div class="px-2 py-4 border border-[#e6e6e6] rounded-xl bg-white flex flex-col gap-3 shadow left-6 top-1/2 absolute z-10 -translate-y-1/2">
    <button
      class="rounded flex h-10 w-10 items-center justify-center"
      :class="[
        selectedMode === 'marker'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Marker Mode"
      @click="setSelectedMode('marker')"
    >
      <span class="i-carbon:data-categorical" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center"
      :class="[
        selectedMode === 'container'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Container Mode"
      @click="setSelectedMode('container')"
    >
      <span class="i-carbon:area-custom" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center"
      :class="[
        selectedMode === 'emitter'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Emitter Mode"
      @click="setSelectedMode('emitter')"
    >
    <div class="i-carbon:anchor"></div>
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center"
      :class="[
        selectedMode === 'force'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Force Mode"
      @click="setSelectedMode('force')"
    >
      <span class="i-carbon:radio-button" />
    </button>
  </div>
</template>
 