<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useTableStore } from '~/stores/table'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { useOverviewStore } from '~/stores/overview'

const canvasModeStore = useCanvasModeStore()
const tableStore = useTableStore()
const selectedModeStore = useSelectedModeStore()
const overviewStore = useOverviewStore()

// 组件挂载时初始化
onMounted(() => { 
    overviewStore.updateMarkerObjects()
})

 
</script>

<template>
  <div class="h-full w-full overflow-y-auto p-4">

    <!-- Marker Objects List -->
    <div v-if="overviewStore.hasMarkers" class="space-y-4">
      <div v-for="marker in overviewStore.markerObjects" :key="marker.id"
        class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">

        <!-- Vertical Layout -->
        <div class="flex space-x-4">

          <!-- Left: Thumbnail -->
          <div class="flex-shrink-0">
            <div
              class="w-16 h-16 border border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
              <img v-if="marker.thumbnail" :src="marker.thumbnail" alt="Thumbnail" class="w-full h-full object-cover" />
              <span v-else class="text-gray-400 text-xs">Preview</span>
            </div>
          </div>

          <!-- Right: Data Binding Operations - Vertical Layout -->
          <div class="flex-1 flex flex-col space-y-4">

            <!-- Visual Encoding Selector -->
            <div class="flex flex-col space-y-2">
              <span class="text-sm font-medium text-gray-700">Visual Encoding:</span>
              <div class="flex space-x-4 justify-center ">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" :value="'size'" :checked="marker.visualEncoding === 'size'"
                    @change="overviewStore.handleVisualEncodingChange(marker.id, 'size')"
                    class="w-4 h-4 text-blue-600" />
                  <span class="text-sm text-gray-600">size</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" :value="'width'" :checked="marker.visualEncoding === 'width'"
                    @change="overviewStore.handleVisualEncodingChange(marker.id, 'width')"
                    class="w-4 h-4 text-blue-600" />
                  <span class="text-sm text-gray-600">width</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" :value="'height'" :checked="marker.visualEncoding === 'height'"
                    @change="overviewStore.handleVisualEncodingChange(marker.id, 'height')"
                    class="w-4 h-4 text-blue-600" />
                  <span class="text-sm text-gray-600">height</span>
                </label>
              </div>
            </div>

                         <!-- Data Binding Selector -->
             <div class="flex flex-col space-y-2">
               <span class="text-sm font-medium text-gray-700">Data Binding:</span>
               <div v-if="tableStore.tableColumns && tableStore.tableColumns.length > 0" class="flex flex-col space-y-2">
                                  <!-- Data Field Dropdown -->
                 <div class="flex justify-center">
                   <select v-model="marker.dataField"
                     @change="overviewStore.handleDataFieldChange(marker.id, marker.dataField)"
                     :class="[
                       'px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-xs',
                       marker.dataField === '' ? 'text-gray-400' : 'text-gray-900'
                     ]">
                     <option value="" disabled>Select Data Field</option>
                     <option v-for="column in tableStore.tableColumns" :key="column" :value="column">
                       {{ column }}
                     </option>
                   </select>
                 </div>
                                  <!-- Data Range Input -->
                 <div class="flex items-center space-x-2  justify-center">
                   <span class="text-sm text-gray-600">Data Range:</span>
                   <input type="number" :value="marker.dataRange.start === -1 ? '' : marker.dataRange.start"
                     @input="(e) => {
                       const value = e.target.value === '' ? -1 : parseInt(e.target.value) || -1;
                       overviewStore.handleDataRangeChange(marker.id, value, marker.dataRange.end);
                     }"
                     class="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                     min="1" placeholder="Start" />
                   <span class="text-sm text-gray-500">-</span>
                   <input type="number" :value="marker.dataRange.end === -1 ? '' : marker.dataRange.end"
                     @input="(e) => {
                       const value = e.target.value === '' ? -1 : parseInt(e.target.value) || -1;
                       overviewStore.handleDataRangeChange(marker.id, marker.dataRange.start, value);
                     }"
                     class="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                     min="1" placeholder="End" />
                 </div>
               </div>
               <div v-else class="flex justify-center">
                 <div class="text-center text-gray-400 text-sm">
                   <p>No data available</p>
                   <p class="text-xs">Please load data in the Table tab first</p>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex items-center justify-center h-64">
      <div class="text-center text-gray-500">
        <div class="text-4xl mb-4">🎯</div>
        <h3 class="text-lg font-medium mb-2">No Marker Objects</h3>
        <p class="text-sm mb-4">Draw some marker objects on the canvas and they will appear here</p>
        <div class="text-xs text-gray-400 space-y-1">
          <p>Steps:</p>
          <p>1. Click the "Marker" button in the left toolbar to select marker mode</p>
          <p>2. Draw objects on the canvas</p>
          <p>3. Drawn objects will automatically appear here</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义样式 */
input[type="radio"] {
  appearance: none;
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  outline: none;
  cursor: pointer;
}

input[type="radio"]:checked {
  border-color: #3b82f6;
  background-color: #3b82f6;
  position: relative;
}

input[type="radio"]:checked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 4px;
  background-color: white;
  border-radius: 50%;
}
</style>