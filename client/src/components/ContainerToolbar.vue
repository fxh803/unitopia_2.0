<script setup lang="ts">
import { useCanvasModeStore } from '~/stores/canvasMode'
import { useSelectedModeStore } from '~/stores/selectedMode'
import { storeToRefs } from 'pinia'
import { FabricImage } from 'fabric'

const canvasModeStore = useCanvasModeStore() 
const { mode } = storeToRefs(canvasModeStore)
const { setMode } = canvasModeStore

const selectedModeStore = useSelectedModeStore() 

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
    reader.onload = (e) => {
      const result = e.target?.result as string
      console.log('PNG文件已上传:', file.name)
      
      // 将图片添加到画布作为container对象
      addImageToCanvas(result, file.name)
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
  console.log('开始添加图片到画布:', fileName)
  
  // 获取canvas实例
  const canvasInstance = canvasModeStore.canvasRef?.()
  if (!canvasInstance) {
    console.error('Canvas实例未找到')
    return
  }
  
  console.log('Canvas实例获取成功:', canvasInstance)

  // 使用fabric.js的Promise方式加载图片
  FabricImage.fromURL(imageDataUrl).then((fabricImg) => {
    console.log('Fabric Image创建成功:', fabricImg)
    
    // 设置图片属性
    fabricImg.set({
      left: canvasInstance.width / 2,
      top: canvasInstance.height / 2,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      dataType: 'container',
      uploadType:'container_png'
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
    
    console.log('图片已成功添加到画布作为container对象:', fileName)
    
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
  <div class="px-2 py-4 border border-[#e6e6e6] rounded-xl bg-white flex flex-col gap-3 shadow right-6 top-1/2 absolute z-10 -translate-y-1/2">
    <button
      class="rounded flex h-10 w-10 items-center justify-center cursor-pointer"
      :class="[
        mode === 'draw'
          ? 'bg-[#0d99ff] text-white'
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
          ? 'bg-[#0d99ff]'
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
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Eraser"
      @click="() => setMode('erase')"
    >
      <span class="i-carbon-erase" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center cursor-pointer"
      :class="[
        mode === 'rect'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Rectangle"
      @click="() => setMode('rect')"
    >
      <span class="i-carbon:checkbox" />
    </button>
    <button
      class="rounded flex h-10 w-10 items-center justify-center cursor-pointer"
      :class="[
        mode === 'ellipse'
          ? 'bg-[#0d99ff] text-white'
          : 'bg-white text-black hover:bg-[#f5f5f5]'
      ]"
      title="Ellipse"
      @click="() => setMode('ellipse')"
    >
      <span class="i-carbon-circle-outline" />
    </button>
    
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
      class="text-white rounded bg-red-600 flex h-10 w-10 items-center justify-center hover:bg-red-700 cursor-pointer"
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
