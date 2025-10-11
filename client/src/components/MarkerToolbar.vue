<script setup lang="ts">
import { useMarkerCanvasModeStore } from '~/stores/markerCanvasMode'
import ColorPicker from './ColorPicker.vue'
import { storeToRefs } from 'pinia' 
import * as fabric from 'fabric'
import { Canvas, Group } from 'fabric'
import { useMarkerShapeDrawingStore } from '~/stores/markerShapeDrawing'
import { useMarkerStore } from '~/stores/marker'

const markerCanvasModeStore = useMarkerCanvasModeStore()
const {mode} = storeToRefs(markerCanvasModeStore)
const { setMode } = markerCanvasModeStore

// 形状绘制store
const markerShapeDrawingStore = useMarkerShapeDrawingStore()

// Marker store
const markerStore = useMarkerStore()

// 文件上传相关
const fileInputRef = ref<HTMLInputElement>()

// 绘制菜单控制
const showDrawMenu = ref(false)

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
          console.log('PNG文件已上传:', file.name)
          
          // 将图片添加到画布作为marker对象
          addImageToCanvas(result, file.name)
        }
        reader.readAsDataURL(file)
      } else if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        // 处理SVG文件
        const reader = new FileReader()
        reader.onload = async (e) => {
          const svgString = e.target?.result as string
          console.log('SVG文件已上传:', file.name)
          
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
  console.log('开始添加图片到画布:', fileName)
  
  const canvasInstance = markerCanvasModeStore.getCanvas()
  if (!canvasInstance) {
    console.error('Canvas实例未找到')
    return
  }
  
  console.log('Canvas实例获取成功:', canvasInstance)

  // 使用fabric.js的Promise方式加载图片
  fabric.FabricImage.fromURL(imageDataUrl).then((fabricImg) => {
    console.log('Fabric Image创建成功:', fabricImg)
    
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
  console.log('开始添加SVG到画布:', fileName)
  
  try {
    const canvasInstance = markerCanvasModeStore.getCanvas()
    if (!canvasInstance) {
      console.error('Canvas实例未找到')
      return
    }
    
    console.log('Canvas实例获取成功:', canvasInstance)

    // 使用 Fabric.js 加载 SVG
    const loadedSVG = await fabric.loadSVGFromString(svgString)
    const svgObject = fabric.util.groupSVGElements(loadedSVG.objects)
    
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
    
    console.log('SVG已成功添加到画布作为marker对象:', fileName)
    
  } catch (error) {
    console.error('SVG加载失败:', error)
  }
}

const triggerFileUpload = () => {
  markerCanvasModeStore.setMode(null)
  fileInputRef.value?.click()
}

// 保存当前画布上的所有 marker 对象
const saveMarkers = async () => {
  const canvasInstance = markerCanvasModeStore.getCanvas() 
  // 获取画布上所有对象
  const allObjects = canvasInstance.getObjects()
  //新建一个fabricjs的group，将所有objectsgroup一起
  const cloneObjects = await Promise.all(allObjects.map(async (obj) => {
    return obj.clone()
  }))
  const group = new Group(cloneObjects)
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = 60
  tempCanvas.height = 60

  const tempFabricCanvas = new Canvas(tempCanvas, {
    width: 60,
    height: 60,
    backgroundColor: '#ffffff'
  })
  const originWidth = group.width
  const originHeight = group.height
  // 计算缩放比例，确保对象适合缩略图 
  const scaleX = 50 / Math.max(originWidth, 1)
  const scaleY = 50 / Math.max(originHeight, 1)
  const scale = Math.min(scaleX, scaleY, 1) // 不超过原始大小
  //把克隆对象放到画布正中央，做好缩放，并导出给previewDataUrl
  group.set('left', 30)
  group.set('top', 30)
  group.set('scaleX', scale)
  group.set('scaleY', scale)
  group.set('originX', 'center')
  group.set('originY', 'center')
  group.set('opacity', 1)
  tempFabricCanvas.add(group)
  tempFabricCanvas.renderAll()
  const thumbnail = tempFabricCanvas.toDataURL({ format: 'png', multiplier: 1, enableRetinaScaling: false as any })
   // 获取所有对象的 JSON 数据
   const jsonData = allObjects.map(obj => obj.toJSON())
    
    // 保存到 store
    const markerData = {
      thumbnail,
      jsonData
    }
    
    const savedMarker = markerStore.addMarker(markerData)
    console.log('Canvas 已保存:', savedMarker)
    
    // 清理临时画布
    tempFabricCanvas.dispose()
}
</script>

<template>
  <!-- 横向排列的矩形工具栏 -->
  <div class="flex items-center gap-2 p-1">
    <!-- 颜色选择器 -->
    <ColorPicker />
    <!-- 绘制工具聚合按钮 -->
    <div class="relative draw-tool-menu">
      <button
        class="rounded flex h-7 w-7 items-center justify-center cursor-pointer relative"
        :class="[
          (mode === 'draw' || mode === 'rect' || mode === 'ellipse')
            ? 'bg-[var(--primary-color)] text-white'
            : 'bg-white text-black hover:bg-[#f5f5f5]'
        ]"
        title="绘制工具"
        @click="toggleDrawMenu"
      >
        <span class="i-carbon-pen" />
      </button>
      
      <!-- 绘制工具上拉菜单 -->
      <div 
        v-if="showDrawMenu"
        class="absolute left-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px] draw-tool-menu"
      >
        <!-- 圆形 -->
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-t-lg"
          :class="mode === 'ellipse' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'"
          @click="() => { setMode('ellipse'); showDrawMenu = false; }"
        >
          <span class="i-carbon-circle-outline text-sm" />
          <span class="text-xs">ellipse</span>
        </button>
        
        <!-- 矩形 -->
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
          :class="mode === 'rect' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'"
          @click="() => { setMode('rect'); showDrawMenu = false; }"
        >
          <span class="i-carbon-checkbox text-sm" />
          <span class="text-xs">rect</span>
        </button>
        
        <!-- 自由绘制 -->
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-b-lg"
          :class="mode === 'draw' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'"
          @click="() => { setMode('draw'); showDrawMenu = false; }"
        >
          <span class="i-carbon-pen text-sm" />
          <span class="text-xs">pen</span>
        </button>
      </div>
    </div>
    
    <!-- 移动模式按钮 -->
    <button
      class="rounded flex h-7 w-7 items-center justify-center cursor-pointer"
      :class="[
        mode === 'move'
          ? 'bg-[var(--primary-color)]'
          : 'bg-white hover:bg-[#f5f5f5]'
      ]"
      title="移动模式"
      @click="() => setMode('move')"
    >
      <img 
        src="/cc-hand.svg" 
        class="w-4 h-4" 
        :class="mode === 'move' ? 'brightness-0 invert' : ''"
        alt="移动" 
      />
    </button>
    
    <!-- 橡皮擦按钮 -->
    <button
      class="rounded flex h-7 w-7 items-center justify-center cursor-pointer"
      :class="[
        mode === 'erase'
          ? 'bg-[var(--primary-color)] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="橡皮擦"
      @click="() => setMode('erase')"
    >
      <span class="i-carbon-erase" />
    </button>
    
    <!-- 上传Marker按钮 -->
    <button
      class="rounded flex h-7 w-7 items-center justify-center bg-white text-black hover:bg-[#f5f5f5] cursor-pointer"
      title="上传标记"
      @click="triggerFileUpload"
    >
      <span class="i-carbon-upload" />
    </button>
    
    <!-- 保存按钮 -->
    <button
      class="rounded flex h-7 w-7 items-center justify-center bg-green-600 text-white hover:bg-green-700 cursor-pointer"
      title="保存标记"
      @click="saveMarkers"
    >
      <span class="i-carbon-save" />
    </button>
    
    <!-- 清除按钮 -->
    <button
      class="text-white rounded bg-[var(--delete-color)] flex h-7 w-7 items-center justify-center hover:bg-[var(--delete-hover-color)] cursor-pointer"
      title="清除标记"
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


</style>
