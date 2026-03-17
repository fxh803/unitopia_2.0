<template>
  <div class="flex flex-col h-full">
    <div class="flex h-full bg-[var(--primary-light-color)] text-[var(--title-color)]">
      <!-- 左侧筛选栏 -->
      <aside
        class="self-stretch w-[15%] min-w-[280px] max-w-[380px] flex-shrink-0 bg-[var(--primary-light-color)] border-r border-[var(--border-color)] px-3 overflow-y-auto shadow-sm font-sans"
      >
        <!-- Source 过滤 -->
        <div class="mx-2.5">
          <h2 class="text-base font-semibold mb-3 pb-1.5 border-b-2 border-gray-200 text-gray-700">
            Source
          </h2>
          <div>
            <div
              v-for="tag in frTags"
              :key="tag"
              class="flex items-center mb-1 cursor-pointer"
            >
              <input
                type="checkbox"
                class="mr-2"
                :checked="selectedFrTags.includes(tag)"
                @change="toggleFrTag(tag)"
              />
              <span>{{ tag }}</span>
            </div>
          </div>
        </div>

        <!-- Element Design 过滤 -->
        <div class="mx-2.5 mt-4">
          <h2 class="text-base font-semibold mb-3 pb-1.5 border-b-2 border-gray-200 text-gray-700">
            Element Design
          </h2>
          <!-- Shapes -->
          <div class="mb-2 font-semibold text-gray-800">
            Shapes
          </div>
          <div class="ml-3 mb-2">
            <div class="font-medium">Regular</div>
            <div class="ml-3">
              <div
                v-for="tag in ['circles', 'rectangles', 'polygon', 'raster image patch']"
                :key="tag"
                class="flex items-center mb-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="mr-2"
                  :checked="selectedElementTags.includes(tag)"
                  @change="toggleElementTag(tag)"
                />
                <span>{{ tag }}</span>
              </div>
            </div>
          </div>
          <div class="ml-3 mb-2">
            <div class="font-medium">Irregular</div>
            <div class="ml-3">
              <div
                v-for="tag in ['hand-draw', 'icons', 'text']"
                :key="tag"
                class="flex items-center mb-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="mr-2"
                  :checked="selectedElementTags.includes(tag)"
                  @change="toggleElementTag(tag)"
                />
                <span>{{ tag }}</span>
              </div>
            </div>
          </div>

          <!-- Patterns -->
          <div class="mt-4 mb-2 font-semibold text-gray-800">
            Patterns
          </div>
          <div class="ml-3 mb-2">
            <div class="font-medium">Geometric_repetitive</div>
            <div class="ml-3">
              <div
                v-for="tag in ['strict', 'proportion-encoding', 'rigid transformation']"
                :key="tag"
                class="flex items-center mb-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="mr-2"
                  :checked="selectedElementTags.includes(tag)"
                  @change="toggleElementTag(tag)"
                />
                <span>{{ tag }}</span>
              </div>
            </div>
          </div>
          <div class="ml-3 mb-2">
            <div class="font-medium">Non_repetitive</div>
            <div class="ml-3">
              <div
                v-for="tag in ['multiple categories']"
                :key="tag"
                class="flex items-center mb-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="mr-2"
                  :checked="selectedElementTags.includes(tag)"
                  @change="toggleElementTag(tag)"
                />
                <span>{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Visual Layout 过滤 -->
        <div class="mx-2.5 mt-4">
          <h2 class="text-base font-semibold mb-3 pb-1.5 border-b-2 border-gray-200 text-gray-700">
            Visual Layout
          </h2>
          <!-- Regularity -->
          <div class="mb-2 font-semibold text-gray-800">
            Regularity
          </div>
          <div class="ml-3 mb-2">
            <div class="font-medium">Restrict_Rule_based</div>
            <div class="ml-3">
              <div
                v-for="tag in ['linear', 'grid', 'radial', 'circular', 'data-driven']"
                :key="tag"
                class="flex items-center mb-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="mr-2"
                  :checked="selectedLayoutTags.includes(tag)"
                  @change="toggleLayoutTag(tag)"
                />
                <span>{{ tag }}</span>
              </div>
            </div>
          </div>
          <div class="ml-3 mb-2">
            <div class="font-medium">Organic_Natural_structure</div>
            <div class="ml-3">
              <div
                v-for="tag in ['natural movement and fluidity', 'packing']"
                :key="tag"
                class="flex items-center mb-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="mr-2"
                  :checked="selectedLayoutTags.includes(tag)"
                  @change="toggleLayoutTag(tag)"
                />
                <span>{{ tag }}</span>
              </div>
            </div>
          </div>

          <!-- Representation -->
          <div class="mt-4 mb-2 font-semibold text-gray-800">
            Representation
          </div>
          <div class="ml-3 mb-2">
            <div class="font-medium">Metaphor_based_Composition</div>
            <div class="ml-3">
              <div
                v-for="tag in ['metaphor']"
                :key="tag"
                class="flex items-center mb-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="mr-2"
                  :checked="selectedLayoutTags.includes(tag)"
                  @change="toggleLayoutTag(tag)"
                />
                <span>{{ tag }}</span>
              </div>
            </div>
          </div>
          <div class="ml-3 mb-4">
            <div class="font-medium">Abstract_Boundary</div>
            <div class="ml-3">
              <div
                v-for="tag in ['shapely', 'canvas']"
                :key="tag"
                class="flex items-center mb-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="mr-2"
                  :checked="selectedLayoutTags.includes(tag)"
                  @change="toggleLayoutTag(tag)"
                />
                <span>{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main class="flex-1 p-4 bg-[var(--primary-muted-color)] overflow-y-auto">
        <div class="mx-auto w-[95%]">
          <div class="grid grid-cols-4 gap-4">
            <div
              v-for="img in filteredImages"
              :key="img.id"
              class="group relative bg-white rounded-lg cursor-pointer overflow-hidden mx-2 my-3 shadow-md hover:shadow-xl transition-all duration-300 ease-in-out"
              :style="cardStyle"
              @click="openLightbox(img)"
            >
              <div class="relative w-full aspect-[5/4] overflow-hidden">
                <img
                  :src="img.url"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  :alt="`Visualization ${img.id}`"
                />
                <div :style="idBadgeWrapperStyle">
                  <span :style="idBadgeStyle">
                    {{ img.id }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="!filteredImages.length && !loading"
            class="col-span-4 text-center py-20 text-gray-500"
          >
            No images.
          </div>

          <div
            v-if="loading"
            class="col-span-4 text-center py-20 text-gray-500"
          >
            加载中...
          </div>
        </div>
      </main>

      <Lightbox
        :image="lightboxImage"
        @close="lightboxImage = null"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Lightbox from './Lightbox.vue'
import { ip } from '~/composables/server'
interface ImageItem {
  id: string
  url: string
  element_design: {
    shapes: {
      regular: string
      irregular: string
    }
    patterns: {
      geometric_repetitive: string
      non_repetitive: string
    }
  }
  visual_layout: {
    regularity: {
      restrict_rule_based: string
      organic_natural_structure: string
    }
    representation: {
      metaphor_based_composition: string
      abstract_boundary: string
    }
  }
  source: string
  fr: string
}

const images = ref<ImageItem[]>([])
const loading = ref(true)
const lightboxImage = ref<ImageItem | null>(null)

// 标签层级关系（与 React 版本一致）
const tagHierarchy: Record<string, string[]> = {
  // Element Design - Shapes
  Regular: ['circles', 'rectangles', 'polygon', 'raster image patch'],
  Irregular: ['hand-draw', 'icons', 'text'],
  Shapes: [
    'Regular',
    'Irregular',
    'circles',
    'rectangles',
    'polygon',
    'raster image patch',
    'hand-draw',
    'icons',
    'text'
  ],

  // Element Design - Patterns
  Geometric_repetitive: ['strict', 'proportion-encoding', 'rigid transformation'],
  Non_repetitive: ['multiple categories'],
  Patterns: [
    'Geometric_repetitive',
    'Non_repetitive',
    'strict',
    'proportion-encoding',
    'rigid transformation',
    'multiple categories'
  ],

  // Visual Layout - Regularity
  Restrict_Rule_based: ['linear', 'grid', 'radial', 'circular', 'data-driven'],
  Organic_Natural_structure: ['natural movement and fluidity', 'packing'],
  Regularity: [
    'Restrict_Rule_based',
    'Organic_Natural_structure',
    'linear',
    'grid',
    'radial',
    'circular',
    'data-driven',
    'natural movement and fluidity',
    'packing'
  ],

  // Visual Layout - Representation
  Metaphor_based_Composition: ['metaphor'],
  Abstract_Boundary: ['shapely', 'canvas'],
  Representation: [
    'Metaphor_based_Composition',
    'Abstract_Boundary',
    'metaphor',
    'shapely',
    'canvas'
  ]
}

const getAllChildTags = (tag: string): string[] => {
  const children = tagHierarchy[tag] || []
  const allChildren: string[] = []

  children.forEach((child) => {
    allChildren.push(child)
    const grandChildren = getAllChildTags(child)
    allChildren.push(...grandChildren)
  })

  return Array.from(new Set(allChildren))
}

// 选中的标签（与 React 版本语义一致）
const selectedElementTags = ref<string[]>([])
const selectedLayoutTags = ref<string[]>([])
const selectedFrTags = ref<string[]>([])

// 从数据中提取 fr 标签
const frTags = computed(() => {
  const set = new Set<string>()
  images.value.forEach((img) => {
    if (img.fr) set.add(img.fr)
  })
  return Array.from(set)
})

// 过滤逻辑（与 React 版本保持一致，包括父标签联动）
const hasElementDesignTag = (img: ImageItem, tag: string): boolean => {
  const { element_design } = img
  const allRelatedTags = [tag, ...getAllChildTags(tag)]

  return (
    allRelatedTags.some(
      (t) =>
        element_design?.shapes?.regular === t ||
        element_design?.shapes?.irregular === t ||
        element_design?.patterns?.geometric_repetitive === t ||
        element_design?.patterns?.non_repetitive === t
    )
  )
}

const hasVisualLayoutTag = (img: ImageItem, tag: string): boolean => {
  const { visual_layout } = img
  const allRelatedTags = [tag, ...getAllChildTags(tag)]

  return (
    allRelatedTags.some(
      (t) =>
        visual_layout?.regularity?.restrict_rule_based === t ||
        visual_layout?.regularity?.organic_natural_structure === t ||
        visual_layout?.representation?.metaphor_based_composition === t ||
        visual_layout?.representation?.abstract_boundary === t
    )
  )
}

const filteredImages = computed(() => {
  return images.value.filter((img) => {
    const matchElement =
      !selectedElementTags.value.length ||
      selectedElementTags.value.some((tag) => hasElementDesignTag(img, tag))

    const matchLayout =
      !selectedLayoutTags.value.length ||
      selectedLayoutTags.value.some((tag) => hasVisualLayoutTag(img, tag))

    const matchFr =
      !selectedFrTags.value.length || selectedFrTags.value.includes(img.fr)

    return matchElement && matchLayout && matchFr
  })
})

onMounted(async () => {
  try {
    // 与后端 server.ts 一致，使用同一后端 IP
    const res = await fetch(`${ip}/api/images`)
    const data = await res.json()
    images.value = data
  } catch (e) {
    console.error('获取数据失败', e)
  } finally {
    loading.value = false
  }
})

const openLightbox = (img: ImageItem) => {
  lightboxImage.value = img
}

const toggleElementTag = (tag: string) => {
  selectedElementTags.value = selectedElementTags.value.includes(tag)
    ? // 取消选中：移除自己及所有子标签
      selectedElementTags.value.filter(
        (t) => t !== tag && !getAllChildTags(tag).includes(t)
      )
    : // 选中：只添加当前标签（父标签联动通过过滤逻辑实现）
      [...selectedElementTags.value, tag]
}

const toggleLayoutTag = (tag: string) => {
  selectedLayoutTags.value = selectedLayoutTags.value.includes(tag)
    ? selectedLayoutTags.value.filter(
        (t) => t !== tag && !getAllChildTags(tag).includes(t)
      )
    : [...selectedLayoutTags.value, tag]
}

const toggleFrTag = (tag: string) => {
  if (selectedFrTags.value.includes(tag)) {
    selectedFrTags.value = selectedFrTags.value.filter((t) => t !== tag)
  } else {
    selectedFrTags.value = [...selectedFrTags.value, tag]
  }
}

const cardStyle = {
  margin: '12px',
  padding: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
  border: '1px solid #f0f0f0',
  display: 'flex',
  flexDirection: 'column',
  height: 'fit-content'
} as const

const idBadgeWrapperStyle = {
  position: 'absolute',
  top: '8px',
  left: '8px',
  zIndex: 20
} as const

const idBadgeStyle = {
  backgroundColor: 'rgba(0,0,0,0.5)',
  color: '#fff',
  borderRadius: '9999px',
  padding: '4px 8px',
  fontSize: '12px',
  lineHeight: '1',
  display: 'inline-block',
  fontWeight: 500
} as const
</script>

