<script setup>
defineProps({
  room: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <section class="panel">
    <h2>플레이어</h2>
    <article v-for="player in room.players" :key="player.userId" class="player">
      <div>
        <strong>{{ player.nickname }}</strong>
        <p>{{ player.connected ? 'connected' : 'disconnected' }}</p>
      </div>
      <span v-if="player.userId === room.hostUserId">방장</span>
      <span v-else>{{ player.ready ? 'READY' : 'NOT READY' }}</span>
    </article>
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

.player {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 2px solid #111111;
  border-radius: 12px;
  padding: 12px;
}

.player p {
  color: #666666;
  font-size: 0.9rem;
}

span {
  border: 2px solid #111111;
  border-radius: 999px;
  padding: 6px 10px;
  font-weight: 900;
}
</style>
