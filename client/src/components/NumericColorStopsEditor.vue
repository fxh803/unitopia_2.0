<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

interface ColorStop {
  position: number // 0 ~ 1
  color: string
  opacity: number // 0 ~ 1
}

const props = defineProps<{
  stops: ColorStop[]
}>()

const emit = defineEmits<{
  (e: 'update:stops', value: ColorStop[]): void
}>()

const innerStops = computed<ColorStop[]>({
  get() {
    return props.stops || []
  },
  set(val) {
    emit('update:stops', val)
  },
})

// 渐变背景
const gradientBackground = computed(() => {
  const stops = innerStops.value
  if (!stops.length) return 'linear-gradient(to right, #ffffff, #000000)'
  const parts = stops.map(stop => {
    const pct = stop.position * 100
    return `${stop.color} ${pct}%`
  })
  return `linear-gradient(to right, ${parts.join(', ')})`
})

function addStop() {
  const stops = innerStops.value
  if (!stops.length) {
    innerStops.value = [
      { position: 0, color: '#A7C8FB', opacity: 1 },
      { position: 1, color: '#5592F9', opacity: 1 },
    ]
    return
  }
  const last = stops[stops.length - 1]
  const first = stops[0]
  const position =
    stops.length === 1 ? 0.5 : Math.max(0, Math.min(1, (last.position + first.position) / 2))
  const color = last?.color || first?.color || '#A7C8FB'
  const newStop: ColorStop = {
    position,
    color,
    opacity: 1,
  }
  innerStops.value = [...stops, newStop].sort((a, b) => a.position - b.position)
}

function removeStop(index: number) {
  const stops = innerStops.value
  if (stops.length <= 2) return
  innerStops.value = stops.filter((_, i) => i !== index)
}

function updateStopPositionFromInput(index: number, percent: number) {
  const stops = [...innerStops.value]
  if (!stops[index]) return
  const pos = Math.min(1, Math.max(0, percent / 100))
  stops[index] = {
    ...stops[index],
    position: pos,
  }
  innerStops.value = stops.sort((a, b) => a.position - b.position)
}

function updateStopColor(index: number, color: string) {
  const stops = [...innerStops.value]
  if (!stops[index]) return
  stops[index] = {
    ...stops[index],
    color,
  }
  innerStops.value = stops
}

function updateStopOpacity(index: number, percent: number) {
  const stops = [...innerStops.value]
  if (!stops[index]) return
  const opacity = Math.min(1, Math.max(0, percent / 100))
  stops[index] = {
    ...stops[index],
    opacity,
  }
  innerStops.value = stops
}

// 拖拽手柄
const barRef = ref<HTMLDivElement | null>(null)
const draggingIndex = ref<number | null>(null)

function onHandleMouseDown(index: number, event: MouseEvent) {
  event.preventDefault()
  draggingIndex.value = index
  window.addEventListener('mousemove', onWindowMouseMove)
  window.addEventListener('mouseup', onWindowMouseUp)
}

function onWindowMouseMove(event: MouseEvent) {
  if (draggingIndex.value === null) return
  const bar = barRef.value
  if (!bar) return
  const rect = bar.getBoundingClientRect()
  if (rect.width <= 0) return
  const x = event.clientX - rect.left
  const t = Math.min(1, Math.max(0, x / rect.width))

  const stops = [...innerStops.value]
  const idx = draggingIndex.value
  if (!stops[idx]) return
  stops[idx] = {
    ...stops[idx],
    position: t,
  }
  innerStops.value = stops.sort((a, b) => a.position - b.position)
}

function onWindowMouseUp() {
  draggingIndex.value = null
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
})
</script>

