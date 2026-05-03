<script setup>
defineProps({
  room: {
    type: Object,
    required: true,
  },
})

defineEmits(['join'])
</script>

<template>
  <article class="room-card">
    <div>
      <h3>{{ room.name }}</h3>
      <p>{{ room.players.length }} / {{ room.maxPlayers }}명</p>
    </div>
    <span class="status">{{ room.status }}</span>
    <button type="button" :disabled="room.status !== 'WAITING' || room.players.length >= room.maxPlayers" @click="$emit('join', room.id)">
      참가
    </button>
  </article>
</template>

<style scoped>
.room-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  border: 2px solid #111111;
  border-radius: 14px;
  padding: 14px;
}

h3,
p {
  margin: 0;
}

.status {
  border: 2px solid #111111;
  border-radius: 999px;
  padding: 6px 10px;
  font-weight: 900;
}

button {
  min-height: 38px;
  border: 2px solid #111111;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 900;
  padding: 0 12px;
}
</style>
