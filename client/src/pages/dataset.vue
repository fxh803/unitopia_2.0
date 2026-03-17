<template>
  <div
    class="min-h-screen w-screen flex flex-col bg-[var(--primary-light-color)] text-[var(--title-color)] dark:bg-gray-900 dark:text-gray-100"
    style="font-family: var(--font-sans);"
  >
    <!-- 固定在顶部的 Header -->
    <div class="fixed top-0 left-0 w-full z-30">
      <MainHeader />
    </div>

    <!-- 留出 header 高度，Dataset 区域占满剩余视口且自身内部滚动 -->
    <div class="mt-16 h-[calc(100vh-4rem)] overflow-hidden">
      <DatasetGallery />
    </div>
  </div>
</template>

<script setup lang="ts">
import MainHeader from '~/otherComponents/MainHeader.vue'
import DatasetGallery from '~/otherComponents/DatasetGallery.vue'
</script>


