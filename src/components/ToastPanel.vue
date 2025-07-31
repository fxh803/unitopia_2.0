<script setup lang="ts">
// 无需 props，直接通过事件通信
</script>

<template>
  <div class="toast-panel-overlay">
    <div class="toast-panel">
      <div class="toast-message">
        Fill the path?
      </div>
      <div class="toast-actions">
        <button class="btn-confirm" @click="$emit('confirm')">
          Confirm
        </button>
        <button class="btn-cancel" @click="$emit('cancel')">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toast-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.toast-panel {
  background: #23272e;
  color: #fff;
  padding: 24px 32px;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  min-width: 240px;
  text-align: center;
}
.toast-message {
  margin-bottom: 20px;
  font-size: 1.1em;
}
.toast-actions {
  display: flex;
  justify-content: space-around;
}
.btn-confirm,
.btn-cancel {
  padding: 6px 18px;
  border: none;
  border-radius: 6px;
  font-size: 1em;
  cursor: pointer;
}
.btn-confirm {
  background: #4ade80;
  color: #23272e;
  margin-right: 8px;
}
.btn-cancel {
  background: #f87171;
  color: #fff;
}
</style>
