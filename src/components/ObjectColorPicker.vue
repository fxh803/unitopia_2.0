<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useObjectColorPickerStore } from '~/stores/objectColorPicker'
import { useObjectActionsStore } from '~/stores/objectActions'
import { storeToRefs } from 'pinia'

const objectColorPickerStore = useObjectColorPickerStore()
const colorPickerRef = ref<HTMLInputElement>()
const objectActionsStore = useObjectActionsStore()
const {objectColor} = storeToRefs(objectColorPickerStore)
const {
    showColorBtn,
    colorBtnPosition,
} = storeToRefs(objectActionsStore)

const {
    applyColor,
    getCurrentObjectColor
} = objectActionsStore
 
// 选择颜色
const selectColor = (color: string) => {
  objectColorPickerStore.setObjectColor(color)
  applyColor()
}

// 打开颜色选择器
const openColorPicker = () => { 
  const currentColor = getCurrentObjectColor()
    objectColorPickerStore.setObjectColor(currentColor)
    setTimeout(() => {// 等待100ms后点击颜色选择器，不然颜色对不上
        colorPickerRef.value?.click()
    }, 100)
    
}

// 处理颜色变化
const handleColorChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectColor(target.value)
}
</script>

<template>
  <div v-if="showColorBtn" class="flex justify-center absolute" :style="colorBtnPosition">
    <button
      class="w-30px h-30px rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors translate-x--1/2 translate-y--1/2"
      :style="{ backgroundColor: getCurrentObjectColor() }"
      title="Color Picker"
      @click="openColorPicker"
    > 
    </button>
    <!-- 隐藏的原生颜色选择器 -->
    <input
      ref="colorPickerRef"
      type="color"
      :value="objectColor"
      @change="handleColorChange"
      class="absolute opacity-0 pointer-events-none"
      style="position: absolute; top: -200px; left: -250px;"
    />
  </div>
</template>

 