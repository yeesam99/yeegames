<script setup>
defineProps({
  currentPlayer: {
    type: Object,
    required: true,
  },
  phase: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  extraTurn: {
    type: Boolean,
    default: false,
  },
  captured: {
    type: Boolean,
    default: false,
  },
  winner: {
    type: Object,
    default: null,
  },
})
</script>

<template>
  <section class="status">
    <p class="eyebrow">{{ phase }}</p>
    <h1>{{ winner ? `${winner.name} 승리!` : `${currentPlayer.name}의 차례` }}</h1>
    <p>{{ message }}</p>
    <div class="badges">
      <span :class="{ on: extraTurn }">추가 턴 {{ extraTurn ? '있음' : '없음' }}</span>
      <span :class="{ on: captured }">잡기 {{ captured ? '발생' : '없음' }}</span>
    </div>
  </section>
</template>

<style scoped>
.status {
  display: grid;
  gap: 10px;
  border: 2px solid #111111;
  border-radius: 16px;
  background: #ffffff;
  padding: 18px;
}

h1,
p {
  margin: 0;
}

h1 {
  font-size: clamp(1.6rem, 4vw, 3rem);
}

.eyebrow {
  color: #666666;
  font-weight: 900;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

span {
  border: 2px solid #111111;
  border-radius: 999px;
  padding: 6px 10px;
  font-weight: 900;
}

span.on {
  background: #111111;
  color: #ffffff;
}
</style>
