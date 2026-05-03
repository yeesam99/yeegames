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
const { currentRoom, errorMessage, connect, getRoom, joinRoom, leaveRoom, setReady, startGame } = useLobbySocket()

const me = computed(() => currentRoom.value?.players.find((player) => player.userId === userId.value))
const isHost = computed(() => currentRoom.value?.hostUserId === userId.value)
const isParticipant = computed(() =>
  Boolean(currentRoom.value?.players?.some((player) => player.userId === userId.value)),
)
const canStartGame = computed(() => {
  if (!currentRoom.value) return false
  if (!isHost.value) return false
  if (currentRoom.value.status !== 'WAITING') return false
  if (currentRoom.value.players.length < 2) return false

  const nonHostPlayers = currentRoom.value.players.filter(
    (player) => player.userId !== currentRoom.value.hostUserId,
  )

  return nonHostPlayers.every((player) => player.ready)
})
const startHint = computed(() => {
  if (!currentRoom.value || !isHost.value) return ''
  if (currentRoom.value.players.length < 2) return '2명 이상 모이면 시작할 수 있습니다.'
  if (!canStartGame.value) return '모든 참가자가 준비해야 시작할 수 있습니다.'
  return ''
})
const canJoinRoom = computed(() =>
  Boolean(
    currentRoom.value &&
      !isParticipant.value &&
      currentRoom.value.status === 'WAITING' &&
      currentRoom.value.players.length < currentRoom.value.maxPlayers,
  ),
)
const joinHint = computed(() => {
  if (!currentRoom.value || isParticipant.value) return ''
  if (currentRoom.value.status !== 'WAITING') return '이미 시작된 방이라 참가할 수 없습니다.'
  if (currentRoom.value.players.length >= currentRoom.value.maxPlayers) return '방 인원이 가득 찼습니다.'
  return '방에 참가하면 준비 상태를 변경할 수 있습니다.'
})

const logRoomDebug = () => {
  console.log('session.userId', userId.value)
  console.log('room.hostUserId', currentRoom.value?.hostUserId)
  console.log('room.players', currentRoom.value?.players)
  console.log('isHost', isHost.value)
  console.log('isParticipant', isParticipant.value)
}

onMounted(() => {
  connect()
  getRoom(roomId.value)
  logRoomDebug()
})

watch(currentRoom, (room) => {
  if (room?.status === 'PLAYING') router.push(`/game/${room.id}`)
  logRoomDebug()
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

      <template v-if="isParticipant">
        <PlayerReadyList :room="currentRoom" />

        <div class="actions">
          <button
            v-if="!isHost"
            type="button"
            @click="setReady(currentRoom.id, !me?.ready)"
          >
            {{ me?.ready ? '준비 취소' : '준비' }}
          </button>

          <div v-else class="host-actions">
            <button type="button" :disabled="!canStartGame" @click="startGame(currentRoom.id)">게임 시작</button>
            <p v-if="startHint" class="hint">{{ startHint }}</p>
          </div>
        </div>
      </template>

      <div v-else class="not-participant">
        <p>방 참가자가 아닙니다.</p>
        <p v-if="joinHint" class="hint">{{ joinHint }}</p>
        <button v-if="canJoinRoom" type="button" @click="joinRoom(currentRoom.id)">방 참가하기</button>
        <button type="button" @click="router.push('/lobby')">로비로 돌아가기</button>
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

.host-actions,
.not-participant {
  display: grid;
  gap: 10px;
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
