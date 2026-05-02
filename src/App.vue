<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { io, type Socket } from 'socket.io-client'

type Player = {
  id: string
  nickname: string
  isHost: boolean
  color: string
}

type RouteName = 'outer' | 'shortcutA' | 'shortcutB' | 'shortcutC'

type YutMove = {
  id: string
  name: 'backdo' | 'do' | 'gae' | 'geol' | 'yut' | 'mo'
  label: string
  steps: -1 | 1 | 2 | 3 | 4 | 5
  grantsExtraTurn: boolean
}

type YutPiece = {
  id: string
  playerId: string
  index: number
  route: RouteName
  position: number
  state: 'home' | 'active' | 'finished'
}

type GameState = {
  status: 'waiting' | 'ready' | 'playing' | 'finished'
  maxPlayers: number
  players: Player[]
  turn: {
    playerIndex: number
    currentPlayerId: string | null
    pendingMoves: YutMove[]
    extraTurnCount: number
    mustThrow: boolean
    legalMoves: Record<string, string[]>
  }
  board: {
    routes: Record<RouteName, string[]>
    pieces: YutPiece[]
  }
  lastAction: {
    type: string
    message: string
    at: string
  } | null
  winnerPlayerId: string | null
  updatedAt: string
}

type RoomPayload = {
  code: string
  hostId: string
  players: Player[]
  gameState: GameState
}

type ServerResponse<T = unknown> = {
  ok: boolean
  error?: string
} & T

type BoardPoint = {
  x: number
  y: number
}

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'
const CANVAS_SIZE = 720
const PIECE_RADIUS = 13

const pointByKey: Record<string, BoardPoint> = {
  O0: { x: 610, y: 610 },
  O1: { x: 500, y: 610 },
  O2: { x: 390, y: 610 },
  O3: { x: 280, y: 610 },
  O4: { x: 170, y: 610 },
  O5: { x: 90, y: 610 },
  O6: { x: 90, y: 500 },
  O7: { x: 90, y: 390 },
  O8: { x: 90, y: 280 },
  O9: { x: 90, y: 170 },
  O10: { x: 90, y: 90 },
  O11: { x: 200, y: 90 },
  O12: { x: 310, y: 90 },
  O13: { x: 420, y: 90 },
  O14: { x: 530, y: 90 },
  O15: { x: 610, y: 90 },
  O16: { x: 610, y: 200 },
  O17: { x: 610, y: 310 },
  O18: { x: 610, y: 420 },
  O19: { x: 610, y: 530 },
  O20: { x: 610, y: 610 },
  A1: { x: 190, y: 510 },
  A2: { x: 280, y: 420 },
  B1: { x: 190, y: 190 },
  B2: { x: 280, y: 280 },
  E1: { x: 510, y: 190 },
  E2: { x: 420, y: 280 },
  C: { x: 350, y: 350 },
  D1: { x: 420, y: 420 },
  D2: { x: 510, y: 510 },
}

const routeLines: string[][] = [
  ['O0', 'O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7', 'O8', 'O9', 'O10', 'O11', 'O12', 'O13', 'O14', 'O15', 'O16', 'O17', 'O18', 'O19', 'O20'],
  ['O5', 'A1', 'A2', 'C', 'D1', 'D2', 'O20'],
  ['O10', 'B1', 'B2', 'C', 'D1', 'D2', 'O20'],
  ['O15', 'E1', 'E2', 'C', 'D1', 'D2', 'O20'],
]

const socket: Socket = io(SERVER_URL, { autoConnect: true })

const canvasRef = ref<HTMLCanvasElement | null>(null)
const nickname = ref('')
const roomCodeInput = ref('')
const maxPlayers = ref(2)
const currentRoomCode = ref('')
const hostId = ref('')
const players = ref<Player[]>([])
const gameState = ref<GameState | null>(null)
const connectionStatus = ref('Connecting to server...')
const message = ref('')
const selectedMoveId = ref('')
const isCreating = ref(false)
const isJoining = ref(false)
const isStarting = ref(false)
const isThrowing = ref(false)

