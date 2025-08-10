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
      class="rounded flex h-10 w-10 items-center justify-center"
      :class="[
        'rounded flex h-10 w-10 items-center justify-center',
        mode === 'bezier'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Draw Bezier Curve"
      @click="() => setMode('bezier')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
        <path d="M8 4c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
        <path d="M6 8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/>
      </svg>
    </button>
    
    <button
      class="rounded flex h-10 w-10 items-center justify-center"
      :class="[
        'rounded flex h-10 w-10 items-center justify-center',
        mode === 'move'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Move"
      @click="() => setMode('move')"
    >
      <span class="i-carbon-move" />
    </button>
    
    <button
      class="text-white rounded bg-red-600 flex h-10 w-10 items-center justify-center hover:bg-red-700"
      title="Clear All Bezier Curves"
      @click="clearAllBezierCurves"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
      </svg>
    </button>
  </div>
</template>
