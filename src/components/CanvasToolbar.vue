<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps<{
  mode: 'draw' | 'move' | 'erase' | 'rect' | 'ellipse' | null
  setMode: (m: 'draw' | 'move' | 'erase' | 'rect' | 'ellipse') => void
  onClear: () => void
}>()
</script>

<template>
  <div class="px-2 py-4 border border-[#e6e6e6] rounded-xl bg-white flex flex-col gap-3 shadow left-6 top-1/2 absolute z-10 -translate-y-1/2">
    <button
      class="rounded flex h-10 w-10 items-center justify-center "
      :class="[
        'rounded flex h-10 w-10 items-center justify-center',
        props.mode === 'draw'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Draw"
      @click="() => props.setMode('draw')"
    >
      <span class="i-carbon-pen" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center "
      :class="[
        'rounded flex h-10 w-10 items-center justify-center',
        props.mode === 'move'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Move"
      @click="() => props.setMode('move')"
    >
      <span class="i-carbon-move" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center "
      :class="[
        'rounded flex h-10 w-10 items-center justify-center',
        props.mode === 'erase'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Eraser"
      @click="() => props.setMode('erase')"
    >
      <span class="i-carbon-erase" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center "
      :class="[
        'rounded flex h-10 w-10 items-center justify-center',
        props.mode === 'rect'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Rectangle"
      @click="() => props.setMode('rect')"
    >
      <span class="i-carbon:checkbox" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center "
      :class="[
        'rounded flex h-10 w-10 items-center justify-center',
        props.mode === 'ellipse'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Ellipse"
      @click="() => props.setMode('ellipse')"
    >
      <span class="i-carbon-circle-outline" />
    </button>
    <button
      class="text-white rounded bg-red-600 flex h-10 w-10 items-center justify-center hover:bg-red-700"
      title="Clear Canvas"
      @click="props.onClear"
    >
      <span class="i-carbon-trash-can" />
    </button>
  </div>
</template>

<style scoped>
.i-carbon-pen::before {
  content: '\f1c6';
  font-family: 'carbon-icons';
}
.i-carbon-move::before {
  content: '\f1b2';
  font-family: 'carbon-icons';
}
.i-carbon-erase::before {
  content: '\f1c0';
  font-family: 'carbon-icons';
}
.i-carbon-trash-can::before {
  content: '\f1bb';
  font-family: 'carbon-icons';
}
.i-carbon:checkbox::before {
  content: '\f0c8';
  font-family: 'carbon-icons';
}
.i-carbon-circle-outline::before {
  content: '\f1d4';
  font-family: 'carbon-icons';
}
</style>
