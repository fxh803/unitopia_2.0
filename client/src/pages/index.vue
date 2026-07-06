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
              class="try-online-btn mt-8 inline-flex items-center gap-1 rounded-lg bg-[#f6d767] px-6 py-2.5 text-base font-semibold text-[#5c4314] shadow-[0_6px_16px_rgba(246,215,103,0.5)] cursor-pointer"
              @click.stop="goEditorFresh"
            >
              Try Online
              <span class="try-online-btn__arrow" aria-hidden="true">&gt;&gt;</span>
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

.try-online-btn {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.4s ease,
    background-color 0.25s ease;
}

.try-online-btn::before {
  content: '';
  position: absolute;
  inset: -40% -60%;
  background: linear-gradient(
    105deg,
    transparent 38%,
    rgba(255, 255, 255, 0.65) 50%,
    transparent 62%
  );
  transform: translateX(-120%) skewX(-12deg);
  transition: transform 0.65s ease;
  pointer-events: none;
  z-index: 0;
}

.try-online-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0;
  box-shadow: 0 0 0 0 rgba(246, 215, 103, 0.7);
  transition: opacity 0.35s ease;
  pointer-events: none;
  z-index: -1;
}

.try-online-btn:hover {
  transform: translateY(-4px) scale(1.05);
  background-color: #efca4b;
  box-shadow:
    0 14px 32px rgba(246, 215, 103, 0.55),
    0 0 28px rgba(239, 202, 75, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  animation: try-online-glow 1.6s ease-in-out infinite;
}

.try-online-btn:hover::before {
  transform: translateX(120%) skewX(-12deg);
}

.try-online-btn:hover::after {
  opacity: 1;
}

.try-online-btn:active {
  transform: translateY(-1px) scale(1.02);
  transition-duration: 0.12s;
}

.try-online-btn__arrow {
  display: inline-block;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.try-online-btn:hover .try-online-btn__arrow {
  transform: translateX(8px);
}

@keyframes try-online-glow {
  0%,
  100% {
    box-shadow:
      0 14px 32px rgba(246, 215, 103, 0.55),
      0 0 28px rgba(239, 202, 75, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.35);
  }

  50% {
    box-shadow:
      0 16px 36px rgba(246, 215, 103, 0.65),
      0 0 40px rgba(255, 220, 90, 0.55),
      inset 0 1px 0 rgba(255, 255, 255, 0.45);
  }
}

@media (prefers-reduced-motion: reduce) {
  .try-online-btn,
  .try-online-btn::before,
  .try-online-btn__arrow {
    transition: none;
    animation: none;
  }

  .try-online-btn:hover {
    transform: none;
    background-color: #efca4b;
  }

  .try-online-btn:hover .try-online-btn__arrow {
    transform: none;
  }
}
</style>

