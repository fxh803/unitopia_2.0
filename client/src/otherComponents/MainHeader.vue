<template>
  <header
    class="w-full h-16 flex items-center justify-between px-10 py-4 shadow-sm bg-white/95 backdrop-blur dark:bg-gray-900/95"
  >
    <div class="flex items-center space-x-2">
      <span class="text-2xl font-bold tracking-wide text-[var(--title-color)]">UnitoPia</span>
    </div>

    <nav class="hidden md:flex items-center space-x-8 text-sm font-medium text-[var(--text-muted)] dark:text-gray-300">
      <button
        class="hover:text-[var(--primary-color)] transition-colors cursor-pointer"
        @click="goHome"
      >
        Home
      </button>
      <button
        class="hover:text-[var(--primary-color)] transition-colors cursor-pointer"
        @click="goToGallery"
      >
        Gallery
      </button>
      <button class="hover:text-[var(--primary-color)] transition-colors cursor-pointer">
        Get Started
      </button>
      <button class="hover:text-[var(--primary-color)] transition-colors cursor-pointer" @click="goToDataset">
        Datasets
      </button>
      <button class="hover:text-[var(--primary-color)] transition-colors cursor-pointer">
        User Study
      </button>
      <button class="hover:text-[var(--primary-color)] transition-colors cursor-pointer">
        Paper
      </button>
      <button class="hover:text-[var(--primary-color)] transition-colors cursor-pointer">
        Source Code
      </button>
    </nav>

    <button
      class="ml-6 inline-flex items-center rounded-full border border-[var(--primary-color)] px-4 py-1.5 text-sm font-semibold text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white transition-colors cursor-pointer"
      @click="goEditorFresh"
    >
      Try Online
    </button>
  </header>
</template>

<script setup lang="ts">
const goHome = () => {
  if (typeof window !== 'undefined') window.location.href = '/'
}

const goToGallery = () => {
  if (typeof window !== 'undefined') window.location.href = '/gallery'
}

const goToDataset = () => {
  if (typeof window !== 'undefined') window.location.href = '/dataset'
}

const goEditorFresh = () => {
  if (typeof window !== 'undefined') window.location.href = '/editor'
}
</script>

<style scoped>
</style>

