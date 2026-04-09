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
                class="px-5 py-2.5 rounded-lg bg-[var(--primary-color)] text-white text-sm md:text-base font-semibold shadow-lg hover:bg-[var(--primary-hover-color)] cursor-pointer"
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
import MainHeader from '~/otherComponents/MainHeader.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const EDITOR_FRESH_KEY = 'unitopia-editor-fresh-once'
const galleryItems = [
  {
    id: 1,
    title: 'hair',
    image: '/galleries/hair.png',
    markSnapshotUrl: '/snapshots/hairMarks.json',
    collageSeriesSnapshotUrl: '/snapshots/hairCanvas.json',
    dataUrl: '/csv/hair.csv',
    markLibUrls: ['/marks/hair.svg'],
    containerUrls: ['/containers/hair.png'],
    backgroundUrl: '/background/hair.png',
  },
  {
    id: 2,
    title:'bottleDream',
    image: '/galleries/bottleDream.png',
    markSnapshotUrl: '/snapshots/bottleDreamMarks.json',
    collageSeriesSnapshotUrl: '/snapshots/bottleDreamCanvas.json',
    dataUrl: '/csv/bottleDream.csv',
    markLibUrls: ['/marks/bottleDream/1.svg', '/marks/bottleDream/2.svg', '/marks/bottleDream/3.svg', '/marks/bottleDream/4.svg', '/marks/bottleDream/5.svg', '/marks/bottleDream/6.svg'],
    containerUrls: ['/containers/bottleDream.png'],
    backgroundUrl: '/background/bottleDream.png',
  },
  {
    id: 3,
    title: 'camera',
    image: '/galleries/camera.png',
    markSnapshotUrl: '/snapshots/cameraMarks.json',
    collageSeriesSnapshotUrl: '/snapshots/cameraCanvas.json',
    dataUrl: '/csv/camera.csv',
    markLibUrls: ['/marks/camera/0.svg', '/marks/camera/1.svg', '/marks/camera/2.svg'],
    containerUrls: ['/containers/camera.png'],
    backgroundUrl: '/background/camera.png',
  },
  {
    id: 4,
    title: 'dandelion',
    image: '/galleries/dandelion.png',
    markSnapshotUrl: '/snapshots/dandelionMarks.json',
    collageSeriesSnapshotUrl: '/snapshots/dandelionCanvas.json',
    dataUrl: '/csv/dandelion.csv',
    markLibUrls: ['/marks/dandelion.svg'],
    containerUrls: ['/containers/dandelion.png'],
    backgroundUrl: '/background/dandelion.png',
  },
  {
    id: 5,
    title:'workLife',
    image: '/galleries/workLife.png',
    markSnapshotUrl: '/snapshots/workLifeMarks.json',
    collageSeriesSnapshotUrl: '/snapshots/workLifeCanvas.json',
    dataUrl: '/csv/workLife.csv',
    markLibUrls: ['/marks/workLife/1.svg', '/marks/workLife/2.svg'],
    containerUrls: ['/containers/workLife.png'],
    backgroundUrl: '/background/workLife.svg',
  },
  {
    id: 6,
    title: 'tweet',
    image: '/galleries/tweet.png',
    markSnapshotUrl: '/snapshots/tweetMarks.json',
    collageSeriesSnapshotUrl: '/snapshots/tweetCanvas.json',
    dataUrl: '/csv/tweet.csv',
    markLibUrls: ['/marks/tweet.svg'],
    containerUrls: ['/containers/tweet.png'],
    backgroundUrl: '/background/tweet.svg',
  },{
    id: 7,
    title: 'pigBank',
    image: '/galleries/pigBank.png',
    markSnapshotUrl: '/snapshots/pigBankMarks.json',
    collageSeriesSnapshotUrl: '/snapshots/pigBankCanvas.json',
    dataUrl: '/csv/pigBank.csv',
    markLibUrls: ['/marks/pigBank/1.svg', '/marks/pigBank/2.svg', '/marks/pigBank/3.svg', '/marks/pigBank/4.svg', '/marks/pigBank/5.svg'],
    containerUrls: ['/containers/pigBank.png'],
    backgroundUrl: '/background/pigBank.png',
  },{
    id: 8,
    title: 'fruit',
    image: '/galleries/fruit.png',
    markSnapshotUrl: '/snapshots/fruitMarks.json',
    collageSeriesSnapshotUrl: '/snapshots/fruitCanvas.json',
    dataUrl: '/csv/fruit.csv',
    markLibUrls: ['/marks/fruit/apple.png', '/marks/fruit/banana.png'],
    containerUrls: ['/containers/fruit.png'],
    backgroundUrl: '/background/fruit.png',
  }
]

const handleTryInEditor = (item: (typeof galleryItems)[number]) => {
  if (typeof window !== 'undefined') {
    // 将当前示例信息暂存到 localStorage，刷新后在 /editor 中恢复
    window.localStorage.setItem('unitopia-example', JSON.stringify(item))
    window.sessionStorage.setItem(EDITOR_FRESH_KEY, '1')
  }
  router.push('/editor')
}
</script>

<style scoped>
</style>

