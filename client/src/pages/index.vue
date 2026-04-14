<template>
  <div
    class="h-screen w-screen flex flex-col bg-[#f8f7f4] text-[var(--title-color)] dark:bg-gray-900 dark:text-gray-100"
    style="font-family: var(--font-sans);"
  >
    <MainHeader />

    <section class="relative w-full flex-1 overflow-hidden">
      <div class="absolute inset-0 hero-bg" />
      <div class="relative z-10 h-full w-full flex items-center justify-center px-8">
        <div class="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <div class="w-full lg:w-auto flex justify-center">
            <div
              class="rounded-[34px] bg-white/55 backdrop-blur-[2px] shadow-[0_16px_45px_rgba(0,0,0,0.12)] border border-white/50 p-4"
            >
              <img
                src="/favicon.svg"
                alt="UnitoPia Logo"
                class="w-[220px] h-[160px]  object-contain"
              >
              <p class="text-center text-[52px] leading-none text-[#4a4a4a] unitopia-wordmark transform translate-y-[-10px]">
                unitopia
              </p>
            </div>
          </div>

          <div class="w-full max-w-[800px] text-center lg:text-left">
            <h1 class="text-[44px] md:text-[58px] leading-[1.2] font-medium tracking-[0.01em] text-[#2f2d37]">
              The Easy Creating Tool for
              <br>
              Pictorial Unit Visualization
            </h1>
            <p class="mt-5 text-base md:text-lg italic text-[#53505f]/80">
              Pictorial Unit Visualization, Made Easy
            </p>
            <button
              class="mt-8 inline-flex items-center rounded-lg bg-[#f6d767] px-6 py-2.5 text-base font-semibold text-[#5c4314] shadow-[0_6px_16px_rgba(246,215,103,0.5)] hover:bg-[#efca4b] transition-colors cursor-pointer"
              @click.stop="goEditorFresh"
            >
              Try Online >>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import MainHeader from '~/otherComponents/MainHeader.vue'
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

const goEditorFresh = () => {
  if (typeof window !== 'undefined')
    window.sessionStorage.setItem(EDITOR_FRESH_KEY, '1')
  navigateByBrowser('/editor')
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Kirang+Haerang&display=swap');

.hero-bg {
  background:
    radial-gradient(circle at 60% 48%, rgba(249, 82, 91, 0.5) 0%, rgba(249, 82, 91, 0.16) 26%, transparent 46%),
    radial-gradient(circle at 21% 42%, rgba(170, 232, 189, 0.72) 0%, transparent 36%),
    radial-gradient(circle at 86% 32%, rgba(205, 233, 242, 0.64) 0%, transparent 35%),
    radial-gradient(circle at 77% 80%, rgba(249, 196, 196, 0.5) 0%, transparent 42%),
    #f7f5f1;
}

.unitopia-wordmark {
  font-family: 'Kirang Haerang', 'Comic Sans MS', cursive;
}
</style>

