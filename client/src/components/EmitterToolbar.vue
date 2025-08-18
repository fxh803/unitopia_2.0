<script setup lang="ts">
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useBezierDrawingStore } from '~/stores/bezierDrawing'
import { storeToRefs } from 'pinia'

const canvasModeStore = useCanvasModeStore() 
const bezierDrawingStore = useBezierDrawingStore()
const { mode } = storeToRefs(canvasModeStore)
const { setMode } = canvasModeStore
const { clearAllBezierCurves } = bezierDrawingStore
</script>

<template>
  <div class="px-2 py-4 border border-[#e6e6e6] rounded-xl bg-white flex flex-col gap-3 shadow right-6 top-1/2 absolute z-10 -translate-y-1/2">
    <button
      class="rounded flex h-10 w-10 items-center justify-center cursor-pointer"
      :class="[
        mode === 'bezier'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Draw Bezier Curve"
      @click="() => setMode('bezier')"
    >
    <div class="i-carbon:anchor"></div>
    </button>
    
    <button
      class="rounded flex h-10 w-10 items-center justify-center cursor-pointer"
      :class="[
        mode === 'move'
          ? 'bg-[#0d99ff]'
          : 'bg-white hover:bg-[#f5f5f5]'
      ]"
      title="Move"
      @click="() => setMode('move')"
    >
      <img 
        src="/cc-hand.svg" 
        class="w-5 h-5" 
        :class="mode === 'move' ? 'brightness-0 invert' : ''"
        alt="Move" 
      />
    </button>
    
    <button
      class="text-white rounded bg-red-600 flex h-10 w-10 items-center justify-center hover:bg-red-700 cursor-pointer"
      title="Clear All Bezier Curves"
      @click="clearAllBezierCurves"
    >
    <span class="i-carbon-trash-can" />
    </button>
  </div>
</template>
