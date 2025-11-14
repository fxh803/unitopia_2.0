import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useColorPickerStore = defineStore('colorpicker', () => {
  // 颜色选择器状态
  const selectedColor = ref('#189ab4')
  // 颜色选择器是否打开
  const isColorPickerOpen = ref(false)

  // 设置选中颜色
  const setSelectedColor = (color: string) => {
    selectedColor.value = color
  }

  // 设置颜色选择器打开状态
  const setColorPickerOpen = (open: boolean) => {
    isColorPickerOpen.value = open
  }

  return {
    selectedColor,
    isColorPickerOpen,
    setSelectedColor,
    setColorPickerOpen
  }
}) 