<script setup lang="ts"> 
import { storeToRefs } from 'pinia'
import { useBackgroundStore } from '~/stores/background'
import { useCollageSeriesStore } from '~/stores/collageSeries'
import { useMarkInstanceStore } from '~/stores/markInstance'

const backgroundStore = useBackgroundStore()
const markInstanceStore = useMarkInstanceStore()
const { creatingBackground } = storeToRefs(backgroundStore)
const { getCurrentOverviewBackground, setCurrentOverviewBackground, setCurrentOverviewBackgroundTransform } = backgroundStore

const collageSeriesStore = useCollageSeriesStore()
const { overviews, currentOverviewIndex, canvasRef } = storeToRefs(collageSeriesStore)
const { handleBackgroundChange } = collageSeriesStore

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
  
  try {
    // 计算合适的缩放比例，使图片完全适应画布（用于底层静态背景 canvas）
    const canvasWidth = canvasInstance.width || 400
    const canvasHeight = canvasInstance.height || 400
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('背景图片加载失败'))
      image.src = imageDataUrl
    })

    const scaleX = canvasWidth / image.width
    const scaleY = canvasHeight / image.height
    const scale = Math.min(scaleX, scaleY)

    // 先写入 transform，再写入背景 URL，避免先按默认尺寸闪一下再适配
    setCurrentOverviewBackgroundTransform(currentOverview.overviewId, {
      left: canvasInstance.width / 2,
      top: canvasInstance.height / 2,
      scaleX: scale,
      scaleY: scale,
      originX: 'center',
      originY: 'center',
    })
    setCurrentOverviewBackground(currentOverview.overviewId, imageDataUrl)

    // 背景更新后，重建当前 overview 下所有 slide 缩略图
    await handleBackgroundChange()
    creatingBackground.value = false 

  } catch (error) {
    console.error('背景图片加载失败:', error)
  } finally {
    creatingBackground.value = false
  }
}

const triggerFileUpload = () => {
  if (markInstanceStore.selectedMarkForDetail) {
    markInstanceStore.setMarkDetailPanelCollapsed(true)
  }
  creatingBackground.value = true
  fileInputRef.value?.click()
}

const clearBackground = async () => {
  // 获取当前总览
  if (overviews.value.length === 0) return
  const currentOverview = overviews.value[currentOverviewIndex.value]
  if (!currentOverview) return
  
  backgroundStore.clearBackground(currentOverview.overviewId)
  await handleBackgroundChange()
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
