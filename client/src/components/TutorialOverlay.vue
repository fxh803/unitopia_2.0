<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useTutorialStore } from '~/stores/tutorial'

const tutorialStore = useTutorialStore()
const { isTutorialOpen } = storeToRefs(tutorialStore)

const steps = [
  {
    id: 'data-section',
    title: 'Step 1: Upload & manage data',
    desc: 'Upload and manage your data in the Data Panel. Switch between Table and Fields views, and start from local CSV files or the built‑in presets.'
  },
  {
    id: 'marks-section',
    title: 'Step 2: Create marks',
    desc: 'Use the Marks Panel to drag fields from Data and create mark instances. Click a mark to edit its visual encoding and appearance in the Mark Detail panel.'
  },
  {
    id: 'canvas-editor',
    title: 'Step 3: Compose on canvas',
    desc: 'In the Main Canvas, place Containers, Emitters, and Forces, then drag Marks and Containers to compose your unit visualization layout.'
  },
  {
    id: 'run-button',
    title: 'Step 4: Run',
    desc: 'Click the Run button to start rendering and generate the final visualization for the current series and settings.'
  }
]

const currentStep = ref(0)
const spotlightRect = ref<{ top: number; left: number; width: number; height: number } | null>(null)
// 说明卡片相对高亮区域的位置
const cardPosition = ref<{ top: number; left: number } | null>(null)
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
      // 计算说明卡片位置：尽量贴在高亮区域左右侧，不遮挡高亮
      const viewportWidth = window.innerWidth || 0
      const viewportHeight = window.innerHeight || 0
      const CARD_WIDTH = 520
      const CARD_HEIGHT = 200 // 估算高度，用于避免超出视口
      const margin = 16

      // 优先放在右侧，如果空间不足则放在左侧
      let left = rect.left + rect.width + margin
      if (left + CARD_WIDTH > viewportWidth - margin) {
        left = rect.left - CARD_WIDTH - margin
        if (left < margin) {
          left = margin
        }
      }

      // 垂直方向尽量与高亮对齐，并防止越界
      let top = rect.top
      if (top + CARD_HEIGHT > viewportHeight - margin) {
        top = Math.max(margin, viewportHeight - CARD_HEIGHT - margin)
      }

      cardPosition.value = { top, left }
    } else {
      spotlightRect.value = null
      cardPosition.value = null
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

watch(currentStep, () => {
  updateSpotlight()
})

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
        <!-- 说明卡片：优先贴在高亮区域旁边；没有高亮时回退到底部居中 -->
        <div
          class="tutorial-card pointer-events-auto max-w-[90vw] bg-white rounded-xl shadow-xl border border-[var(--border-color)] p-5 w-[520px] absolute"
          :class="!spotlightRect ? 'left-1/2 bottom-16 -translate-x-1/2' : ''"
          :style="spotlightRect && cardPosition
            ? {
                top: `${cardPosition.top}px`,
                left: `${cardPosition.left}px`,
                transform: 'translate(0, 0)'
              }
            : {}"
        >
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-bold text-[var(--title-color)]">
              {{ steps[currentStep].title }}
            </h3>
            <span class="text-sm text-[var(--text-muted)]">
              Step {{ currentStep + 1 }} / {{ steps.length }}
            </span>
          </div>
          <p class="text-[var(--text-muted)] text-sm leading-relaxed mb-5">
            {{ steps[currentStep].desc }}
          </p>
          <div class="flex items-center justify-between gap-3">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-[var(--text-muted)] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              :class="{ 'invisible': currentStep === 0 }"
              :disabled="currentStep === 0"
              @click="goPrev"
            >
              Previous
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium bg-[var(--primary-color)] text-white rounded-lg hover:opacity-90 transition-opacity"
              @click="goNext"
            >
              {{ currentStep === steps.length - 1 ? 'Done' : 'Next' }}
            </button>
          </div>
        </div>
        <!-- 右上角关闭 -->
        <button
          type="button"
          class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center pointer-events-auto text-[var(--text-muted)] hover:text-[var(--title-color)] transition-colors"
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
