<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ width: number }>()
const emit = defineEmits<{ (e: 'update:width', value: number): void }>()

const min = 1
const max = 50
const value = computed({
  get: () => props.width,
  set: v => emit('update:width', Number(v))
})
</script>

<template>
  <div class="brush-size-panel fixed-panel shadow">
    <label class="label">Brush Size:</label>
    <input
      type="range"
      :min="min"
      :max="max"
      v-model="value"
      class="slider"
    />
    <span class="value">{{ value }}</span>
  </div>
</template>

<style scoped>
.brush-size-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 8px 12px;
  border-radius: 8px;
  margin: 8px 0;
  color: #fff;
}
.fixed-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 20; 
} 
.label {
  font-size: 14px;
  color: #aaa;
}
.slider {
  width: 100px; 
  accent-color: #0d99ff; 
}
.value {
  min-width: 24px;
  text-align: right;
  font-family: monospace;
  color: black;
} 
</style> 