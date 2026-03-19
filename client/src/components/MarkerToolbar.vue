<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useMarkerCanvasModeStore } from '~/stores/markerCanvasMode'
import ColorPicker from './ColorPicker.vue'
import { storeToRefs } from 'pinia'
import { useBrushSizeStore } from '~/stores/brushsize'
import * as fabric from 'fabric'

const markerCanvasModeStore = useMarkerCanvasModeStore()
const { mode } = storeToRefs(markerCanvasModeStore)
const { setMode } = markerCanvasModeStore

// 画笔大小 store
const brushSizeStore = useBrushSizeStore()
const { markerBrushWidth } = storeToRefs(brushSizeStore)

// 文件上传相关
const fileInputRef = ref<HTMLInputElement>()

// 绘制菜单控制
const showDrawMenu = ref(false)

// 画笔大小面板控制
const showBrushSizeMenu = ref(false)
const toggleBrushSizeMenu = () => {
  showBrushSizeMenu.value = !showBrushSizeMenu.value
  // 设置画笔大小面板打开状态，用于禁用画布
  brushSizeStore.setMarkerBrushSizePanelOpen(showBrushSizeMenu.value)
}

const minBrushSize = 1
const maxBrushSize = 50

const toggleDrawMenu = () => {
  showDrawMenu.value = !showDrawMenu.value
}


// 点击外部关闭菜单
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.draw-tool-menu')) {
      showDrawMenu.value = false
    }
    if (!target.closest('.brush-size-menu')) {
      showBrushSizeMenu.value = false
      brushSizeStore.setMarkerBrushSizePanelOpen(false)
    }
  })

  // 在 nextTick 后设置 mode 为 draw（第一个按钮）
  nextTick(() => {
    // 等待 canvas 初始化完成
    setTimeout(() => {
      setMode('draw')
    }, 300)
  })
})

// Marker相关功能
const clearCanvas = () => {
    markerCanvasModeStore.clearMarkers()
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files

  if (files && files.length > 0) {
    // 批量处理多个文件
    Array.from(files).forEach((file) => {
      if (file.type === 'image/png') {
        // 处理PNG文件
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string

          // 将图片添加到画布作为marker对象
          addImageToCanvas(result, file.name)
        }
        reader.readAsDataURL(file)
      } else if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        // 处理SVG文件
        const reader = new FileReader()
        reader.onload = async (e) => {
          const svgString = e.target?.result as string

          // 将SVG添加到画布作为marker对象
          await addSVGToCanvas(svgString, file.name)
        }
        reader.readAsText(file)
      } else {
        console.warn('跳过不支持的文件类型:', file.name)
      }
    })
  }

  // 清空文件输入框，允许重复选择同一文件
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const addImageToCanvas = (imageDataUrl: string, fileName: string) => {

  const canvasInstance = markerCanvasModeStore.getCanvas()
  if (!canvasInstance) {
    console.error('Canvas实例未找到')
    return
  }


  // 使用fabric.js的Promise方式加载图片
  fabric.FabricImage.fromURL(imageDataUrl).then((fabricImg) => {

    // 设置图片属性
    fabricImg.set({
      left: canvasInstance.width / 2,
      top: canvasInstance.height / 2,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false
    })

    // 计算合适的缩放比例
    const maxWidth = canvasInstance.width * 0.3
    const maxHeight = canvasInstance.height * 0.3

    const scaleX = maxWidth / fabricImg.width
    const scaleY = maxHeight / fabricImg.height
    const scale = Math.min(scaleX, scaleY, 1)

    fabricImg.set({
      scaleX: scale,
      scaleY: scale
    })

    // 将图片添加到画布
    canvasInstance.add(fabricImg)
    // 重新渲染画布
    canvasInstance.renderAll()

  }).catch((error) => {
    console.error('图片加载失败:', error)
  })
}

const addSVGToCanvas = async (svgString: string, fileName: string) => {

  try {
    const canvasInstance = markerCanvasModeStore.getCanvas()
    if (!canvasInstance) {
      console.error('Canvas实例未找到')
      return
    }


    // 使用 Fabric.js 加载 SVG
    const loadedSVG = await fabric.loadSVGFromString(svgString)
    const objects = loadedSVG.objects.filter((o): o is fabric.FabricObject => o != null)
    const svgObject = fabric.util.groupSVGElements(objects)

    // 设置SVG对象属性
    svgObject.set({
      left: canvasInstance.width / 2,
      top: canvasInstance.height / 2,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false
    })

    // 计算合适的缩放比例
    const maxWidth = canvasInstance.width * 0.3
    const maxHeight = canvasInstance.height * 0.3

    const scaleX = maxWidth / svgObject.width
    const scaleY = maxHeight / svgObject.height
    const scale = Math.min(scaleX, scaleY, 1)

    svgObject.set({
      scaleX: scale,
      scaleY: scale
    })

    // 将SVG对象添加到画布
    canvasInstance.add(svgObject)

    // 重新渲染画布
    canvasInstance.renderAll()


  } catch (error) {
    console.error('SVG加载失败:', error)
  }
}

