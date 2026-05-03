<script setup>
import { ref } from 'vue'

defineEmits(['create'])

const name = ref('')
const maxPlayers = ref(2)
</script>

<template>
  <form class="panel" @submit.prevent="$emit('create', { name, maxPlayers })">
    <h2>방 만들기</h2>
    <input v-model.trim="name" maxlength="24" placeholder="방 이름" />
    <select v-model.number="maxPlayers">
      <option v-for="count in [2, 3, 4, 5]" :key="count" :value="count">{{ count }}명</option>
    </select>
    <button type="submit">방 만들기</button>
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
select,
button {
  min-height: 42px;
  border: 2px solid #111111;
  border-radius: 12px;
  background: #ffffff;
  font: inherit;
  font-weight: 900;
  padding: 0 12px;
}
</style>
