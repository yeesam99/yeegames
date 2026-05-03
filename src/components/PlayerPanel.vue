<script setup>
defineProps({
  players: {
    type: Array,
    required: true,
  },
  currentPlayerId: {
    type: Number,
    required: true,
  },
})

const finishedCount = (player) => player.pieces.filter((piece) => piece.status === 'FINISHED').length
</script>

<template>
  <section class="panel">
    <h2>플레이어</h2>
    <article v-for="player in players" :key="player.id" class="player" :class="{ active: player.id === currentPlayerId }">
      <div class="player-title">
        <i :style="{ background: player.color }"></i>
        <strong>{{ player.name }}</strong>
      </div>
      <span>완주 {{ finishedCount(player) }} / 4</span>
    </article>
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 10px;
  border: 2px solid #111111;
  border-radius: 14px;
  background: #ffffff;
  padding: 16px;
}

h2 {
  margin: 0;
}

.player {
  display: grid;
  gap: 6px;
  border: 2px solid #111111;
  border-radius: 12px;
  padding: 10px;
}

.player.active {
  background: #f4f4f5;
}

.player-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

i {
  width: 14px;
  height: 14px;
  border: 2px solid #111111;
  border-radius: 999px;
}

span {
  color: #666666;
  font-weight: 800;
}
</style>
