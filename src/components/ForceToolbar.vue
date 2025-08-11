<script setup lang="ts">
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useForceDrawingStore } from '~/stores/forceDrawing'
import { storeToRefs } from 'pinia'

const canvasModeStore = useCanvasModeStore()
const forceDrawingStore = useForceDrawingStore()
const { mode } = storeToRefs(canvasModeStore)
const { setMode } = canvasModeStore
const { forceType } = storeToRefs(forceDrawingStore)
const { clearAllForcePoints, addFieldForce, clearFieldForce } = forceDrawingStore

// 异步处理场力添加
const handleAddFieldForce = async () => {
  if (forceType.value !== 'fieldForce') {
    mode.value = null
    try {
      await addFieldForce()
    } catch (error) {
      console.error('Failed to add field force:', error)
    }
  }else{ 
    clearFieldForce()
  }

}
</script>

<template>
  <div
    class="px-2 py-4 border border-[#e6e6e6] rounded-xl bg-white flex flex-col gap-3 shadow right-6 top-1/2 absolute z-10 -translate-y-1/2">
    <button class="rounded flex h-10 w-10 items-center justify-center" :class="[
      mode === 'force'
        ? 'bg-[#0d99ff] text-white'
        : 'bg-white text-black hover:bg-[#f5f5f5]'
    ]" title="Add Force Point" @click="() => setMode('force')">
      <span class="i-carbon:add" />
    </button>

    <button class="rounded flex h-10 w-10 items-center justify-center " :class="[
      forceType === 'fieldForce'
        ? 'bg-[#e5e5e5] text-black'
        : 'bg-white text-black hover:bg-[#f5f5f5] '
    ]" title="Add Field Force" @click="handleAddFieldForce">
      <div class="i-carbon:switch-layer-2"></div>
    </button>

    <button class="rounded flex h-10 w-10 items-center justify-center" :class="[
      mode === 'move'
        ? 'bg-[#0d99ff] text-white'
        : 'bg-white text-black hover:bg-[#f5f5f5]'
    ]" title="Move" @click="() => setMode('move')">
      <span class="i-carbon-move" />
    </button>

    <button class="text-white rounded bg-red-600 flex h-10 w-10 items-center justify-center hover:bg-red-700"
      title="Clear All Force Points" @click="clearAllForcePoints">
      <span class="i-carbon-trash-can" />
    </button>
  </div>
</template>
