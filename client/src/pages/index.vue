<template>
  <div
    class="h-screen w-screen flex flex-col bg-[var(--primary-light-color)] text-[var(--title-color)] dark:bg-gray-900 dark:text-gray-100"
    style="font-family: var(--font-sans);"
  >
    <MainHeader />

    <!-- Hero 区域：Unitopia 上下布局 -->
    <section class="relative w-full flex-1 flex flex-col">
      <!-- 上半部分：Unitopia 背景（请将宣传图放到 src/assets 下并更新路径） -->
      <div
        class="relative h-3/5 w-full bg-cover bg-center"
        style="background-image:
          linear-gradient(to bottom, rgba(251, 191, 36, 0.8), rgba(246, 103, 108, 0.9)),
          url('/piccl-hero-placeholder.jpg');"
      >
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 class="text-4xl md:text-5xl font-bold tracking-wide text-white mb-4">
            UnitoPia: Pictorial Unit Visualization Framework
          </h1>
          <p class="max-w-3xl text-sm md:text-base text-slate-100 leading-relaxed">
            A pictorial unit visualization framework for one-to-one mapping between data units and visual elements.
          </p>
        </div>
      </div>

      <!-- 下半部分：三列卡片（Unitopia 卖点） -->
      <div class="w-full h-2/5 flex items-center">
        <div class="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-8 pt-8">
          <!-- 卡片一 -->
          <article class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-[var(--border-color)] dark:border-gray-700 p-7 md:p-8 flex flex-col">
            <h2 class="text-base font-semibold mb-3 text-[var(--title-color)] dark:text-gray-50">
              Unit Visualization at Data Granularity
            </h2>
            <p class="text-sm text-[var(--text-muted)] dark:text-gray-300 mb-5">
              Encode every data item as an individual pictorial unit for precise, story-driven visualizations.
            </p>
            <button
              class="mt-auto inline-flex items-center justify-center w-full rounded-md bg-[var(--primary-color)] text-white text-sm font-semibold py-2.5 hover:bg-[var(--primary-hover-color)] transition-colors cursor-pointer"
              @click="$router.push('/gallery')"
            >
              Browse Examples
            </button>
          </article>

          <!-- 卡片二 -->
          <article class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-[var(--border-color)] dark:border-gray-700 p-7 md:p-8 flex flex-col">
            <h2 class="text-base font-semibold mb-3 text-[var(--title-color)] dark:text-gray-50">
              Scalable Layout Engine & Integration
            </h2>
            <p class="text-sm text-[var(--text-muted)] dark:text-gray-300 mb-5">
              Automatically arrange complex pictorial units and integrate with existing analysis workflows.
            </p>
            <button
              class="mt-auto inline-flex items-center justify-center w-full rounded-md bg-[var(--primary-color)] text-white text-sm font-semibold py-2.5 hover:bg-[var(--primary-hover-color)] transition-colors cursor-pointer"
            >
              Get Started
            </button>
          </article>

          <!-- 卡片三 -->
          <article
            class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-[var(--border-color)] dark:border-gray-700 p-7 md:p-8 flex flex-col"
          >
            <h2 class="text-base font-semibold mb-3 text-[var(--title-color)] dark:text-gray-50">
              Visual Editor
            </h2>
            <p class="text-sm text-[var(--text-muted)] dark:text-gray-300 mb-5">
              Design unit visualizations interactively with marks, containers, emitters, and forces.
            </p>
            <button
              class="mt-auto inline-flex items-center justify-center w-full rounded-md bg-[var(--primary-color)] text-white text-sm font-semibold py-2.5 hover:bg-[var(--primary-hover-color)] transition-colors cursor-pointer"
              @click.stop="goEditorFresh"
            >
              Try Online
            </button>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import MainHeader from '~/otherComponents/MainHeader.vue'
 
const goEditorFresh = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/editor'
  }
}
</script>

<style scoped>
</style>

