<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  nickname: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['save'])
const draft = ref(props.nickname)

watch(
  () => props.nickname,
  (nextNickname) => {
    draft.value = nextNickname
  },
)
</script>

<template>
  <form class="panel" @submit.prevent="$emit('save', draft)">
    <h2>닉네임</h2>
    <input v-model.trim="draft" maxlength="16" placeholder="닉네임 입력" />
    <button type="submit" :disabled="draft.length < 2">저장</button>
  </form>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 10px;
  border: 2px solid #111111;
  border-radius: 14px;
  padding: 16px;
}

h2 {
  margin: 0;
}

input,
button {
  min-height: 42px;
  border: 2px solid #111111;
  border-radius: 12px;
  background: #ffffff;
  font: inherit;
  font-weight: 900;
  padding: 0 12px;
}

button {
  cursor: pointer;
}
</style>
