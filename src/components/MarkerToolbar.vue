<script setup lang="ts">
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useColorPickerStore } from '~/stores/colorpicker'
import { useBrushSizeStore } from '~/stores/brushsize'
import ColorPicker from './ColorPicker.vue'
import { storeToRefs } from 'pinia'

const canvasModeStore = useCanvasModeStore()
const {mode} = storeToRefs(canvasModeStore)
const { setMode, clearCanvas } = canvasModeStore

const selectedModeStore = useSelectedModeStore()
const { isContainerMode } = storeToRefs(selectedModeStore)

const colorPickerStore = useColorPickerStore()
const brushSizeStore = useBrushSizeStore()
const { brushWidth } = storeToRefs(brushSizeStore)

// 包装 setMode 调用，传递必要的参数
const handleSetMode = (newMode: 'draw' | 'move' | 'erase' | 'rect' | 'ellipse') => {
  setMode(newMode, isContainerMode.value, colorPickerStore.selectedColor, brushWidth.value)
}
</script>

<template>
  <div class="px-2 py-4 border border-[#e6e6e6] rounded-xl bg-white flex flex-col gap-3 shadow right-6 top-1/2 absolute z-10 -translate-y-1/2">
    <button
      class="rounded flex h-10 w-10 items-center justify-center "
      :class="[
        'rounded flex h-10 w-10 items-center justify-center',
          mode === 'draw'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Draw"
      @click="() => handleSetMode('draw')"
    >
      <span class="i-carbon-pen" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center "
      :class="[
        'rounded flex h-10 w-10 items-center justify-center',
        mode === 'move'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Move"
      @click="() => handleSetMode('move')"
    >
      <span class="i-carbon-move" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center "
      :class="[
        'rounded flex h-10 w-10 items-center justify-center',
        mode === 'erase'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Eraser"
      @click="() => handleSetMode('erase')"
    >
      <span class="i-carbon-erase" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center "
      :class="[
        'rounded flex h-10 w-10 items-center justify-center',
        mode === 'rect'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Rectangle"
      @click="() => handleSetMode('rect')"
    >
      <span class="i-carbon:checkbox" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center "
      :class="[
        'rounded flex h-10 w-10 items-center justify-center',
        mode === 'ellipse'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Ellipse"
      @click="() => handleSetMode('ellipse')"
    >
      <span class="i-carbon-circle-outline" />
    </button>
    <button
      class="text-white rounded bg-red-600 flex h-10 w-10 items-center justify-center hover:bg-red-700"
      title="Clear Canvas"
      @click="clearCanvas"
    >
      <span class="i-carbon-trash-can" />
    </button>
    
    <!-- 颜色选择器按钮 -->
    <div class="flex justify-center pt-2 border-t border-gray-200">
      <ColorPicker />
    </div>
  </div>
</template>