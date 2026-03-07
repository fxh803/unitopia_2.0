<script setup lang="ts">
import { ref } from 'vue'
import { useMarkerStore } from '~/stores/marker'
import { useContainerStore } from '~/stores/container'
import { sendUploadContainerToServer } from '~/composables/server'

const isExpanded = ref(true)

// 子分组折叠
const isMarkExpanded = ref(true)
const isContainerExpanded = ref(true)

// Mark / Container 上传相关状态
const markFileInput = ref<HTMLInputElement | null>(null)
const containerFileInput = ref<HTMLInputElement | null>(null)
const isMarkDragOver = ref(false)
const isContainerDragOver = ref(false)

const markerStore = useMarkerStore()
const containerStore = useContainerStore()

function handleMarkDragOver(e: DragEvent) {
  e.preventDefault()
  isMarkDragOver.value = true
}

function handleMarkDragLeave(e: DragEvent) {
  e.preventDefault()
  isMarkDragOver.value = false
}

async function handleMarkFiles(files: FileList | null) {
  if (!files?.length)
    return

  // 支持多选：依次处理每个文件
  for (const file of Array.from(files)) {
    // 如果是 SVG：用文本形式保存 source，缩略图仍然用 dataURL
    if (file.type === 'image/svg+xml') {
      const svgString = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (ev) => {
          resolve((ev.target?.result as string) || '')
        }
        reader.onerror = (err) => reject(err)
        reader.readAsText(file)
      })

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (ev) => {
          resolve((ev.target?.result as string) || '')
        }
        reader.onerror = (err) => reject(err)
        reader.readAsDataURL(file)
      })

      markerStore.addMarker({
        name: file.name,
        thumbnail: dataUrl,
        // source 保存 svg 源码字符串，后续在 marker 画布中用 SVG 方式加载
        source: svgString,
      })
    } else {
      // 普通位图：直接以 dataURL 形式保存
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (ev) => {
          resolve((ev.target?.result as string) || '')
        }
        reader.onerror = (err) => reject(err)
        reader.readAsDataURL(file)
      })

      markerStore.addMarker({
        name: file.name,
        thumbnail: dataUrl,
        source: dataUrl,
      })
    }
  }
}

/** 创建自定义拖拽图像内容（只显示图案，用于 ghost 跟随光标，避免浏览器强制半透明） */
function createSimpleDragImage(thumbnail: string): HTMLDivElement {
  const dragDiv = document.createElement('div')
  dragDiv.style.cssText = `
    width: 80px;
    height: 80px;
    padding: 8px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  `
  const img = document.createElement('img')
  img.src = thumbnail
  img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; border-radius: 4px;'
  dragDiv.appendChild(img)
  return dragDiv
}

function onLibraryMarkerDragStart(e: DragEvent, marker: { id: string; thumbnail?: string | null; name?: string }) {
  if (!e.dataTransfer) return
  const dragEl = e.currentTarget as HTMLElement
  const offsetX = 10
  const offsetY = 10
  const thumbnail = marker.thumbnail ?? '/default_mark.svg'

  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('library-marker-id', marker.id)

  const transparent = document.createElement('canvas')
  transparent.width = 1
  transparent.height = 1
  transparent.style.cssText = 'position:absolute;left:-9999px;top:0;'
  document.body.appendChild(transparent)
  e.dataTransfer.setDragImage(transparent, 0, 0)

  const ghost = document.createElement('div')
  ghost.style.cssText = `
    position: fixed;
    left: ${e.clientX - offsetX}px;
    top: ${e.clientY - offsetY}px;
    z-index: 2147483647;
    pointer-events: none;
    opacity: 1;
  `
  ghost.appendChild(createSimpleDragImage(thumbnail))
  document.body.appendChild(ghost)

  function moveGhost(ev: DragEvent) {
    ghost.style.left = `${ev.clientX - offsetX}px`
    ghost.style.top = `${ev.clientY - offsetY}px`
  }
  function cleanup() {
    ghost.remove()
    transparent.remove()
    dragEl.removeEventListener('drag', moveGhost)
    dragEl.removeEventListener('dragend', cleanup)
  }
  dragEl.addEventListener('drag', moveGhost)
  dragEl.addEventListener('dragend', cleanup)
}

async function handleMarkDrop(e: DragEvent) {
  e.preventDefault()
  isMarkDragOver.value = false
  const files = e.dataTransfer?.files
  await handleMarkFiles(files || null)
}

async function handleMarkFileSelect(e: Event) {
  const fileList = (e.target as HTMLInputElement).files
  await handleMarkFiles(fileList || null)
}

function handleContainerDragOver(e: DragEvent) {
  e.preventDefault()
  isContainerDragOver.value = true
}

function handleContainerDragLeave(e: DragEvent) {
  e.preventDefault()
  isContainerDragOver.value = false
}

