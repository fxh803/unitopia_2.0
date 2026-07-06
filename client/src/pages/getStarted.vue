<template>
  <div
    class="min-h-screen w-screen flex flex-col bg-[var(--primary-light-color)] text-[var(--title-color)] dark:bg-gray-900 dark:text-gray-100"
    style="font-family: var(--font-sans);"
  >
    <MainHeader />

    <main class="flex-1 w-full max-w-5xl mx-auto px-4 py-10">
      <MarkdownView :content="getStartedContent" />
    </main>
  </div>
</template>

<script setup lang="ts">
import getStartedContent from '~/content/getStarted.md?raw'
import MainHeader from '~/otherComponents/MainHeader.vue'
import MarkdownView from '~/otherComponents/MarkdownView.vue'
</script>
