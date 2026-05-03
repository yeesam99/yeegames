<script setup>
import RoomCard from './RoomCard.vue'

defineProps({
  rooms: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['join'])
</script>

<template>
  <section class="panel">
    <h2>방 목록</h2>
    <p v-if="rooms.length === 0" class="muted">아직 방이 없습니다.</p>
    <RoomCard v-for="room in rooms" :key="room.id" :room="room" @join="$emit('join', $event)" />
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 10px;
  border: 2px solid #111111;
  border-radius: 14px;
  padding: 16px;
}

h2,
p {
  margin: 0;
}

.muted {
  color: #666666;
}
</style>
