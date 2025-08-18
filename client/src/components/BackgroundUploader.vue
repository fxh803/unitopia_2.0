<script setup lang="ts"> 
import { storeToRefs } from 'pinia'
import { FabricImage } from 'fabric'
import { useBackgroundStore } from '~/stores/background'

const backgroundStore = useBackgroundStore()
const { canvasRef,creatingBackground,background } = storeToRefs(backgroundStore)


// 文件上传相关
const fileInputRef = ref<HTMLInputElement>()

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file && file.type.startsWith('image/')) {
    // 创建文件读取器
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      console.log('背景图片已上传:', file.name)
      console.log('图片',result)
      // 将图片保存到backgroundStore
      background.value = result
      setBackgroundImage(result, file.name)
    }
    reader.readAsDataURL(file)
  } else if (file) {
    alert('请选择图片文件')
  }
  
  // 清空文件输入框，允许重复选择同一文件
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}
const setBackgroundImage = (imageDataUrl: string, fileName: string) => {
  console.log('开始设置背景图片:', fileName)
  
  // 获取canvas实例
  const canvasInstance = canvasRef.value?.()
  console.log('canvasInstance',canvasInstance)
  if (!canvasInstance) {
    console.error('Canvas实例未找到')
    return
  }
  
  console.log('Canvas实例获取成功:', canvasInstance)
  backgroundStore.clearBackground()
  // 使用fabric.js的Promise方式加载图片
  FabricImage.fromURL(imageDataUrl).then((fabricImg) => {
    console.log('背景图片创建成功:', fabricImg)
    
    // 设置图片属性
    fabricImg.set({
      left: canvasInstance.width / 2,
      top: canvasInstance.height / 2,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      dataType: 'background',
      uploadType: 'background_png'
    })
    
    // 计算合适的缩放比例，使图片完全适应画布
    const canvasWidth = canvasInstance.width || 400
    const canvasHeight = canvasInstance.height || 400
    
    const scaleX = canvasWidth / fabricImg.width
    const scaleY = canvasHeight / fabricImg.height
    const scale = Math.min(scaleX, scaleY) // 使用Math.min确保图片完全适应画布，不会超出边界
    
    fabricImg.set({
      scaleX: scale,
      scaleY: scale
    })

    // 将背景图片添加到画布
    canvasInstance.add(fabricImg)
    
    // 将背景图片移动到最底层
    canvasInstance.sendObjectToBack(fabricImg, true)
    
    // 重新渲染画布
    canvasInstance.renderAll()
    creatingBackground.value = false
    console.log('背景图片已成功设置:', fileName)
    
  }).catch((error) => {
    console.error('背景图片加载失败:', error)
  })
}

const triggerFileUpload = () => {
    creatingBackground.value = true
  fileInputRef.value?.click()
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- 背景图片上传按钮 -->
    <button
      class="rounded flex h-10 w-10 items-center justify-center bg-white text-black hover:bg-[#f5f5f5] border border-gray-200"
      title="上传背景图片"
      @click="triggerFileUpload"
    >
      <span class="i-carbon-image text-lg" />
    </button>
    
    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileUpload"
    />
  </div>
</template>
