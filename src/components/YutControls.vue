<script setup>
defineProps({
  phase: {
    type: String,
    required: true,
  },
  currentResult: {
    type: Object,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['roll'])
</script>

<template>
  <section class="panel">
    <h2>윷 던지기</h2>
    <button class="primary" type="button" :disabled="disabled" @click="$emit('roll')">윷 던지기</button>
    <p class="result">결과: {{ currentResult?.label ?? '-' }}</p>
    <p class="muted">상태: {{ phase }}</p>
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 12px;
  border: 2px solid #111111;
  border-radius: 14px;
  background: #ffffff;
  padding: 16px;
}

h2,
p {
  margin: 0;
}

.primary {
  min-height: 48px;
  border: 2px solid #111111;
  border-radius: 12px;
  background: #111111;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 900;
}

.primary:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.result {
  font-weight: 900;
}

.muted {
  color: #666666;
  font-size: 0.9rem;
}
</style>
