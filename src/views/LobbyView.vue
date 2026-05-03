<script setup>
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import NicknameForm from '../components/lobby/NicknameForm.vue'
import RoomCreateForm from '../components/lobby/RoomCreateForm.vue'
import RoomList from '../components/lobby/RoomList.vue'
import { useLobbySocket } from '../composables/useLobbySocket'
import { useSession } from '../composables/useSession'

const router = useRouter()
const { userId, nickname, setNickname } = useSession()
const { rooms, currentRoom, errorMessage, connected, connect, joinSession, getRooms, createRoom, joinRoom } =
  useLobbySocket()

const saveNickname = (nextNickname) => {
  setNickname(nextNickname)
  joinSession()
}

const handleCreateRoom = (payload) => {
  if (!nickname.value) return
  createRoom(payload)
}

watch(currentRoom, (room) => {
  if (room?.status === 'WAITING') router.push(`/room/${room.id}`)
})

onMounted(() => {
  connect()
  if (nickname.value) joinSession()
  getRooms()
})
</script>

<template>
  <main class="lobby-shell">
    <header>
      <h1>YUT Lobby</h1>
      <p>{{ connected ? '서버 연결됨' : '서버 연결 중' }} · {{ userId.slice(0, 8) }}</p>
    </header>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <section class="lobby-layout">
      <aside class="side">
        <NicknameForm :nickname="nickname" @save="saveNickname" />
        <RoomCreateForm @create="handleCreateRoom" />
      </aside>
      <RoomList :rooms="rooms" @join="joinRoom" />
    </section>
  </main>
</template>

<style scoped>
.lobby-shell {
  min-height: 100vh;
  background: #ffffff;
  color: #111111;
  padding: 24px;
}

header {
  margin-bottom: 18px;
}

h1,
p {
  margin: 0;
}

.lobby-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
}

.side {
  display: grid;
  align-content: start;
  gap: 16px;
}

.error {
  margin-bottom: 12px;
  border: 2px solid #be123c;
  border-radius: 12px;
  background: #fff1f2;
  color: #be123c;
  padding: 10px;
  font-weight: 900;
}

@media (max-width: 800px) {
  .lobby-layout {
    grid-template-columns: 1fr;
  }
}
</style>
