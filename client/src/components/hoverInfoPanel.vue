<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useHoverInfoPanelStore } from '~/stores/hoverInfoPanel'
import { useDataScaleStore } from '~/stores/dataScale'

const hoverInfoPanelStore = useHoverInfoPanelStore()
const { showPanel, panelPosition, markerData } = storeToRefs(hoverInfoPanelStore)

const dataScaleStore = useDataScaleStore()
const { currentMappingChannel } = storeToRefs(dataScaleStore)

// 格式化数据用于显示
const formattedData = computed(() => {
  if (!markerData.value) return null
  
  // 如果 data 是对象，转换为键值对数组
  if (typeof markerData.value === 'object' && markerData.value !== null) {
    const entries = Object.entries(markerData.value)
    
    // 根据 currentMappingChannel 过滤字段
    const filteredEntries = entries.filter(([key]) => {
      const lowerKey = key.toLowerCase()
      
      // 如果当前映射通道是 width，只显示 width，隐藏 height 和 size
      if (currentMappingChannel.value === 'width') {
        return lowerKey !== 'height' && lowerKey !== 'size'
      }
      // 如果当前映射通道是 height，只显示 height，隐藏 width 和 size
      else if (currentMappingChannel.value === 'height') {
        return lowerKey !== 'width' && lowerKey !== 'size'
      }
      // 如果当前映射通道是 size，只显示 size，隐藏 width 和 height
      else if (currentMappingChannel.value === 'size') {
        return lowerKey !== 'width' && lowerKey !== 'height'
      }
      
      // 默认显示所有字段
      return true
    })
    
    return filteredEntries.map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }))
  }
  
  return null
})

</script>

<template>
  <div
    v-if="showPanel && formattedData"
    class="hover-info-panel"
    :style="{
      left: `${panelPosition.x}px`,
      top: `${panelPosition.y}px`
    }"
  >
    <div class="panel-header">
      <span class="panel-title">Data Info</span>
    </div>
    <div class="panel-content">
      <div
        v-for="(item, index) in formattedData"
        :key="index"
        class="data-row"
      >
        <span class="data-key">{{ item.key }}:</span>
        <span class="data-value">{{ item.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hover-info-panel {
  position: absolute;
  background: white;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 250px;
  max-width: 400px;
  max-height: 300px;
  overflow: hidden;
  pointer-events: none;
}

.panel-header {
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #e6e6e6;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.panel-content {
  padding: 8px 12px;
  max-height: 250px;
  overflow-y: auto;
}

.data-row {
  display: flex;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
}

.data-row:last-child {
  border-bottom: none;
}

.data-key {
  font-weight: 600;
  color: #666;
  margin-right: 8px;
  min-width: 80px;
  flex-shrink: 0;
}

.data-value {
  color: #333;
  word-break: break-word;
  flex: 1;
}

/* 滚动条样式 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>