const triggerFileUpload = () => {
  markerCanvasModeStore.setMode(null)
  fileInputRef.value?.click()
}
</script>

<template>
  <!-- 横向排列的圆角胶囊工具栏 -->
  <div
    class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#efebea] border border-[#e1e1e6]"
  >
    <!-- 颜色选择器 -->
    <ColorPicker />

     <!-- 画笔大小调节按钮 - 仅在绘制/擦除模式下显示 -->
     <div v-if="mode === 'draw' || mode === 'erase'" class="relative brush-size-menu">
      <button
        class="rounded-full flex h-8 w-8 items-center justify-center cursor-pointer relative text-[#3d3d3d]"
        :class="[
          showBrushSizeMenu
            ? 'bg-[var(--primary-color)] text-[#3d3d3d]'
            : 'hover:bg-white/80'
        ]"
        title="Brush Size"
        @click="toggleBrushSizeMenu"
      >
      <div class="i-carbon:settings-adjust"></div>
      </button>

      <!-- 展开面板 - 在按钮垂直显示 -->
      <div
        v-if="showBrushSizeMenu"
        class="absolute left-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 brush-size-menu"
      >
        <div class="flex flex-col items-center gap-2">
          <div class="flex flex-col items-center gap-1">
            <label class="text-xs text-gray-600">Size:</label>
            <span class="text-xs font-mono text-gray-800">{{ markerBrushWidth }}</span>
          </div>
          <input
            type="range"
            :min="minBrushSize"
            :max="maxBrushSize"
            v-model="markerBrushWidth"
            class="brush-size-slider-vertical"
            orient="vertical"
          />
        </div>
      </div>
    </div>

    <!-- 分割线 -->
    <div class="toolbar-divider" />
    <!-- 自由绘制按钮 -->
    <button
      class="rounded-full flex h-8 w-8 items-center justify-center cursor-pointer text-[#3d3d3d]"
      :class="[
        mode === 'draw'
          ? 'bg-[var(--primary-color)] text-[#3d3d3d]'
          : 'hover:bg-white/80'
      ]"
      title="Free Draw"
      @click="() => setMode('draw')"
    >
      <span class="i-carbon-pen" />
    </button>

    <!-- 形状绘制工具聚合按钮 -->
    <div class="relative draw-tool-menu">
      <button
        class="rounded-full flex h-8 w-8 items-center justify-center cursor-pointer relative text-[#3d3d3d]"
        :class="[
          (mode === 'rect' || mode === 'ellipse')
            ? 'bg-[var(--primary-color)] text-[#3d3d3d]'
            : 'hover:bg-white/80'
        ]"
        title="Shape Tools"
        @click="toggleDrawMenu"
      >
        <span v-if="mode === 'ellipse'" class="i-carbon-circle-outline" />
        <span v-else class="i-carbon:checkbox" />
        <!-- 右下角小三角 -->
        <div class="absolute bottom-[3px] right-[3px] w-0 h-0 border-l-[5px] border-t-[5px] border-l-transparent transform rotate-90 border-t-[#3d3d3d]/70"></div>
      </button>

      <!-- 形状绘制工具下拉菜单 -->
      <div
        v-if="showDrawMenu"
        class="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px] draw-tool-menu"
      >
        <!-- 圆形 -->
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-t-lg"
          :class="mode === 'ellipse' ? 'bg-[var(--primary-light-color)] text-[var(--primary-color)]' : 'text-gray-700'"
          @click="() => { setMode('ellipse'); showDrawMenu = false; }"
        >
          <span class="i-carbon-circle-outline text-sm" />
          <span class="text-xs">ellipse</span>
        </button>

        <!-- 矩形 -->
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-b-lg"
          :class="mode === 'rect' ? 'bg-[var(--primary-light-color)] text-[var(--primary-color)]' : 'text-gray-700'"
          @click="() => { setMode('rect'); showDrawMenu = false; }"
        >
          <span class="i-carbon-checkbox text-sm" />
          <span class="text-xs">rect</span>
        </button>
      </div>
    </div>

    <!-- 移动模式按钮（内联 SVG，使用 currentColor 控制颜色） -->
    <button
      class="rounded-full flex h-8 w-8 items-center justify-center cursor-pointer text-[#3d3d3d]"
      :class="[
        mode === 'move'
          ? 'bg-[var(--primary-color)] text-[#3d3d3d]'
          : 'hover:bg-white/80'
      ]"
      title="Move Mode"
      @click="() => setMode('move')"
    >
      <svg
        viewBox="0 0 1024 1024"
        class="w-5 h-5"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          stroke="currentColor"
          stroke-width="10"
          d="M824.515155 243.164159c-16.249079 0-31.582299 4.389984-44.734854 12.033058l0-56.767911c0-49.345871-40.10337-89.468684-89.468684-89.468684-18.438954 0-35.519981 5.591345-49.800219 15.155165-12.236696-34.83539-45.433772-59.890019-84.405365-59.890019-38.968523 0-72.189136 25.054629-84.420715 59.890019-14.21884-9.56382-31.343869-15.155165-49.7818-15.155165-49.343825 0-89.467661 40.122813-89.467661 89.468684l0 329.831031-60.22157-104.365976c-11.664667-21.25407-30.735002-36.369326-53.626361-42.637076-22.321378-6.072299-45.541219-2.863211-65.399499 9.041934-40.582277 24.332175-56.048527 79.356372-34.444487 122.669854 1.333368 2.708692 29.879518 61.160965 118.979812 239.312434 41.960671 83.877339 88.004333 143.902434 136.845715 178.239474 38.334073 26.956955 64.831564 28.353768 69.746504 28.353768l223.674269 0c38.047548 0 73.438593-12.362562 105.236809-36.785811 29.794583-22.935362 55.745628-56.136531 76.933183-98.596576 41.765219-83.532485 63.869656-199.123107 63.869656-334.333578L914.029888 332.587817c0-49.342802-40.148395-89.469708-89.467661-89.469708L824.515155 243.164159zM869.250008 489.203808c0 128.264269-20.444635 236.908688-59.150168 314.276776-25.255197 50.504254-70.422909 110.702288-142.157697 110.702288l-223.234247 0c-1.726318-0.130983-20.576641-2.228761-48.974411-23.502273-28.308743-21.186532-71.795163-65.835428-118.017904-158.318772-90.669022-181.384094-118.541837-238.506069-118.803803-239.050468-0.041956-0.089028-0.041956-0.130983-0.085958-0.176009-11.228739-22.499433-3.276626-51.988048 17.388019-64.36903 9.304923-5.593392 20.180622-7.057743 30.645974-4.239558 11.138688 3.036149 20.488637 10.552334 26.253944 21.100574 0.10847 0.130983 0.198521 0.326435 0.284479 0.458441l69.829392 121.009028c14.264888 26.079982 30.319539 37.004799 47.730071 32.593326 17.452487-4.414543 26.253944-21.889543 26.253944-51.770084L377.211643 198.429305c0-24.64019 20.09671-44.734854 44.732807-44.734854 24.642237 0 44.738947 20.094664 44.738947 44.734854l0 290.774503c0 12.342096 10.021238 22.367427 22.366404 22.367427 12.341073 0 22.36538-10.025331 22.36538-22.367427L511.415181 153.694451c0-24.641213 20.09671-44.73383 44.735877-44.73383 24.638143 0 44.735877 20.092617 44.735877 44.73383l0 335.509357c0 12.342096 10.002818 22.367427 22.36538 22.367427 12.363585 0 22.367427-10.025331 22.367427-22.367427L645.619742 198.429305c0-24.64019 20.098757-44.734854 44.73383-44.734854 24.63712 0 44.735877 20.094664 44.735877 44.734854l0 335.509357c0 12.319583 10.001795 22.367427 22.367427 22.367427 12.363585 0 22.366404-10.047844 22.366404-22.367427L779.82328 332.632843c0-24.641213 20.09671-44.73383 44.735877-44.73383 24.635073 0 44.731784 20.092617 44.731784 44.73383l0 156.570965L869.250008 489.203808z"
        />
      </svg>
    </button>

    <!-- 橡皮擦按钮 -->
    <button
      class="rounded-full flex h-8 w-8 items-center justify-center cursor-pointer text-[#3d3d3d]"
      :class="[
        mode === 'erase'
          ? 'bg-[var(--primary-color)] text-[#3d3d3d]'
          : 'hover:bg-white/80'
      ]"
      title="Eraser"
      @click="() => setMode('erase')"
    >
      <span class="i-carbon-erase" />
    </button>

    <!-- 上传Marker按钮 -->
    <button
      class="rounded-full flex h-8 w-8 items-center justify-center cursor-pointer text-[#3d3d3d] hover:bg-white/80"
      title="Upload Marker"
      @click="triggerFileUpload"
    >
      <span class="i-carbon-upload" />
    </button>

    <!-- 清除按钮 -->
    <button
      class="rounded-full flex h-8 w-8 items-center justify-center cursor-pointer text-[#3d3d3d] hover:bg-white/80"
      title="Clear Canvas / Renew"
      @click="clearCanvas"
    >
      <span class="i-carbon-trash-can" />
    </button>

    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".png,.svg,image/png,image/svg+xml"
      multiple
      class="hidden"
      @change="handleFileUpload"
    />
  </div>
</template>

<style scoped>
/* 绘制工具菜单样式 */
.draw-tool-menu {
  /* 确保菜单在正确的层级显示 */
  z-index: 1000;
}

/* 上拉菜单动画 */
.draw-tool-menu > div {
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 画笔大小菜单样式 */
.brush-size-menu {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.brush-size-slider {
  width: 100%;
  height: 4px;
  accent-color: var(--primary-color);
  cursor: pointer;
}

.brush-size-slider-vertical {
  width: 4px;
  height: 120px;
  accent-color: var(--primary-color);
  cursor: pointer;
  writing-mode: vertical-lr;
  direction: rtl;
}

.toolbar-divider {
  height: 22px;
  border-left: 1px solid #b7b7be;
  margin: 0 6px;
}

</style>
