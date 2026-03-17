<template>
  <Teleport to="body">
    <div
      v-if="image"
      id="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      :style="overlayStyle"
      @click="handleClose"
    >
      <div
        :style="containerStyle"
        @click.stop
      >
        <!-- 图片区域 -->
        <div :style="imageAreaStyle">
          <img
            :src="image.url"
            :alt="`Visualization ${image.id}`"
            :style="imageStyle"
          />
        </div>

        <!-- 信息区域 -->
        <div :style="infoAreaStyle">
          <div :style="headerRowStyle">
            <h3 :style="titleStyle">
              ID: {{ image.id }}
            </h3>
            <span :style="frTagStyle">
              {{ image.fr }}
            </span>
          </div>

          <div style="margin-bottom: 12px;">
            <strong style="color: #374151;">Element Design:</strong>
            <template v-if="elementDesignTags.length">
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;">
                <span
                  v-for="(tag, index) in elementDesignTags"
                  :key="index"
                  :style="chipStyle"
                >
                  {{ tag }}
                </span>
              </div>
            </template>
            <template v-else>
              <div style="color: #9ca3af; margin-top: 4px; font-style: italic;">
                No element design tags
              </div>
            </template>
          </div>

          <div style="margin-bottom: 12px;">
            <strong style="color: #374151;">Visual Layout:</strong>
            <template v-if="visualLayoutTags.length">
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;">
                <span
                  v-for="(tag, index) in visualLayoutTags"
                  :key="index"
                  :style="chipStyle"
                >
                  {{ tag }}
                </span>
              </div>
            </template>
            <template v-else>
              <div style="color: #9ca3af; margin-top: 4px; font-style: italic;">
                No visual layout tags
              </div>
            </template>
          </div>

          <div>
            <strong style="color: #374151;">Source:</strong>
            <p style="margin: 4px 0 0 0;">
              <a
                :href="image.source"
                target="_blank"
                rel="noopener noreferrer"
                :style="linkStyle"
                @mouseenter="onLinkEnter"
                @mouseleave="onLinkLeave"
              >
                {{ image.source }}
              </a>
            </p>
          </div>
        </div>

        <!-- 关闭按钮 -->
        <button
          aria-label="Close lightbox"
          :style="closeButtonStyle"
          @click="handleClose"
          @mouseenter="onCloseEnter"
          @mouseleave="onCloseLeave"
        >
          ✕
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'

interface ImageItem {
  id: string
  url: string
  element_design: {
    shapes: {
      regular: string
      irregular: string
    }
    patterns: {
      geometric_repetitive: string
      non_repetitive: string
    }
  }
  visual_layout: {
    regularity: {
      restrict_rule_based: string
      organic_natural_structure: string
    }
    representation: {
      metaphor_based_composition: string
      abstract_boundary: string
    }
  }
  source: string
  fr: string
}

const props = defineProps<{
  image: ImageItem | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const handleClose = () => {
  emit('close')
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose()
  }
}

let prevOverflow = ''

const enable = () => {
  prevOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKeyDown)
}

const disable = () => {
  document.removeEventListener('keydown', onKeyDown)
  document.body.style.overflow = prevOverflow
}

watch(
  () => props.image,
  (val) => {
    if (val) {
      enable()
    } else {
      disable()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  disable()
})

const elementDesignTags = computed(() => {
  const tags: string[] = []
  const el = props.image?.element_design
  if (!el) return tags
  if (el.shapes?.regular) tags.push(el.shapes.regular)
  if (el.shapes?.irregular) tags.push(el.shapes.irregular)
  if (el.patterns?.geometric_repetitive) tags.push(el.patterns.geometric_repetitive)
  if (el.patterns?.non_repetitive) tags.push(el.patterns.non_repetitive)
  return tags.filter(t => t.trim() !== '')
})

const visualLayoutTags = computed(() => {
  const tags: string[] = []
  const vl = props.image?.visual_layout
  if (!vl) return tags
  if (vl.regularity?.restrict_rule_based) tags.push(vl.regularity.restrict_rule_based)
  if (vl.regularity?.organic_natural_structure) tags.push(vl.regularity.organic_natural_structure)
  if (vl.representation?.metaphor_based_composition) tags.push(vl.representation.metaphor_based_composition)
  if (vl.representation?.abstract_boundary) tags.push(vl.representation.abstract_boundary)
  return tags.filter(t => t.trim() !== '')
})

const overlayStyle = {
  position: 'fixed',
  inset: '0',
  zIndex: 9999,
  backgroundColor: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  backdropFilter: 'blur(5px)'
} as const

const containerStyle = {
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  overflow: 'hidden',
  width: 'auto',
  height: 'auto',
  maxWidth: '90vw',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative'
} as const

const imageAreaStyle = {
  padding: '30px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f8f9fa'
} as const

const imageStyle = {
  maxWidth: '60vw',
  maxHeight: '40vh',
  objectFit: 'contain',
  display: 'block',
  borderRadius: '4px'
} as const

const infoAreaStyle = {
  padding: '24px',
  fontSize: '14px',
  lineHeight: 1.6,
  borderTop: '1px solid #e5e7eb'
} as const

const headerRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '16px'
} as const

const titleStyle = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#1f2937',
  margin: 0
} as const

const frTagStyle = {
  backgroundColor: '#e5e7eb',
  color: '#4b5563',
  borderRadius: '16px',
  padding: '4px 12px',
  fontSize: '12px',
  fontWeight: 500
} as const

const chipStyle = {
  backgroundColor: '#f3f4f6',
  color: '#4b5563',
  borderRadius: '4px',
  padding: '2px 8px',
  fontSize: '12px'
} as const

const linkStyle: Record<string, string> = {
  color: '#2563eb',
  textDecoration: 'none',
  wordBreak: 'break-all'
}

const closeButtonStyle: Record<string, string | number> = {
  position: 'absolute',
  top: '30px',
  right: '30px',
  width: '40px',
  height: '40px',
  backgroundColor: 'rgba(255,255,255,0.95)',
  color: '#374151',
  fontWeight: 'bold',
  fontSize: '1.2rem',
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  transition: 'all 0.2s ease',
  transform: 'scale(1)'
}

const onLinkEnter = (e: MouseEvent) => {
  (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'
}

const onLinkLeave = (e: MouseEvent) => {
  (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'
}

const onCloseEnter = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLButtonElement
  el.style.backgroundColor = '#ef4444'
  el.style.color = 'white'
  el.style.transform = 'scale(1.1)'
}

const onCloseLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLButtonElement
  el.style.backgroundColor = 'rgba(255,255,255,0.95)'
  el.style.color = '#374151'
  el.style.transform = 'scale(1)'
}
</script>

