<script setup lang="ts"> 
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { FabricImage } from 'fabric'
import { useBackgroundStore } from '~/stores/background'
import { useCollageSeriesStore } from '~/stores/collageSeries'

const backgroundStore = useBackgroundStore()
const { canvasRef, creatingBackground } = storeToRefs(backgroundStore)
const { getCurrentOverviewBackground, setCurrentOverviewBackground } = backgroundStore

const collageSeriesStore = useCollageSeriesStore()
const { overviews, currentOverviewIndex } = storeToRefs(collageSeriesStore)
const { addBackgroundToAllSlides, removeBackgroundFromAllSlides, updateCurrentSlide } = collageSeriesStore

// 计算当前总览的背景
const currentBackground = computed(() => {
  if (overviews.value.length === 0) return null
  const currentOverview = overviews.value[currentOverviewIndex.value]
  if (!currentOverview) return null
  return getCurrentOverviewBackground(currentOverview.overviewId)
})


// 文件上传相关
const fileInputRef = ref<HTMLInputElement>()

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file && (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg'))) {
    // 创建文件读取器
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string 
      // 将图片保存到backgroundStore
    
      setBackgroundImage(result, file.name)
    }
    reader.readAsDataURL(file)
  } else if (file) {
    alert('请选择 PNG、JPG 或 SVG 格式的图片文件')
  }
  
  // 清空文件输入框，允许重复选择同一文件
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}
const setBackgroundImage = async (imageDataUrl: string, fileName: string) => { 
  const currentOverview = overviews.value[currentOverviewIndex.value]
  
  // 获取canvas实例
  const canvasInstance = canvasRef.value?.() 
  if (!canvasInstance) {
    console.error('Canvas实例未找到')
    return
  }
   
  
  // 先清空之前的背景
  backgroundStore.clearBackground(currentOverview.overviewId)
  
  // 设置新的背景值到当前总览
  setCurrentOverviewBackground(currentOverview.overviewId, imageDataUrl)
  
  try {
    // 使用fabric.js的Promise方式加载图片
    const fabricImg = await FabricImage.fromURL(imageDataUrl) 
    
    // 设置图片属性
    fabricImg.set({
      left: canvasInstance.width / 2,
      top: canvasInstance.height / 2,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      dataType: 'background'
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
    canvasInstance.sendObjectToBack(fabricImg)
    //保证当前幻灯片的缩略图更新
    updateCurrentSlide()
    // 重新渲染画布
    canvasInstance.renderAll()
    creatingBackground.value = false 
    
    // 为当前总览的所有slide添加背景对象
    await addBackgroundToAllSlides(fabricImg.toObject())
    
  } catch (error) {
    console.error('背景图片加载失败:', error)
  }
}

// 从 URL 自动应用背景（用于示例入口）
const setBackgroundFromUrl = async (url: string) => {
  try {
    // 先确保 canvas 已经就绪
    const waitForCanvasReady = async (timeout = 3000) => {
      const start = Date.now()
      while (!canvasRef.value?.()) {
        if (Date.now() - start > timeout) return false
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return true
    }

    const ready = await waitForCanvasReady()
    if (!ready) {
      console.error('等待 Canvas 实例超时，自动背景未应用')
      return
    }

    const res = await fetch(url)
    if (!res.ok) return
    const blob = await res.blob()
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    await setBackgroundImage(base64, url.split('/').pop() || 'background')
  } catch (error) {
    console.error('自动背景加载失败:', error)
  }
}

onMounted(async () => {
  if (typeof window === 'undefined') return
  const url = window.sessionStorage.getItem('autoBackgroundUrl')
  if (!url) return

  // 使用一次后清理
  window.sessionStorage.removeItem('autoBackgroundUrl')
  await setBackgroundFromUrl(url)
})

const triggerFileUpload = () => {
  creatingBackground.value = true
  fileInputRef.value?.click()
}

const clearBackground = async () => {
  // 获取当前总览
  if (overviews.value.length === 0) return
  const currentOverview = overviews.value[currentOverviewIndex.value]
  if (!currentOverview) return
  
  backgroundStore.clearBackground(currentOverview.overviewId)
  // 从当前总览的所有slide中移除背景对象
  await removeBackgroundFromAllSlides()
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- 背景图片上传按钮 -->
    <button
      class="relative rounded flex h-10 w-10 items-center justify-center transition-colors cursor-pointer group"
             :class="[
         currentBackground 
           ? 'bg-gray-300 text-gray-500' 
           : 'bg-white text-black hover:bg-[#f5f5f5]'
       ]"
       :title="currentBackground ? 'background uploaded' : 'upload background'"
               @click="triggerFileUpload"
    >
      <span class="i-carbon-image text-lg" />
      
             <!-- 绿色打勾图标 -->
       <div 
         v-if="currentBackground"
         class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
       >
         <span class="i-carbon-checkmark text-white text-xs transform translate-y-1px" />
       </div>
      
      <!-- 红色清除按钮 -->
      <div 
        v-if="currentBackground"
        class="absolute -top-1 -right-1 w-4 h-4 bg-[var(--delete-color)] rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--delete-hover-color)] transition-colors opacity-0 group-hover:opacity-100"
        @click.stop="clearBackground"
        title="清除背景"
      >
        <span class="i-carbon-close text-white text-xs transform translate-y-1px" />
      </div>
    </button>
    
    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/jpg,image/svg+xml"
      class="hidden"
      @change="handleFileUpload"
    />
  </div>
</template>