async function handleContainerFiles(files: FileList | null) {
  if (!files?.length)
    return

  // 支持多选：依次处理每个文件
  for (const file of Array.from(files)) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        resolve((ev.target?.result as string) || '')
      }
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })

    // 经过后端处理，得到最终用于 container 的 base64（与画布上传一致）
    const processed = await sendUploadContainerToServer(base64)
    const finalBase64 = processed || base64

    containerStore.addContainer({
      name: file.name,
      thumbnail: finalBase64,
      source: finalBase64,
    })
  }
}

function onLibraryContainerDragStart(e: DragEvent, item: { id: string; thumbnail?: string | null; name?: string }) {
  if (!e.dataTransfer) return
  const dragEl = e.currentTarget as HTMLElement
  const offsetX = 10
  const offsetY = 10
  const thumbnail = item.thumbnail ?? '/default_mark.svg'

  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('library-container-id', item.id)

  const transparent = document.createElement('canvas')
  transparent.width = 1
  transparent.height = 1
  transparent.style.cssText = 'position:absolute;left:-9999px;top:0;'
  document.body.appendChild(transparent)
  e.dataTransfer.setDragImage(transparent, 0, 0)

  const ghost = document.createElement('div')
  ghost.style.cssText = `
    position: fixed;
    left: ${e.clientX - offsetX}px;
    top: ${e.clientY - offsetY}px;
    z-index: 2147483647;
    pointer-events: none;
    opacity: 1;
  `
  ghost.appendChild(createSimpleDragImage(thumbnail))
  document.body.appendChild(ghost)

  function moveGhost(ev: DragEvent) {
    ghost.style.left = `${ev.clientX - offsetX}px`
    ghost.style.top = `${ev.clientY - offsetY}px`
  }
  function cleanup() {
    ghost.remove()
    transparent.remove()
    dragEl.removeEventListener('drag', moveGhost)
    dragEl.removeEventListener('dragend', cleanup)
  }
  dragEl.addEventListener('drag', moveGhost)
  dragEl.addEventListener('dragend', cleanup)
}

async function handleContainerDrop(e: DragEvent) {
  e.preventDefault()
  isContainerDragOver.value = false
  const files = e.dataTransfer?.files
  await handleContainerFiles(files || null)
}

async function handleContainerFileSelect(e: Event) {
  const fileList = (e.target as HTMLInputElement).files
  await handleContainerFiles(fileList || null)
}

</script>