const normalizedRoomCode = computed(() => roomCodeInput.value.trim().toUpperCase())
const myPlayer = computed(() => players.value.find((player) => player.id === socket.id) ?? null)
const isHost = computed(() => hostId.value === socket.id)
const currentPlayer = computed(() => players.value.find((player) => player.id === gameState.value?.turn.currentPlayerId) ?? null)
const winner = computed(() => players.value.find((player) => player.id === gameState.value?.winnerPlayerId) ?? null)
const canCreateRoom = computed(() => nickname.value.trim().length >= 2 && socket.connected && !isCreating.value)
const canJoinRoom = computed(
  () => nickname.value.trim().length >= 2 && normalizedRoomCode.value.length >= 4 && socket.connected && !isJoining.value,
)
const canStartGame = computed(
  () =>
    isHost.value &&
    gameState.value?.status === 'ready' &&
    players.value.length === gameState.value.maxPlayers &&
    !isStarting.value,
)
const canThrowYut = computed(
  () =>
    gameState.value?.status === 'playing' &&
    gameState.value.turn.currentPlayerId === socket.id &&
    gameState.value.turn.mustThrow &&
    !isThrowing.value,
)
const pendingMoves = computed(() => gameState.value?.turn.pendingMoves ?? [])
const selectedMove = computed(() => pendingMoves.value.find((move) => move.id === selectedMoveId.value) ?? pendingMoves.value[0])

const setRoom = (room: RoomPayload) => {
  currentRoomCode.value = room.code
  roomCodeInput.value = room.code
  hostId.value = room.hostId
  players.value = room.players
  gameState.value = room.gameState
  selectedMoveId.value = room.gameState.turn.pendingMoves[0]?.id ?? ''
}

const setMessageFromResponse = (response: ServerResponse, fallback: string) => {
  if (!response.ok) message.value = response.error ?? fallback
}

socket.on('connect', () => {
  connectionStatus.value = 'Server connected'
})

socket.on('disconnect', () => {
  connectionStatus.value = 'Server disconnected'
})

socket.on('connect_error', () => {
  connectionStatus.value = 'Cannot connect to server'
})

socket.on('roomCreated', (room: RoomPayload) => {
  setRoom(room)
  message.value = `Room ${room.code} created.`
})

socket.on('roomJoined', (room: RoomPayload) => {
  setRoom(room)
  message.value = `Joined room ${room.code}.`
})

socket.on('roomError', ({ message: errorMessage }: { message: string }) => {
  message.value = errorMessage
})

socket.on('playersUpdated', ({ players: nextPlayers }: { roomCode: string; players: Player[] }) => {
  players.value = nextPlayers
})

socket.on('gameStateUpdated', ({ gameState: nextGameState }: { roomCode: string; gameState: GameState }) => {
  gameState.value = nextGameState
  if (!nextGameState.turn.pendingMoves.some((move) => move.id === selectedMoveId.value)) {
    selectedMoveId.value = nextGameState.turn.pendingMoves[0]?.id ?? ''
  }
})

const createRoom = () => {
  if (!canCreateRoom.value) return
  isCreating.value = true
  message.value = ''

  socket.emit('createRoom', { nickname: nickname.value.trim(), maxPlayers: maxPlayers.value }, (response: ServerResponse<{ room?: RoomPayload }>) => {
    isCreating.value = false
    setMessageFromResponse(response, 'Could not create room.')
    if (response.ok && response.room) setRoom(response.room)
  })
}

const joinRoom = () => {
  if (!canJoinRoom.value) return
  isJoining.value = true
  message.value = ''

  socket.emit('joinRoom', { nickname: nickname.value.trim(), roomCode: normalizedRoomCode.value }, (response: ServerResponse<{ room?: RoomPayload }>) => {
    isJoining.value = false
    setMessageFromResponse(response, 'Could not join room.')
    if (response.ok && response.room) setRoom(response.room)
  })
}

const startGame = () => {
  if (!canStartGame.value) return
  isStarting.value = true
  message.value = ''

  socket.emit('startGame', (response: ServerResponse<{ gameState?: GameState }>) => {
    isStarting.value = false
    setMessageFromResponse(response, 'Could not start game.')
    if (response.ok && response.gameState) gameState.value = response.gameState
  })
}

