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
          linear-gradient(to bottom, rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.85)),
          url('/piccl-hero-placeholder.jpg');"
      >
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 class="text-4xl md:text-5xl font-bold tracking-wide text-white mb-4">
            Unitopia：可视化图表创作平台
          </h1>
          <p class="max-w-3xl text-sm md:text-base text-slate-100 leading-relaxed">
            Unitopia 提供一站式的可视化创作能力，你可以通过拖拽和配置快速搭建复杂的图表与仪表盘，
            并将它们无缝集成到你的产品和数据分析工作流之中。
          </p>
        </div>
      </div>

      <!-- 下半部分：三列卡片（Unitopia 卖点） -->
      <div class="w-full h-2/5 flex items-center">
        <div class="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-8 pt-8">
          <!-- 卡片一：数据驱动图表 -->
          <article class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-[var(--border-color)] dark:border-gray-700 p-7 md:p-8 flex flex-col">
            <h2 class="text-base font-semibold mb-3 text-[var(--title-color)] dark:text-gray-50">
              数据驱动的可视化图表
            </h2>
            <p class="text-sm text-[var(--text-muted)] dark:text-gray-300 mb-5">
              通过统一的数据模型与可配置的图元系统，Unitopia 支持从简单折线图到复杂混合视图的多种图表形态。
            </p>
            <button
              class="mt-auto inline-flex items-center justify-center w-full rounded-md bg-[var(--primary-color)] text-white text-sm font-semibold py-2.5 hover:bg-[var(--primary-hover-color)] transition-colors cursor-pointer"
              @click="$router.push('/gallery')"
            >
              浏览示例
            </button>
          </article>

          <!-- 卡片二：可视化编辑器 -->
          <article class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-[var(--border-color)] dark:border-gray-700 p-7 md:p-8 flex flex-col">
            <h2 class="text-base font-semibold mb-3 text-[var(--title-color)] dark:text-gray-50">
              所见即所得的图表编辑器
            </h2>
            <p class="text-sm text-[var(--text-muted)] dark:text-gray-300 mb-5">
              使用拖拽式画布、属性面板和预设模板，无需手写大量代码即可完成图表搭建与微调。
            </p>
            <button
              class="mt-auto inline-flex items-center justify-center w-full rounded-md bg-[var(--primary-color)] text-white text-sm font-semibold py-2.5 hover:bg-[var(--primary-hover-color)] transition-colors cursor-pointer"
            >
              快速上手
            </button>
          </article>

          <!-- 卡片三：集成与扩展（点击跳转 System） -->
          <article
            class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-[var(--border-color)] dark:border-gray-700 p-7 md:p-8 flex flex-col"
          >
            <h2 class="text-base font-semibold mb-3 text-[var(--title-color)] dark:text-gray-50">
              面向开发者的灵活集成
            </h2>
            <p class="text-sm text-[var(--text-muted)] dark:text-gray-300 mb-5">
              提供 TypeScript SDK 与 REST API，支持将 Unitopia 中配置好的图表一键发布到你的前端项目或可视化服务。
            </p>
            <button
              class="mt-auto inline-flex items-center justify-center w-full rounded-md bg-[var(--primary-color)] text-white text-sm font-semibold py-2.5 hover:bg-[var(--primary-hover-color)] transition-colors cursor-pointer"
              @click.stop="$router.push('/system')"
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
import MainHeader from '~/components/MainHeader.vue'
</script>

<style scoped>
</style>