<template>
  <div class="flex flex-col h-full min-h-0 overflow-hidden bg-[var(--primary-light-color)]">
    <!-- 顶部：Libraries 标题 -->
    <div
      class="flex items-center w-full px-3 py-2 bg-[var(--primary-light-color)] hover:bg-[var(--border-color)]/10 transition-colors text-left gap-2 border-b border-[var(--border-color)]"
    >
      <button
        type="button"
        class="p-0.5 rounded hover:bg-[var(--border-color)]/20 transition-colors text-[var(--text-muted)] cursor-pointer"
        @click="isExpanded = !isExpanded"
      >
        <div
          class="w-4 h-4 flex-shrink-0 transition-transform duration-200"
          :class="isExpanded ? 'i-carbon-chevron-down' : 'i-carbon-chevron-right'"
        />
      </button>
      <span class="text-[14px] font-bold text-[var(--title-color)]">Libraries</span>
    </div>

    <!-- 内容区：占满剩余高度，内部滚动 -->
    <div
      v-show="isExpanded"
      class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-2"
    >
    <div class="space-y-3">
      <!-- Mark 子分组（占位内容已移除） -->
      <section class="bg-[var(--primary-light-color)] rounded-xl border border-[var(--border-color)] px-3 py-2">
        <!-- Mark 头部 -->
        <button
          type="button"
          class="w-full flex items-center justify-between text-left cursor-pointer"
          @click="isMarkExpanded = !isMarkExpanded"
        >
          <div class="flex items-center gap-2">
            <span
              class="w-4 h-4 flex-shrink-0 transition-transform duration-200 text-[var(--text-muted)]"
              :class="isMarkExpanded ? 'i-carbon-chevron-down' : 'i-carbon-chevron-right'"
            />
            <span class="text-[13px] font-semibold text-[var(--title-color)]">Mark</span>
          </div>
        </button>

        <!-- Mark 内容：已上传的 Mark + 上传入口 -->
        <div v-show="isMarkExpanded" class="mt-2">
          <div class="flex flex-wrap gap-3">
            <!-- 已上传 Mark 卡片 -->
            <button
              v-for="marker in markerStore.markers"
              :key="marker.id"
              type="button"
              class="group flex flex-col items-center justify-between rounded-xl bg-[var(--primary-light-color)] border border-[var(--border-color)] px-2 pt-2 pb-1 cursor-pointer w-[110px]"
              draggable="true"
              @dragstart.stop="onLibraryMarkerDragStart($event, marker)"
            >
              <div class="w-full aspect-square rounded-lg bg-[var(--primary-light-color)] flex items-center justify-center overflow-hidden">
                <img
                  v-if="marker.thumbnail"
                  :src="marker.thumbnail"
                  alt=""
                  class="w-full h-full object-contain"
                >
              </div>
              <span class="mt-1 text-[11px] text-[var(--text-muted)] truncate w-full text-center">
                {{ marker.name || 'Marker' }}
              </span>
            </button>

            <!-- 上传 / 拖拽入口 -->
            <button
              type="button"
              class="flex flex-col items-center justify-between rounded-xl border-2 border-dashed px-2 pt-2 pb-1 cursor-pointer transition-colors w-[110px]"
              :class="isMarkDragOver ? 'border-[var(--primary-color)] bg-[var(--border-color)]/10' : 'border-[var(--border-color)] hover:border-[var(--text-muted-light)] bg-[var(--primary-light-color)]'"
              @dragover.stop.prevent="handleMarkDragOver"
              @dragleave.stop.prevent="handleMarkDragLeave"
              @drop.stop.prevent="handleMarkDrop"
              @click="markFileInput?.click()"
            >
              <div class="w-full aspect-square rounded-lg flex items-center justify-center">
                <span class="i-carbon-add-alt text-xl text-[var(--text-muted)]" />
              </div>
              <span class="mt-1 text-[11px] text-[var(--text-muted)] truncate w-full text-center">
                upload Mark
              </span>
              <input
                ref="markFileInput"
                type="file"
                class="hidden"
                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                multiple
                @change="handleMarkFileSelect"
              />
            </button>
          </div>
        </div>
      </section>

      <!-- Container 子分组（占位内容已移除） -->
      <section class="bg-[var(--primary-light-color)] rounded-xl border border-[var(--border-color)] px-3 py-2">
        <!-- Container 头部 -->
        <button
          type="button"
          class="w-full flex items-center justify-between text-left cursor-pointer"
          @click="isContainerExpanded = !isContainerExpanded"
        >
          <div class="flex items-center gap-2">
            <span
              class="w-4 h-4 flex-shrink-0 transition-transform duration-200 text-[var(--text-muted)]"
              :class="isContainerExpanded ? 'i-carbon-chevron-down' : 'i-carbon-chevron-right'"
            />
            <span class="text-[13px] font-semibold text-[var(--title-color)]">Container</span>
          </div>
        </button>

        <!-- Container 内容：已上传的 Container + 上传入口 -->
        <div v-show="isContainerExpanded" class="mt-2">
          <div class="flex flex-wrap gap-3">
            <!-- 已上传 Container 卡片 -->
            <button
              v-for="item in containerStore.containers"
              :key="item.id"
              type="button"
              class="group flex flex-col items-center justify-between rounded-xl bg-[var(--primary-light-color)] border border-[var(--border-color)] px-2 pt-2 pb-1 cursor-pointer w-[110px]"
              draggable="true"
              @dragstart.stop="onLibraryContainerDragStart($event, item)"
            >
              <div class="w-full aspect-square rounded-lg bg-[var(--primary-light-color)] flex items-center justify-center overflow-hidden">
                <img
                  v-if="item.thumbnail"
                  :src="item.thumbnail"
                  alt=""
                  class="w-full h-full object-contain"
                >
              </div>
              <span class="mt-1 text-[11px] text-[var(--text-muted)] truncate w-full text-center">
                {{ item.name }}
              </span>
            </button>

            <!-- 上传 / 拖拽入口 -->
            <button
              type="button"
              class="flex flex-col items-center justify-between rounded-xl border-2 border-dashed px-2 pt-2 pb-1 cursor-pointer transition-colors w-[110px]"
              :class="isContainerDragOver ? 'border-[var(--primary-color)] bg-[var(--border-color)]/10' : 'border-[var(--border-color)] hover:border-[var(--text-muted-light)] bg-[var(--primary-light-color)]'"
              @dragover.stop.prevent="handleContainerDragOver"
              @dragleave.stop.prevent="handleContainerDragLeave"
              @drop.stop.prevent="handleContainerDrop"
              @click="containerFileInput?.click()"
            >
              <div class="w-full aspect-square rounded-lg flex items-center justify-center">
                <span class="i-carbon-add-alt text-xl text-[var(--text-muted)]" />
              </div>
              <span class="mt-1 text-[11px] text-[var(--text-muted)] truncate w-full text-center">
                upload Container
              </span>
              <input
                ref="containerFileInput"
                type="file"
                class="hidden"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                multiple
                @change="handleContainerFileSelect"
              />
            </button>
          </div>
        </div>
      </section>

    </div>
    </div>
  </div>
</template>