<template>
  <div class="numeric-gradient-card">
    <!-- 顶部渐变条 + 手柄 -->
    <div class="gradient-track-wrapper">
      <div ref="barRef" class="gradient-track" :style="{ backgroundImage: gradientBackground }">
        <button
          v-for="(stop, index) in innerStops"
          :key="index"
          type="button"
          class="gradient-handle"
          :style="{ left: `${stop.position * 100}%` }"
          @mousedown="onHandleMouseDown(index, $event)"
        >
          <span class="gradient-handle-square">
            <span
              class="gradient-handle-square-inner"
              :style="{ backgroundColor: stop.color }"
            />
          </span>
          <span class="gradient-handle-caret" />
        </button>
      </div>
    </div>

    <!-- Stops 标题行 -->
    <div class="stops-header-row">
      <span class="stops-title">Stops</span>
      <button type="button" class="stops-add-btn" @click="addStop">
        <span class="i-carbon-add" />
      </button>
    </div>

    <!-- Stops 列表 -->
    <div class="stops-table">
      <div
        v-for="(stop, index) in innerStops"
        :key="index"
        class="stops-row"
      >
        <div class="stops-cell stops-position">
          <input
            type="number"
            class="stops-position-input"
            :value="Number((stop.position * 3).toFixed(1))"
            step="0.1"
            @change="updateStopPositionFromInput(index, (Number(($event.target as HTMLInputElement).value) / 3) * 100)"
          />
        </div>
        <div class="stops-cell stops-center">
          <div class="stops-inner">
            <div class="stops-color">
              <label class="stops-color-swatch-wrapper">
                <input
                  type="color"
                  class="stops-color-input"
                  :value="stop.color"
                  @input="updateStopColor(index, ($event.target as HTMLInputElement).value)"
                />
                <span
                  class="stops-color-swatch"
                  :style="{ backgroundColor: stop.color }"
                />
              </label>
              <span class="stops-color-hex">
                {{ stop.color.replace('#', '').toUpperCase() }}
              </span>
            </div>
            <div class="stops-opacity">
              <input
                type="number"
                class="stops-opacity-input"
                :value="Math.round(stop.opacity * 100)"
                min="0"
                max="100"
                @change="updateStopOpacity(index, Number(($event.target as HTMLInputElement).value))"
              />
              <span class="stops-opacity-unit">%</span>
            </div>
          </div>
        </div>
        <div class="stops-cell stops-remove">
          <button
            type="button"
            class="stops-remove-btn"
            @click="removeStop(index)"
          >
            <span class="i-carbon-subtract" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.numeric-gradient-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 15px 20px;
  border-radius: 14px;
  background-color: #ffffff;
  border: 1px solid #eaded7;
}

.gradient-track-wrapper {
  padding: 4px 4px 0;
}

.gradient-track {
  position: relative;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #d3cfcc;
  background-color: #d3d7e0;
  overflow: visible;
}

.gradient-handle {
  position: absolute;
  top: -15px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
}

.gradient-handle-square {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  border-radius: 5px;
  background-color: #ffffff;
  border: 1px solid #c5c1be;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.gradient-handle-square-inner {
  width: 16px;
  height: 16px;
}

.gradient-handle-caret {
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 8px solid #ffffff;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.12));
}

.stops-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 52px;
}

.stops-title {
  font-size: 12px;
  font-weight: 600;
  color: #3a2f29;
}

.stops-add-btn {
  font-size: 20px;
  width: 30px;
  height: 30px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.stops-table {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  justify-content: center;
  align-items: center;
}

.stops-row {
  /* padding: 2px 8px; */
  display: flex;
  align-items: center;
  justify-content: flex-start;
  background-color: #ffffff;
  min-height: 40px;
  max-width: 300px;
}

.stops-row:last-child {
  border-bottom: none;
}

.stops-cell {
  padding: 2px 4px;
}

.stops-position {
  flex: 0 0 60px;
}

.stops-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 30px;
}

.stops-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  flex: 1;
  width: auto;
  min-width: 0;
}

.stops-inner {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 180px;
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 0 8px;
  min-height: 40px;
}

.stops-position-input {
  width: 100%;
  height: 40px;
  border-radius: 6px;
  border: none;
  background-color: #f5f5f5;
  font-size: 12px;
  color: #6b5b53;
  text-align: left;
  padding: 0 8px;
}

.stops-color {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: transparent;
  flex: 0 0 auto;
  border-right: 2px solid #ffffff;
  padding: 0 8px 0 0;
}

.stops-color-swatch-wrapper {
  position: relative;
  display: inline-flex;
}

.stops-color-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.stops-color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid #d1cbc7;
  background-color: #a5c9ff;
  cursor: pointer;
  flex-shrink: 0;
}

.stops-color-hex {
  width: 60px;
  flex: 0 0 60px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 12px;
  color: #4b3f38;
  padding: 0;
}

.stops-opacity {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.stops-opacity-input {
  width: 50px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background-color: transparent;
  font-size: 12px;
  color: #4b3f38;
  padding-left: 10px;
  text-align: right;
}

.stops-opacity-unit {
  font-size: 11px;
  color: #8f837c;
  transform: translateX(-10px);
}

.stops-remove-btn {
  width: 30px;
  height: 30px;
  font-size: 20px; 
  border: none;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center; 
  cursor: pointer;
}
 
</style>

