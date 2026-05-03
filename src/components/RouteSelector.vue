<script setup>
defineProps({
  options: {
    type: Array,
    default: () => [],
  },
  visible: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['select'])

const labels = {
  outer: '바깥길',
  shortcutA: '첫 번째 지름길',
  shortcutB: '두 번째 지름길',
  center: '중앙 경로',
}
</script>

<template>
  <section v-if="visible" class="panel">
    <h2>경로 선택</h2>
    <button v-for="option in options" :key="option" type="button" @click="$emit('select', option)">
      {{ labels[option] ?? option }}
    </button>
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 8px;
  border: 2px solid #111111;
  border-radius: 14px;
  background: #ffffff;
  padding: 16px;
}

h2 {
  margin: 0;
}

button {
  min-height: 42px;
  border: 2px solid #111111;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 900;
}
</style>
