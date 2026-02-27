<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTutorialStore } from '~/stores/tutorial'

const tutorialStore = useTutorialStore()
const { isTutorialOpen } = storeToRefs(tutorialStore)

const steps = [
  {
    id: 'data-table',
    title: 'Data Table',
    desc: '在此上传与管理数据。支持表格视图(data table)与映射视图(mapping view)。在映射视图中可以对数据进行筛选操作，选中目标数据。'
  },
  {
    id: 'mark-editor',
    title: 'Mark Editor',
    desc: '在画布上绘制图形，保存到标记库（Marker Library）后可拖动到data table的筛选好的数据，实现数据与图形的关联。'
  },
  {
    id: 'canvas-editor',
    title: 'Canvas Editor',
    desc: '主画布编辑区。放置容器、发射器与力场，构建单元可视化布局。'
  },
  {
    id: 'visualization-gallery',
    title: 'Visualization Gallery',
    desc: '管理单元可视化序列，可删除，复制场景以及自定义每个场景的渲染参数，系统将根据选中场景所属序列进行多轮渲染。'
  },
  {
    id: 'run-button',
    title: 'Render',
    desc: '点击 Run 按钮启动渲染流程，生成当前场景的可视化结果。'
  }
]

const currentStep = ref(0)
// 每个步骤单独配置卡片宽度
const stepWidths = [
  'w-[600px]', // 第一步
  'w-[600px]', // 第二步
  'w-[900px]', // 第三步
  'w-[400px]', // 第四步
  'w-[360px]'  // 第五步：Run 按钮小提示
]
const stepWidthClass = computed(() => stepWidths[currentStep.value] ?? 'w-[300px]')
const spotlightRect = ref<{ top: number; left: number; width: number; height: number } | null>(null)
const PADDING = 8

function getPanelRect(selector: string): DOMRect | null {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(`[data-tutorial="${selector}"]`)
  if (!el) return null
  return el.getBoundingClientRect()
}

function updateSpotlight() {
  const step = steps[currentStep.value]
  if (!step) return
  nextTick(() => {
    const rect = getPanelRect(step.id)
    if (rect) {
      spotlightRect.value = {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2
      }
    } else {
      spotlightRect.value = null
    }
  })
}

function goNext() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    updateSpotlight()
  } else {
    tutorialStore.closeTutorial()
  }
}

function goPrev() {
  if (currentStep.value > 0) {
    currentStep.value--
    updateSpotlight()
  }
}

function close() {
  tutorialStore.closeTutorial()
}

watch(isTutorialOpen, (open) => {
  if (open) {
    currentStep.value = 0
    updateSpotlight()
  }
})

watch(currentStep, () => updateSpotlight())

onMounted(() => {
  if (isTutorialOpen.value) updateSpotlight()
  window.addEventListener('resize', updateSpotlight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateSpotlight)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="tutorial-fade">
      <div
        v-if="isTutorialOpen"
        class="tutorial-overlay fixed inset-0 z-[9999] flex items-center justify-center"
      >
        <!-- 未定位到板块时使用全屏暗色 -->
        <div
          v-if="!spotlightRect"
          class="absolute inset-0 bg-black/60 pointer-events-none"
        />
        <!-- 高亮镂空：用 box-shadow 挖出当前板块，周围为暗色蒙版 -->
        <div
          v-if="spotlightRect"
          class="spotlight pointer-events-none absolute rounded-lg border-2 border-[var(--primary-color)] bg-transparent shadow-spotlight"
          :style="{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`
          }"
        />
        <!-- 说明卡片 -->
        <div
          class="tutorial-card pointer-events-auto absolute left-1/2 bottom-16 -translate-x-1/2 max-w-[90vw] bg-white rounded-xl shadow-xl border border-gray-200 p-5"
          :class="stepWidthClass"
        >
          <!-- 第一步：Data Table 演示视频（按视频自身比例，无黑边） -->
          <div v-if="currentStep === 0" class="tutorial-video-wrap mb-4 rounded-lg overflow-hidden bg-black">
            <video
              src="/data Table演示.mp4"
              class="tutorial-video w-full h-auto block"
              controls
              autoplay
              muted
              loop
              playsinline
            />
          </div>
          <!-- 第二步：Mark Editor 演示视频（按视频自身比例，无黑边） -->
          <div v-if="currentStep === 1" class="tutorial-video-wrap mb-4 rounded-lg overflow-hidden bg-black">
            <video
              src="/markereditor演示2.mp4"
              class="tutorial-video w-full h-auto block"
              controls
              autoplay
              muted
              loop
              playsinline
            />
          </div>
          <!-- 第三步：Canvas Editor 演示视频（按视频自身比例，无黑边） -->
          <div v-if="currentStep === 2" class="tutorial-video-wrap mb-4 rounded-lg overflow-hidden bg-black">
            <video
              src="/canvas演示.mp4"
              class="tutorial-video w-full h-auto block"
              controls
              autoplay
              muted
              loop
              playsinline
            />
          </div>
          <!-- 第四步：Visualization Gallery 演示视频（按视频自身比例，无黑边） -->
          <div v-if="currentStep === 3" class="tutorial-video-wrap mb-4 rounded-lg overflow-hidden bg-black">
            <video
              src="/gallery演示.mp4"
              class="tutorial-video w-full h-auto block"
              controls
              autoplay
              muted
              loop
              playsinline
            />
          </div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-bold text-gray-800">
              {{ steps[currentStep].title }}
            </h3>
            <span class="text-sm text-gray-500">
              {{ currentStep + 1 }} / {{ steps.length }}
            </span>
          </div>
          <p class="text-gray-600 text-sm leading-relaxed mb-5">
            {{ steps[currentStep].desc }}
          </p>
          <div class="flex items-center justify-between gap-3">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              :class="{ 'invisible': currentStep === 0 }"
              :disabled="currentStep === 0"
              @click="goPrev"
            >
              上一步
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium bg-[var(--primary-color)] text-[var(--title-color)] rounded-lg hover:opacity-90 transition-opacity"
              @click="goNext"
            >
              {{ currentStep === steps.length - 1 ? '完成' : '下一步' }}
            </button>
          </div>
        </div>
        <!-- 右上角关闭 -->
        <button
          type="button"
          class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center pointer-events-auto text-gray-600 hover:text-gray-800 transition-colors"
          aria-label="关闭教程"
          @click="close"
        >
          <span class="i-carbon:close text-xl" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tutorial-overlay {
  --spotlight-color: rgba(0, 0, 0, 0.65);
}
.shadow-spotlight {
  box-shadow: 0 0 0 9999px var(--spotlight-color);
}
.tutorial-fade-enter-active,
.tutorial-fade-leave-active {
  transition: opacity 0.2s ease;
}
.tutorial-fade-enter-from,
.tutorial-fade-leave-to {
  opacity: 0;
}
</style>
