<script setup lang="ts">
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { storeToRefs } from 'pinia'
import { FabricImage } from 'fabric'
import { sendUploadContainerToServer } from '~/composables/server'
const canvasModeStore = useCanvasModeStore() 
const { mode } = storeToRefs(canvasModeStore)
const { setMode } = canvasModeStore

const selectedModeStore = useSelectedModeStore()

// 形状绘制菜单控制
const showShapeMenu = ref(false)

const toggleShapeMenu = () => {
  showShapeMenu.value = !showShapeMenu.value
}

// 点击外部关闭菜单
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.shape-tool-menu')) {
      showShapeMenu.value = false
    }
  })
}) 

const clearCanvas = () => { 
    const canvasInstance = canvasModeStore.canvasRef?.()
    if (!canvasInstance) return
    // 复制一份对象数组，避免遍历时出错
    const objects = canvasInstance.getObjects().concat();
    objects.forEach(obj => {
      if (obj.get('dataType') === 'container') {
        canvasInstance.remove(obj);
      } 
    });
    canvasInstance.discardActiveObject();
    canvasInstance.renderAll();
    // 背景色会自动保留，无需重新设置 
}
// 文件上传相关
const fileInputRef = ref<HTMLInputElement>()

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file && file.type === 'image/png') {
    // 创建文件读取器
    const reader = new FileReader()
    reader.onload = async (e) => {
      const result = e.target?.result as string 
      const processedImg = await sendUploadContainerToServer(result) 
      // 将图片添加到画布作为container对象
      addImageToCanvas(processedImg, file.name)
    }
    reader.readAsDataURL(file)
  } else if (file) {
    alert('请选择PNG格式的图片文件')
  }
  
  // 清空文件输入框，允许重复选择同一文件
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const addImageToCanvas = (imageDataUrl: string, fileName: string) => { 
  
  // 获取canvas实例
  const canvasInstance = canvasModeStore.canvasRef?.()
  if (!canvasInstance) {
    console.error('Canvas实例未找到')
    return
  }
   

  // 使用fabric.js的Promise方式加载图片
  FabricImage.fromURL(imageDataUrl).then((fabricImg) => { 
    
    // 设置图片属性
    fabricImg.set({
      left: canvasInstance.width / 2,
      top: canvasInstance.height / 2,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      dataType: 'container'
    })
    
    // 计算合适的缩放比例
    const canvasWidth = canvasInstance.width || 400
    const canvasHeight = canvasInstance.height || 400
    const maxWidth = canvasWidth * 0.8
    const maxHeight = canvasHeight * 0.8
    
    const scaleX = maxWidth / fabricImg.width
    const scaleY = maxHeight / fabricImg.height
    const scale = Math.min(scaleX, scaleY, 1)
    
    fabricImg.set({
      scaleX: scale,
      scaleY: scale
    })

    // 将图片添加到画布
    canvasInstance.add(fabricImg) 
    
    // 应用透明度规则
    selectedModeStore.handleModeSwitch('container')
    
    // 重新渲染画布
    canvasInstance.renderAll()
     
    
  }).catch((error) => {
    console.error('图片加载失败:', error)
  })
}

const triggerFileUpload = () => {
  canvasModeStore.setMode(null)
  fileInputRef.value?.click()
}
</script>

<template>
  <div class="px-2 py-4 border border-[#e6e6e6] rounded-tr-xl rounded-br-xl bg-white flex flex-col gap-3 shadow left-0 absolute z-10" style="top: 356px;">
    <button
      class="rounded flex h-10 w-10 items-center justify-center cursor-pointer"
      :class="[
        mode === 'draw'
          ? 'bg-[var(--primary-color)] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Draw"
      @click="() => setMode('draw')"
    >
      <span class="i-carbon-pen" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center cursor-pointer"
      :class="[
        mode === 'move'
          ? 'bg-[var(--primary-color)]'
          : 'bg-white hover:bg-[#f5f5f5]'
      ]"
      title="Move"
      @click="() => setMode('move')"
    >
      <img 
        src="/cc-hand.svg" 
        class="w-5 h-5" 
        :class="mode === 'move' ? 'brightness-0 invert' : ''"
        alt="Move" 
      />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center cursor-pointer"
      :class="[
        mode === 'erase'
          ? 'bg-[var(--primary-color)] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Eraser"
      @click="() => setMode('erase')"
    >
      <span class="i-carbon-erase" />
    </button>
    <!-- 形状绘制工具聚合按钮 -->
    <div class="relative shape-tool-menu">
      <button
        class="rounded flex h-10 w-10 items-center justify-center cursor-pointer relative"
        :class="[
          (mode === 'rect' || mode === 'ellipse')
            ? 'bg-[var(--primary-color)] text-white'
            : 'bg-white text-black hover:bg-[#f5f5f5]'
        ]"
        title="形状工具"
        @click="toggleShapeMenu"
      >
        <span v-if="mode === 'ellipse'" class="i-carbon-circle-outline" />
        <span v-else class="i-carbon:checkbox" />
        <!-- 右下角黑三角 -->
        <div class="absolute bottom-0 right-0 w-0 h-0 border-l-[5px] border-t-[5px] border-l-transparent border-t-black transform rotate-90"></div>
      </button>
      
      <!-- 形状绘制工具上拉菜单 -->
      <div 
        v-if="showShapeMenu"
        class="absolute right-full top-0 mr-5 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px] shape-tool-menu"
      >
        <!-- 圆形 -->
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-t-lg"
          :class="mode === 'ellipse' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'"
          @click="() => { setMode('ellipse'); showShapeMenu = false; }"
        >
          <span class="i-carbon-circle-outline text-sm" />
          <span class="text-xs">ellipse</span>
        </button>
        
        <!-- 矩形 -->
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-b-lg"
          :class="mode === 'rect' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'"
          @click="() => { setMode('rect'); showShapeMenu = false; }"
        >
          <span class="i-carbon:checkbox text-sm" />
          <span class="text-xs">rect</span>
        </button>
      </div>
    </div>
    
    <!-- PNG上传按钮 -->
    <button
      class="rounded flex h-10 w-10 items-center justify-center bg-white text-black hover:bg-[#f5f5f5] cursor-pointer"
      title="upload container"
      @click="triggerFileUpload"
    >
    <div class="i-carbon:upload"></div>
    </button>
    
    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".png,image/png"
      class="hidden"
      @change="handleFileUpload"
    />
    
    <button
      class="text-black rounded bg-white flex h-10 w-10 items-center justify-center hover:bg-[#f5f5f5] cursor-pointer"
      title="Clear Canvas"
      @click="clearCanvas"
    >
      <span class="i-carbon-trash-can" />
    </button>

    
    <div class="flex justify-center pt-2 border-t border-gray-200">
      <backgroundUploader />
    </div>
  </div>
</template>

<style scoped>
/* 形状工具菜单样式 */
.shape-tool-menu {
  /* 确保菜单在正确的层级显示 */
  z-index: 1000;
}

/* 上拉菜单动画 */
.shape-tool-menu > div {
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
