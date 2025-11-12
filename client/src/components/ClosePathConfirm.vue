<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

interface Props {
  confirmState: {
    show: boolean
    path: any
    position: { x: number; y: number }
  }
  onConfirm: (confirmed: boolean) => void
}

const props = defineProps<Props>()

const triggerButtonRef = ref<HTMLElement>()

const handleConfirm = () => {
  props.onConfirm(true)
}

const handleCancel = () => {
  props.onConfirm(false)
}

const handleHide = () => {
  // 当 popconfirm 隐藏时（包括点击外部关闭），重置状态
  if (props.confirmState.show) {
    props.onConfirm(false)
  }
}

// 监听显示状态，自动触发 popconfirm
watch(() => props.confirmState.show, async (show) => {
  if (show) {
    await nextTick()
    // 触发按钮点击以显示 popconfirm
    if (triggerButtonRef.value) {
      triggerButtonRef.value.click()
    }
  }
})
</script>

<template>
  <teleport to="body">
    <div
      v-if="confirmState.show"
      :style="{
        position: 'fixed',
        left: `${confirmState.position.x}px`,
        top: `${confirmState.position.y + 30}px`,
        zIndex: 10000
      }"
    >
      <el-popconfirm
        title="是否闭合路径？"
        confirm-button-text="是"
        cancel-button-text="否"
        @confirm="handleConfirm"
        @cancel="handleCancel"
        @hide="handleHide"
      >
        <template #reference>
          <button
            ref="triggerButtonRef"
            style="
              width: 1px;
              height: 1px;
              opacity: 0;
              pointer-events: none;
              position: absolute;
            "
          ></button>
        </template>
      </el-popconfirm>
    </div>
  </teleport>
</template>

