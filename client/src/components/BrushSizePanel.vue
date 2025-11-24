<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBrushSizeStore } from '~/stores/brushsize'

const props = withDefaults(defineProps<{
  target?: 'main' | 'marker'
}>(), {
  target: 'main'
})

const brushSizeStore = useBrushSizeStore()
const { brushWidth, markerBrushWidth } = storeToRefs(brushSizeStore)

// 根据 target 选择对应的画笔宽度
const currentBrushWidth = computed({
  get: () => props.target === 'marker' ? markerBrushWidth.value : brushWidth.value,
  set: (value) => {
    if (props.target === 'marker') {
      markerBrushWidth.value = value
    } else {
      brushWidth.value = value
    }
  }
})

const min = 1
const max = 50

const isOpen = ref(false)
const togglePanel = () => {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div class="brush-size-panel fixed-panel shadow" :class="{ collapsed: !isOpen }">
    <button class="toggle" @click="togglePanel">
      <span class="toggle-text">{{ isOpen ? 'Hide brush size' : 'Brush size' }}</span>
      <span class="toggle-icon" :class="{ open: isOpen }">
        <span class="i-carbon-chevron-down"></span>
      </span>
    </button>
    <div v-if="isOpen" class="panel-body">
      <label class="label">Brush Size:</label>
      <input
        type="range"
        :min="min"
        :max="max"
        v-model="currentBrushWidth"
        class="slider"
      />
      <span class="value">{{ currentBrushWidth }}</span>
    </div>
  </div>
</template>

<style scoped>
.brush-size-panel {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  background: white;
  padding: 0;
  border-radius: 8px;
  margin: 8px 0;
  min-width: 120px;
}
.fixed-panel {
  position: absolute;
  z-index: 20; 
  top: 16px;
  right: 16px;
} 
.toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  outline: none;
  cursor: pointer;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #333;
}
.toggle-icon {
  display: inline-flex;
  transition: transform 0.2s ease;
}
.toggle-icon.open {
  transform: rotate(180deg);
}
.panel-body {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 12px;
}
.collapsed .panel-body {
  display: none;
}
.label {
  font-size: 14px;
  color: #666;
}
.slider {
  width: 100px; 
  accent-color: var(--primary-color); 
}
.value {
  min-width: 24px;
  text-align: right;
  font-family: monospace;
  color: #111;
} 
</style> 