const throwYut = () => {
  if (!canThrowYut.value) return
  isThrowing.value = true
  message.value = ''

  socket.emit('throwYut', (response: ServerResponse<{ gameState?: GameState }>) => {
    isThrowing.value = false
    setMessageFromResponse(response, 'Could not throw yut.')
    if (response.ok && response.gameState) {
      gameState.value = response.gameState
      selectedMoveId.value = response.gameState.turn.pendingMoves[0]?.id ?? ''
    }
  })
}

const movePiece = (pieceId: string) => {
  const move = selectedMove.value
  if (!move) return

  socket.emit('movePiece', { pieceId, throwId: move.id }, (response: ServerResponse<{ gameState?: GameState }>) => {
    setMessageFromResponse(response, 'Could not move piece.')
    if (response.ok && response.gameState) gameState.value = response.gameState
  })
}

const leaveRoom = () => {
  socket.emit('leaveRoom', () => {
    currentRoomCode.value = ''
    hostId.value = ''
    players.value = []
    gameState.value = null
    selectedMoveId.value = ''
    message.value = 'Left room.'
  })
}

const getPieceKey = (piece: YutPiece) => {
  if (piece.state !== 'active') return piece.state
  const route = gameState.value?.board.routes[piece.route] ?? []
  return route[piece.position] ?? 'O20'
}

const getPiecePoint = (piece: YutPiece): BoardPoint => {
  if (piece.state === 'home') {
    const playerIndex = players.value.findIndex((player) => player.id === piece.playerId)
    const homeOrigins: BoardPoint[] = [
      { x: 660, y: 660 },
      { x: 60, y: 660 },
      { x: 60, y: 60 },
      { x: 660, y: 60 },
      { x: 360, y: 65 },
    ]
    const origin = homeOrigins[playerIndex] ?? homeOrigins[0]!
    return {
      x: origin.x + (piece.index % 2) * 28 - 14,
      y: origin.y + Math.floor(piece.index / 2) * 28 - 14,
    }
  }

  if (piece.state === 'finished') {
    return {
      x: 350 + (piece.index % 2) * 28,
      y: 330 + Math.floor(piece.index / 2) * 28,
    }
  }

  return pointByKey[getPieceKey(piece)] ?? pointByKey.O0!
}

const getPlayerColor = (playerId: string) => players.value.find((player) => player.id === playerId)?.color ?? '#111827'

