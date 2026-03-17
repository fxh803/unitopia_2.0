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
            UnitoPia：图像化单元可视化框架
          </h1>
          <p class="max-w-3xl text-sm md:text-base text-slate-100 leading-relaxed">
            UnitoPia 面向单元可视化（unit visualization），以“逐个数据单元、一一对应”为核心，
            支持用丰富的图像元素和灵活布局来表达数据故事，让每一个数据点都保持清晰身份与语义。
          </p>
        </div>
      </div>

      <!-- 下半部分：三列卡片（Unitopia 卖点） -->
      <div class="w-full h-2/5 flex items-center">
        <div class="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-8 pt-8">
          <!-- 卡片一 -->
          <article class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-[var(--border-color)] dark:border-gray-700 p-7 md:p-8 flex flex-col">
            <h2 class="text-base font-semibold mb-3 text-[var(--title-color)] dark:text-gray-50">
              面向数据粒度的单元可视化
            </h2>
            <p class="text-sm text-[var(--text-muted)] dark:text-gray-300 mb-5">
              采用一对一的数据编码方式，每个可视元素对应一个数据项，兼顾数据精细粒度与整体构成，
              适合讲述组合结构、群体分布以及数据故事。
            </p>
            <button
              class="mt-auto inline-flex items-center justify-center w-full rounded-md bg-[var(--primary-color)] text-white text-sm font-semibold py-2.5 hover:bg-[var(--primary-hover-color)] transition-colors cursor-pointer"
              @click="$router.push('/gallery')"
            >
              浏览示例
            </button>
          </article>

          <!-- 卡片二 -->
          <article class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-[var(--border-color)] dark:border-gray-700 p-7 md:p-8 flex flex-col">
            <h2 class="text-base font-semibold mb-3 text-[var(--title-color)] dark:text-gray-50">
              可扩展的布局引擎与集成能力
              
            </h2>
            <p class="text-sm text-[var(--text-muted)] dark:text-gray-300 mb-5">
              基于可微渲染（differentiable rendering）的图像空间布局方法，自动求解复杂图像单元的排布，
              预留 SDK / API 接口，通过python库接入现有可视分析与叙事可视化工作流。
            </p>
            <button
              class="mt-auto inline-flex items-center justify-center w-full rounded-md bg-[var(--primary-color)] text-white text-sm font-semibold py-2.5 hover:bg-[var(--primary-hover-color)] transition-colors cursor-pointer"
            >
              快速上手
            </button>
          </article>

          <!-- 卡片三 -->
          <article
            class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-[var(--border-color)] dark:border-gray-700 p-7 md:p-8 flex flex-col"
          >
            <h2 class="text-base font-semibold mb-3 text-[var(--title-color)] dark:text-gray-50">
              图形编辑系统
            </h2>
            <p class="text-sm text-[var(--text-muted)] dark:text-gray-300 mb-5">
              以“容器-填充”的物理隐喻建模，将单元可视化拆分为标记（mark）、容器（container）、
              发射源（emitter）和力场（force）四个概念，并提供图形化编辑视图创作。
            </p>
            <button
              class="mt-auto inline-flex items-center justify-center w-full rounded-md bg-[var(--primary-color)] text-white text-sm font-semibold py-2.5 hover:bg-[var(--primary-hover-color)] transition-colors cursor-pointer"
              @click.stop="goEditorFresh"
            >
              在线体验
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

