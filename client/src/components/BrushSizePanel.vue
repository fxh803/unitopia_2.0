<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBrushSizeStore } from '~/stores/brushsize'

const brushSizeStore = useBrushSizeStore()
const {brushWidth} = storeToRefs(brushSizeStore)

const min = 1
const max = 50
</script>

<template>
  <div class="brush-size-panel fixed-panel shadow">
    <label class="label">Brush Size:</label>
    <input
      type="range"
      :min="min"
      :max="max"
      v-model="brushWidth"
      class="slider"
    />
    <span class="value">{{ brushWidth }}</span>
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
  z-index: 20; 
  top: 16px;
  right: 16px;
} 
.label {
  font-size: 14px;
  color: #aaa;
}
.slider {
  width: 100px; 
  accent-color: var(--primary-color); 
}
.value {
  min-width: 24px;
  text-align: right;
  font-family: monospace;
  color: black;
} 
</style> 