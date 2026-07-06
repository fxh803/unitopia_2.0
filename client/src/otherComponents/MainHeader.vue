<template>
  <header
    class="sticky top-0 z-50 w-full h-16 flex items-center justify-between px-10 py-4 shadow-sm bg-white/95 backdrop-blur dark:bg-gray-900/95"
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
      <button
        class="hover:text-[var(--primary-color)] transition-colors cursor-pointer"
        @click="goToGetStarted"
      >
        Get Started
      </button>
      <button class="hover:text-[var(--primary-color)] transition-colors cursor-pointer" @click="goToDataset">
        Datasets
      </button>
      <button
        class="hover:text-[var(--primary-color)] transition-colors cursor-pointer"
        @click="goToUserStudy"
      >
        User Study
      </button>
      <button
        class="hover:text-[var(--primary-color)] transition-colors cursor-pointer"
        @click="goToPaper"
      >
        Paper
      </button>
    </nav>

    <div class=" flex items-center gap-5">
      <a
        href="https://github.com/fxh803/UnitoPia"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center hover:text-[var(--text-muted)] transition-colors"
        aria-label="Source Code"
      >
        <span class="i-carbon:logo-github text-3xl" aria-hidden="true" />
      </a>
      <button
        class="inline-flex items-center rounded-full border border-[var(--primary-color)] px-4 py-1.5 text-sm font-semibold text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white transition-colors cursor-pointer"
        @click="goEditorFresh"
      >
        Try Online
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
const EDITOR_FRESH_KEY = 'unitopia-editor-fresh-once'

const navigateByBrowser = (path: string) => {
  if (typeof window === 'undefined')
    return
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const currentPath = window.location.pathname
  const documentPath = currentPath.endsWith('index.html')
    ? currentPath
    : `${currentPath.replace(/\/$/, '')}/index.html`
  window.location.assign(`${window.location.origin}${documentPath}#${normalizedPath}`)
}

const goHome = () => {
  navigateByBrowser('/')
}

const goToGallery = () => {
  navigateByBrowser('/gallery')
}

const goToDataset = () => {
  navigateByBrowser('/dataset')
}

const goToUserStudy = () => {
  navigateByBrowser('/userstudy')
}

const goToGetStarted = () => {
  navigateByBrowser('/getStarted')
}

const goToPaper = () => {
  navigateByBrowser('/paper')
}

const goEditorFresh = () => {
  if (typeof window !== 'undefined')
    window.sessionStorage.setItem(EDITOR_FRESH_KEY, '1')
  navigateByBrowser('/editor')
}
</script>

<style scoped>
</style>

