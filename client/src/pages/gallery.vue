<template>
  <div
    class="min-h-screen w-screen flex flex-col bg-[var(--primary-light-color)] text-[var(--title-color)] dark:bg-gray-900 dark:text-gray-100"
    style="font-family: var(--font-sans);"
  >
    <MainHeader />

    <!-- 内容区域 -->
    <main class="flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:py-10">
      <h1 class="text-2xl md:text-3xl font-bold mb-6 border-b border-[var(--border-color)] pb-2">
        Example Gallery
      </h1>

      <!-- 卡片网格 -->
      <section
        class="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr"
      >
        <article
          v-for="item in galleryItems"
          :key="item.id"
          class="group bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md border border-[var(--border-color)] dark:border-gray-700 flex flex-col cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-lg"
        >
          <div class="relative aspect-[4/3] bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <img
              :src="item.image"
              :alt="item.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            <!-- 悬浮蒙版 + 按钮 -->
            <div
              class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <button
                class="px-5 py-2.5 rounded-lg bg-[var(--primary-color)] text-white text-sm md:text-base font-semibold shadow-lg hover:bg-[var(--primary-hover-color)]"
                @click.stop="handleTryInEditor(item)"
              >
                try in editor
              </button>
            </div>
          </div>
          <div class="px-3 py-3 flex-1 flex items-center">
            <h2 class="text-sm font-medium truncate">
              {{ item.title }}
            </h2>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import MainHeader from '~/components/MainHeader.vue'
import { useRouter } from 'vue-router'
import { useMarkInstanceStore } from '~/stores/markInstance'
import { useTableStore } from '~/stores/table'
import { useMarkerStore } from '~/stores/marker'
import { useContainerStore } from '~/stores/container'
import { sendUploadContainerToServer } from '~/composables/server'
import { paralympicsHairMarkSnapshot } from '~/markSnapshot/paralympicsHair'

const router = useRouter()
const markInstanceStore = useMarkInstanceStore()
const tableStore = useTableStore()
const markerStore = useMarkerStore()
const containerStore = useContainerStore()

const galleryItems = [
  {
    id: 1,
    title: 'hair',
    image: '/gallery/hair.png',
    markSnapshot: paralympicsHairMarkSnapshot,
    dataUrl: '/csv/paralympics_2024_medal_table.csv',
    markLibUrl: '/marks/hair.svg',
    containerUrl: '/containers/hair.png',
    backgroundUrl: '/background/background.png',
  },
]

const handleTryInEditor = async (item: (typeof galleryItems)[number]) => {
  // 0. 进入示例前，清空相关 store 状态，避免残留
  tableStore.clearTableData()
  markerStore.clearAllMarkers()
  containerStore.clearAllContainers()
  markInstanceStore.clearAllMarkInstances()

  // 1. 触发 DataSection 加载 Paralympics 2024 预设数据
  tableStore.loadFromUrl(item.dataUrl, 'Paralympics_2024_Medal')

  // 2. 将对应的 mark / container 加载进 Libraries（markerStore / containerStore）
  if (item.markLibUrl) {
    const exists = markerStore.markers.some(m => m.name === item.title)
    if (!exists) {
      markerStore.addMarker({
        name: item.title,
        thumbnail: item.markLibUrl,
        source: item.markLibUrl,
      })
    }
  }

  if (item.containerUrl) {
    const exists = containerStore.containers.some(c => c.name === item.title)
    if (!exists) {
      try {
        // 先从 public 读出 PNG 转为 base64，再发给后端做处理，保持与 LibrariesSection 一致
        const url = item.containerUrl
        const res = await fetch(url)
        if (res.ok) {
          const blob = await res.blob()
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          const processed = await sendUploadContainerToServer(base64)
          const finalBase64 = processed || base64
          if (finalBase64) {
            containerStore.addContainer({
              name: item.title,
              thumbnail: finalBase64,
              source: finalBase64,
            })
          }
        }
      } catch {
        // 忽略单个示例容器加载失败
      }
    }
  }

  // 3. 直接向 markInstanceStore 写入示例快照（JSON 独立存放在 examples 中）
  markInstanceStore.addMarkInstance(item.markSnapshot as any)

  // 4. 记录需要自动应用的背景（在 CanvasArea 挂载后读取并上传）
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.setItem('autoBackgroundUrl', item.backgroundUrl)
  }

  // 5. 跳转到系统编辑页
  router.push('/editor')
}
</script>

<style scoped>
</style>

