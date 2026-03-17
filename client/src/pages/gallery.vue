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
import MainHeader from '~/components/MainHeader.vue'
const galleryItems = [
  {
    id: 1,
    title: 'hair',
    image: '/gallery/hair.png',
    markSnapshotUrl: '/snapshots/hairMarks.json',
    collageSeriesSnapshotUrl: '/snapshots/hairCollageSeries.json',
    dataUrl: '/csv/paralympics_2024_medal_table.csv',
    markLibUrl: '/marks/hair.svg',
    containerUrl: '/containers/hair.png',
    backgroundUrl: '/background/hair.png',
  },
]

const handleTryInEditor = (item: (typeof galleryItems)[number]) => {
  if (typeof window !== 'undefined') {
    // 将当前示例信息暂存到 localStorage，刷新后在 /editor 中恢复
    window.localStorage.setItem('unitopia-example', JSON.stringify(item))
    // 使用整页刷新进入编辑器，顺便重置所有 Pinia 状态
    window.location.href = '/editor'
  }
}
</script>

<style scoped>
</style>