const drawBoard = () => {
  const canvas = canvasRef.value
  const state = gameState.value
  if (!canvas || !state) return

  const ratio = window.devicePixelRatio || 1
  canvas.width = CANVAS_SIZE * ratio
  canvas.height = CANVAS_SIZE * ratio
  canvas.style.width = '100%'
  canvas.style.height = 'auto'

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  ctx.fillStyle = '#fffaf0'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  for (const route of routeLines) {
    ctx.strokeStyle = route === routeLines[0] ? '#283246' : '#8b5cf6'
    ctx.lineWidth = route === routeLines[0] ? 5 : 3
    ctx.beginPath()
    route.forEach((key, index) => {
      const point = pointByKey[key]
      if (!point) return
      if (index === 0) ctx.moveTo(point.x, point.y)
      else ctx.lineTo(point.x, point.y)
    })
    ctx.stroke()
  }

  const uniqueKeys = [...new Set(routeLines.flat())]
  for (const key of uniqueKeys) {
    const point = pointByKey[key]
    if (!point) continue
    ctx.beginPath()
    ctx.fillStyle = key === 'C' ? '#ede9fe' : '#ffffff'
    ctx.strokeStyle = '#121826'
    ctx.lineWidth = 3
    ctx.arc(point.x, point.y, key === 'C' ? 22 : 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  ctx.fillStyle = '#121826'
  ctx.font = '700 16px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('FINISH', 350, 320)
  ctx.fillText('HOME', 350, 405)

  const activeGroups = new Map<string, YutPiece[]>()
  const loosePieces: YutPiece[] = []

  for (const piece of state.board.pieces) {
    if (piece.state === 'active') {
      const key = `${piece.playerId}:${getPieceKey(piece)}`
      activeGroups.set(key, [...(activeGroups.get(key) ?? []), piece])
    } else {
      loosePieces.push(piece)
    }
  }

  const drawPiece = (piece: YutPiece, offsetX = 0, offsetY = 0, stackSize = 1) => {
    const point = getPiecePoint(piece)
    ctx.beginPath()
    ctx.fillStyle = getPlayerColor(piece.playerId)
    ctx.strokeStyle = piece.playerId === socket.id ? '#111827' : '#ffffff'
    ctx.lineWidth = piece.playerId === socket.id ? 4 : 3
    ctx.arc(point.x + offsetX, point.y + offsetY, PIECE_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '800 11px sans-serif'
    ctx.fillText(stackSize > 1 ? `x${stackSize}` : String(piece.index + 1), point.x + offsetX, point.y + offsetY + 4)
  }

  for (const piece of loosePieces) drawPiece(piece)

  for (const group of activeGroups.values()) {
    drawPiece(group[0]!, 0, 0, group.length)
  }
}

const handleCanvasClick = (event: MouseEvent) => {
  const canvas = canvasRef.value
  const state = gameState.value
  const move = selectedMove.value
  if (!canvas || !state || !move || state.turn.currentPlayerId !== socket.id || state.turn.mustThrow) return

  const rect = canvas.getBoundingClientRect()
  const scaleX = CANVAS_SIZE / rect.width
  const scaleY = CANVAS_SIZE / rect.height
  const clickX = (event.clientX - rect.left) * scaleX
  const clickY = (event.clientY - rect.top) * scaleY
  const legalPieceIds = state.turn.legalMoves[move.id] ?? []

  const clickedPiece = state.board.pieces
    .filter((piece) => legalPieceIds.includes(piece.id))
    .find((piece) => {
      const point = getPiecePoint(piece)
      return Math.hypot(point.x - clickX, point.y - clickY) <= PIECE_RADIUS + 12
    })

  if (clickedPiece) movePiece(clickedPiece.id)
}

watch(
  () => gameState.value,
  () => nextTick(drawBoard),
  { deep: true },
)

watch(players, () => nextTick(drawBoard), { deep: true })

onMounted(() => {
  window.addEventListener('resize', drawBoard)
  nextTick(drawBoard)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', drawBoard)
  socket.disconnect()
})
</script>

<template>
  <main class="app-page">
    <section class="lobby-panel" aria-labelledby="lobby-title">
      <div class="brand-row">
        <div class="brand-mark">YG</div>
        <span>Yee Games</span>
      </div>

      <div class="panel-header">
        <p class="eyebrow">Yutnori Lobby</p>
        <h1 id="lobby-title">Realtime Yutnori</h1>
        <p>Create a 2-5 player room. The server owns turns, routes, captures, stacking, and movement.</p>
      </div>

      <div class="server-card">
        <span class="status-dot" :class="{ online: socket.connected }"></span>
        <div>
          <strong>{{ connectionStatus }}</strong>
          <p>{{ SERVER_URL }}</p>
        </div>
      </div>

      <form class="room-form" @submit.prevent="joinRoom">
        <label class="field">
          <span>Nickname</span>
          <input v-model.trim="nickname" type="text" autocomplete="nickname" maxlength="16" placeholder="YeePlayer" />
          <small>Use at least 2 characters.</small>
        </label>

        <label class="field">
          <span>Max players</span>
          <select v-model.number="maxPlayers" :disabled="Boolean(currentRoomCode)">
            <option v-for="count in [2, 3, 4, 5]" :key="count" :value="count">{{ count }} players</option>
          </select>
          <small>Chosen when creating a room.</small>
        </label>

        <label class="field">
          <span>Room code</span>
          <input v-model.trim="roomCodeInput" type="text" inputmode="text" maxlength="8" placeholder="A7K29Q" />
          <small>Join with a code from another player.</small>
        </label>

        <div class="action-row">
          <button class="primary-button" type="button" :disabled="!canCreateRoom" @click="createRoom">
            {{ isCreating ? 'Creating...' : 'Create room' }}
          </button>
          <button class="secondary-button" type="submit" :disabled="!canJoinRoom">
            {{ isJoining ? 'Joining...' : 'Join room' }}
          </button>
        </div>
      </form>

      <p v-if="message" class="message" role="status">{{ message }}</p>
    </section>

    <section class="game-panel" aria-label="Yutnori game">
      <header class="game-header">
        <div>
          <p class="eyebrow">{{ currentRoomCode || 'NO ROOM' }}</p>
          <h2>Yutnori</h2>
          <p v-if="gameState">{{ players.length }} / {{ gameState.maxPlayers }} players · {{ gameState.status }}</p>
          <p v-else>Create or join a room to sync game state.</p>
        </div>

        <div class="header-actions">
          <button class="primary-button compact" type="button" :disabled="!canStartGame" @click="startGame">
            {{ isStarting ? 'Starting...' : 'Start game' }}
          </button>
          <button v-if="currentRoomCode" class="leave-button compact" type="button" @click="leaveRoom">Leave</button>
        </div>
      </header>

      <div class="board-layout">
        <canvas ref="canvasRef" class="game-canvas" width="720" height="720" @click="handleCanvasClick"></canvas>

        <aside class="state-panel">
          <section class="players-card">
            <div class="card-header">
              <h3>Players</h3>
              <span>{{ players.length }}</span>
            </div>

            <ul v-if="players.length" class="player-list">
              <li v-for="player in players" :key="player.id" :class="{ current: player.id === gameState?.turn.currentPlayerId }">
                <i :style="{ background: player.color }"></i>
                <span>{{ player.nickname }}</span>
                <strong v-if="player.isHost">Host</strong>
              </li>
            </ul>
            <p v-else class="empty-text">No players yet.</p>
          </section>

          <section class="turn-card">
            <h3>Turn</h3>
            <p>{{ currentPlayer?.nickname ?? 'Waiting' }}</p>
            <button class="primary-button" type="button" :disabled="!canThrowYut" @click="throwYut">
              {{ isThrowing ? 'Throwing...' : 'Throw yut' }}
            </button>
          </section>

          <section class="moves-card">
            <h3>Pending throws</h3>
            <div v-if="pendingMoves.length" class="move-list">
              <button
                v-for="move in pendingMoves"
                :key="move.id"
                class="move-button"
                :class="{ active: selectedMoveId === move.id }"
                type="button"
                @click="selectedMoveId = move.id"
              >
                {{ move.label }} {{ move.steps > 0 ? `+${move.steps}` : move.steps }}
              </button>
            </div>
            <p v-else class="empty-text">Throw yut to get moves.</p>
          </section>

          <section class="log-card">
            <h3>Log</h3>
            <p>{{ gameState?.lastAction?.message ?? 'No events yet.' }}</p>
            <p v-if="winner" class="winner-text">{{ winner.nickname }} wins!</p>
            <p v-if="myPlayer" class="empty-text">Your pieces have a dark outline. Stacks show x2, x3, x4.</p>
          </section>
        </aside>
      </div>
    </section>
  </main>
</template>

<style scoped>
.app-page {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  min-height: 100vh;
  background:
    linear-gradient(135deg, rgba(20, 184, 166, 0.12), transparent 40%),
    linear-gradient(315deg, rgba(251, 113, 133, 0.12), transparent 46%),
    #f7f8fc;
}

.lobby-panel,
.game-panel {
  display: flex;
  flex-direction: column;
}

.lobby-panel {
  gap: 26px;
  border-right: 1px solid rgba(18, 24, 38, 0.08);
  background: #ffffff;
  padding: 36px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #121826;
  font-size: 1.1rem;
  font-weight: 900;
}

.brand-mark {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 8px;
  background: #121826;
  color: #fff;
  font-weight: 900;
}

.eyebrow {
  margin-bottom: 10px;
  color: #0f8f68;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2,
h3 {
  color: #121826;
  font-weight: 950;
}

h1 {
  font-size: 2.5rem;
  line-height: 1.06;
}

h2 {
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1;
}

h3 {
  font-size: 1rem;
}

.panel-header p:last-child,
.game-header p,
.empty-text {
  color: #6b7280;
}

.server-card,
.players-card,
.turn-card,
.moves-card,
.log-card {
  border: 1px solid rgba(18, 24, 38, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 18px 52px rgba(31, 41, 55, 0.08);
}

.server-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
}

.server-card strong {
  color: #121826;
  font-weight: 900;
}

.server-card p {
  color: #6b7280;
  overflow-wrap: anywhere;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #f43f5e;
}

.status-dot.online {
  background: #10b981;
}

.room-form {
  display: grid;
  gap: 16px;
}

.field {
  display: grid;
  gap: 8px;
  color: #283246;
  font-weight: 850;
}

.field input,
.field select {
  width: 100%;
  height: 50px;
  border: 1px solid #d7dce5;
  border-radius: 8px;
  background: #fbfcfe;
  color: #121826;
  font: inherit;
  padding: 0 14px;
  outline: none;
}

.field input:focus,
.field select:focus {
  border-color: #0f8f68;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(15, 143, 104, 0.12);
}

.field small {
  color: #6b7280;
  font-size: 0.82rem;
}

.action-row,
.header-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.primary-button,
.secondary-button,
.leave-button,
.move-button {
  min-height: 50px;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-weight: 900;
}

.primary-button {
  border: 0;
  background: #121826;
  color: #ffffff;
}

.secondary-button {
  border: 1px solid #121826;
  background: #ffffff;
  color: #121826;
}

.leave-button {
  border: 1px solid #e11d48;
  background: #fff1f2;
  color: #be123c;
}

.compact {
  min-height: 42px;
  padding: 0 14px;
}

.primary-button:hover:not(:disabled) {
  background: #0f8f68;
}

.secondary-button:hover:not(:disabled),
.move-button:hover {
  border-color: #0f8f68;
  color: #0f8f68;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.message {
  border-radius: 8px;
  background: #e9fbf4;
  color: #087252;
  padding: 13px 14px;
  font-weight: 800;
}

.game-panel {
  gap: 22px;
  padding: 32px;
}

.game-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.board-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 22px;
  align-items: start;
}

.game-canvas {
  width: 100%;
  max-width: 780px;
  border: 1px solid rgba(18, 24, 38, 0.1);
  border-radius: 8px;
  background: #fffaf0;
  box-shadow: 0 18px 52px rgba(31, 41, 55, 0.08);
  cursor: pointer;
}

.state-panel {
  display: grid;
  gap: 14px;
}

.players-card,
.turn-card,
.moves-card,
.log-card {
  padding: 16px;
}

.card-header,
.player-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.card-header span,
.player-list strong {
  border-radius: 999px;
  background: #e8f8f2;
  color: #087252;
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 900;
}

.player-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 0;
  list-style: none;
}

.player-list li {
  border-radius: 8px;
  background: #f7f8fc;
  color: #283246;
  padding: 12px;
  font-weight: 850;
}

.player-list li.current {
  outline: 3px solid rgba(15, 143, 104, 0.18);
}

.player-list i {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.turn-card,
.moves-card,
.log-card {
  display: grid;
  gap: 12px;
}

.move-list {
  display: grid;
  gap: 8px;
}

.move-button {
  border: 1px solid #d7dce5;
  background: #ffffff;
  color: #283246;
}

.move-button.active {
  border-color: #0f8f68;
  background: #f2fbf7;
  box-shadow: 0 0 0 4px rgba(15, 143, 104, 0.1);
}

.winner-text {
  color: #be123c;
  font-weight: 950;
}

@media (max-width: 1180px) {
  .app-page,
  .board-layout {
    grid-template-columns: 1fr;
  }

  .lobby-panel {
    border-right: 0;
    border-bottom: 1px solid rgba(18, 24, 38, 0.08);
  }
}

@media (max-width: 620px) {
  .lobby-panel,
  .game-panel {
    padding: 24px;
  }

  .action-row,
  .header-actions {
    grid-template-columns: 1fr;
  }

  h1 {
    font-size: 2.1rem;
  }
}
</style>
