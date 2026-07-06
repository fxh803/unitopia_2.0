<template>
  <article class="markdown-body" v-html="html" />
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'

const props = defineProps<{
  content: string
}>()

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

const html = computed(() => md.render(props.content))
</script>

<style scoped>
.markdown-body {
  color: var(--title-color);
  line-height: 1.75;
  font-size: 15px;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  color: var(--title-color);
  font-weight: 700;
  line-height: 1.35;
  margin: 1.6em 0 0.75em;
}

.markdown-body :deep(h1) {
  font-size: 1.875rem;
  margin-top: 0;
  padding-bottom: 0.35em;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.markdown-body :deep(h2) {
  font-size: 1.375rem;
  padding-bottom: 0.25em;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.markdown-body :deep(h3) {
  font-size: 1.125rem;
}

.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(ol),
.markdown-body :deep(table),
.markdown-body :deep(pre) {
  margin: 0 0 1em;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5em;
}

.markdown-body :deep(li + li) {
  margin-top: 0.35em;
}

.markdown-body :deep(a) {
  color: var(--primary-color);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-body :deep(a:hover) {
  opacity: 0.85;
}

.markdown-body :deep(code) {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.9em;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.06);
}

.markdown-body :deep(pre) {
  overflow-x: auto;
  padding: 1em 1.15em;
  border-radius: 8px;
  background: #1e1e2e;
  color: #e8e8f0;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
}

.markdown-body :deep(blockquote) {
  margin: 0 0 1em;
  padding: 0.5em 1em;
  border-left: 4px solid var(--primary-color);
  background: rgba(0, 0, 0, 0.03);
  color: var(--text-muted);
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95em;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0.55em 0.75em;
  text-align: left;
}

.markdown-body :deep(th) {
  background: rgba(0, 0, 0, 0.04);
  font-weight: 600;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  margin: 1.5em 0;
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

.markdown-body :deep(video) {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 1.25em 0;
  border-radius: 8px;
  background: #000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
</style>
