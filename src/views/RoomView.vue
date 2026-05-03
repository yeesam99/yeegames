<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PlayerReadyList from '../components/lobby/PlayerReadyList.vue'
import { useLobbySocket } from '../composables/useLobbySocket'
import { useSession } from '../composables/useSession'

const route = useRoute()
const router = useRouter()
const roomId = computed(() => route.params.roomId)
const { userId, nickname } = useSession()
const { currentRoom, errorMessage, connect, getRoom, leaveRoom, setReady, startGame } = useLobbySocket()

const me = computed(() => currentRoom.value?.players.find((player) => player.userId === userId.value))
const isHost = computed(() => currentRoom.value?.hostUserId === userId.value)
const allPlayersReady = computed(() =>
  Boolean(
    currentRoom.value &&
      currentRoom.value.players.length >= 2 &&
      currentRoom.value.players
        .filter((player) => player.userId !== currentRoom.value.hostUserId)
        .every((player) => player.ready),
  ),
)
const canStart = computed(() => Boolean(isHost.value && allPlayersReady.value && currentRoom.value?.status === 'WAITING'))

onMounted(() => {
  connect()
  getRoom(roomId.value)
})

watch(currentRoom, (room) => {
  if (room?.status === 'PLAYING') router.push(`/game/${room.id}`)
})
</script>

<template>
  <main class="room-shell">
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <section v-if="currentRoom" class="room-card">
      <header>
        <div>
          <h1>{{ currentRoom.name }}</h1>
          <p>{{ currentRoom.players.length }} / {{ currentRoom.maxPlayers }}명 · {{ currentRoom.status }}</p>
        </div>
        <button type="button" @click="leaveRoom(currentRoom.id)">나가기</button>
      </header>

      <PlayerReadyList :room="currentRoom" />

      <div class="actions">
        <button
          v-if="!isHost"
          type="button"
          @click="setReady(currentRoom.id, !me?.ready)"
        >
          {{ me?.ready ? '준비 취소' : '준비' }}
        </button>
        <button v-if="isHost" type="button" :disabled="!canStart" @click="startGame(currentRoom.id)">게임 시작</button>
      </div>

      <p class="hint">방장: {{ currentRoom.hostUserId === userId ? nickname : currentRoom.players.find((player) => player.userId === currentRoom.hostUserId)?.nickname }}</p>
    </section>
  </main>
</template>

<style scoped>
.room-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #ffffff;
  color: #111111;
  padding: 24px;
}

.room-card {
  display: grid;
  width: min(720px, 100%);
  gap: 16px;
}

header,
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h1,
p {
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
  padding: 0 14px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.error {
  border: 2px solid #be123c;
  border-radius: 12px;
  color: #be123c;
  padding: 10px;
}

.hint {
  color: #666666;
  font-weight: 800;
}
</style>
