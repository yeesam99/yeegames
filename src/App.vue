<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { io, type Socket } from 'socket.io-client'

type GameType = 'yut' | 'word'
type RouteName = 'outer' | 'shortcutA' | 'shortcutB' | 'shortcutC'

type Player = {
  id: string
  nickname: string
  isHost: boolean
  color: string
  pieces?: Array<{
    id: string
    position: number | 'finished'
    finished: boolean
    route: RouteName
    state: 'home' | 'active' | 'finished'
    boardKey?: string
  }>
}

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
  boardKey?: string
  state: 'home' | 'active' | 'finished'
}

type GameState = {
  roomId?: string
  gameType?: GameType
  status: 'waiting' | 'ready' | 'playing' | 'finished'
  maxPlayers: number
  players: Player[]
  currentTurnIndex?: number
  pendingMoves?: YutMove[]
  extraTurns?: number
  winner?: string | null
  turn: {
    playerIndex: number
    currentPlayerId: string | null
    pendingMoves: YutMove[]
    extraTurnCount: number
    mustThrow: boolean
    legalMoves: Record<string, string[]>
  }
  board: {
    path?: {
      startKey: string
      finishKey: string
      homePosition: -1
      direction: 'counter-clockwise'
      routes: Record<RouteName, string[]>
      shortcutByOuterIndex: Record<number, RouteName>
      forcedShortcutOnCorner: boolean
    }
    routes: Record<RouteName, string[]>
    shortcuts?: Record<number, RouteName>
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
  roomId?: string
  code: string
  gameType?: GameType
  hostId: string
  players: Player[]
  gameState: GameState
  logs?: LogMessage[]
}

type ServerResponse<T = unknown> = {
  ok: boolean
  error?: string
} & T

type LogMessage = {
  id: string
  type: 'system' | 'start' | 'throw' | 'move' | 'finish' | 'chat'
  message: string
  player?: Player | null
  at: string
}

type BoardPoint = {
  x: number
  y: number
}

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'
const CANVAS_SIZE = 720
const PIECE_RADIUS = 13

const games: Array<{ id: GameType; label: string; status: string }> = [
  { id: 'yut', label: '윷놀이', status: 'YUT' },
  { id: 'word', label: '끝말잇기', status: '준비중' },
]

const pointByKey: Record<string, BoardPoint> = {
  O0: { x: 610, y: 610 },
  O1: { x: 610, y: 500 },
  O2: { x: 610, y: 390 },
  O3: { x: 610, y: 280 },
  O4: { x: 610, y: 170 },
  O5: { x: 610, y: 90 },
  O6: { x: 500, y: 90 },
  O7: { x: 390, y: 90 },
  O8: { x: 280, y: 90 },
  O9: { x: 170, y: 90 },
  O10: { x: 90, y: 90 },
  O11: { x: 90, y: 200 },
  O12: { x: 90, y: 310 },
  O13: { x: 90, y: 420 },
  O14: { x: 90, y: 530 },
  O15: { x: 90, y: 610 },
  O16: { x: 200, y: 610 },
  O17: { x: 310, y: 610 },
  O18: { x: 420, y: 610 },
  O19: { x: 530, y: 610 },
  O20: { x: 610, y: 610 },
  A1: { x: 550, y: 160 },
  A2: { x: 450, y: 260 },
  B1: { x: 160, y: 160 },
  B2: { x: 260, y: 260 },
  E1: { x: 160, y: 550 },
  E2: { x: 260, y: 450 },
  C: { x: 350, y: 350 },
  D1: { x: 420, y: 420 },
  D2: { x: 510, y: 510 },
}

const routeLines: string[][] = [
  // O0 is the bottom-right start cell. The route moves counter-clockwise and returns to O20.
  [
    'O0',
    'O1',
    'O2',
    'O3',
    'O4',
    'O5',
    'O6',
    'O7',
    'O8',
    'O9',
    'O10',
    'O11',
    'O12',
    'O13',
    'O14',
    'O15',
    'O16',
    'O17',
    'O18',
    'O19',
    'O20',
  ],
  ['O5', 'A1', 'A2', 'C', 'D1', 'D2', 'O20'],
  ['O10', 'B1', 'B2', 'C', 'D1', 'D2', 'O20'],
  ['O15', 'E1', 'E2', 'C', 'D1', 'D2', 'O20'],
]

const localRoutes: Record<RouteName, string[]> = {
  outer: routeLines[0]!,
  shortcutA: routeLines[1]!,
  shortcutB: routeLines[2]!,
  shortcutC: routeLines[3]!,
}

const isRouteName = (route: string): route is RouteName => route in localRoutes

const getBoardRoutes = (state?: GameState | null): Record<RouteName, string[]> => ({
  outer: state?.board.routes?.outer ?? localRoutes.outer,
  shortcutA: state?.board.routes?.shortcutA ?? localRoutes.shortcutA,
  shortcutB: state?.board.routes?.shortcutB ?? localRoutes.shortcutB,
  shortcutC: state?.board.routes?.shortcutC ?? localRoutes.shortcutC,
})

const getBoardRouteLines = (state?: GameState | null) => {
  const routes = getBoardRoutes(state)
  return [routes.outer, routes.shortcutA, routes.shortcutB, routes.shortcutC]
}

const getSafeBoardKey = (piece: YutPiece, state?: GameState | null) => {
  if (piece.state !== 'active') return piece.state
  if (piece.boardKey && pointByKey[piece.boardKey]) return piece.boardKey

  const routeName = isRouteName(piece.route) ? piece.route : 'outer'
  const route = getBoardRoutes(state)[routeName]
  return route[piece.position] && pointByKey[route[piece.position]!] ? route[piece.position]! : 'O0'
}

// Rooms can outlive a frontend refresh, so the client defensively fills any
// missing boardKey before drawing. The server still owns the real game rules.
const normalizeGameState = (nextGameState: GameState): GameState => ({
  ...nextGameState,
  board: {
    ...nextGameState.board,
    pieces: nextGameState.board.pieces.map((piece) => ({
      ...piece,
      route: isRouteName(piece.route) ? piece.route : 'outer',
      boardKey: getSafeBoardKey(piece, nextGameState),
    })),
  },
})

const socket: Socket = io(SERVER_URL, { autoConnect: true })

const canvasRef = ref<HTMLCanvasElement | null>(null)
const selectedGame = ref<GameType>('yut')
const nickname = ref('')
const roomCodeInput = ref('')
const maxPlayers = ref(2)
const currentRoomCode = ref('')
const hostId = ref('')
const roomGameType = ref<GameType>('yut')
const players = ref<Player[]>([])
const gameState = ref<GameState | null>(null)
const connectionStatus = ref('서버 연결 중...')
const message = ref('')
const selectedMoveId = ref('')
const logs = ref<LogMessage[]>([])
const chatInput = ref('')
const isCreating = ref(false)
const isJoining = ref(false)
const isStarting = ref(false)
const isThrowing = ref(false)

const normalizedRoomCode = computed(() => roomCodeInput.value.trim().toUpperCase())
const isInRoom = computed(() => Boolean(currentRoomCode.value))
const myPlayer = computed(() => players.value.find((player) => player.id === socket.id) ?? null)
const isHost = computed(() => hostId.value === socket.id)
const currentPlayer = computed(() => players.value.find((player) => player.id === gameState.value?.turn.currentPlayerId) ?? null)
const winner = computed(() => {
  const winnerId = gameState.value?.winnerPlayerId ?? gameState.value?.winner
  return players.value.find((player) => player.id === winnerId) ?? null
})
const ruleText = computed(() => `${maxPlayers.value}인전. 빽도 사용, 잡기 추가 턴, 업기를 적용합니다.`)
const isYutSelected = computed(() => selectedGame.value === 'yut')
const canUseSelectedGame = computed(() => isYutSelected.value)
const canCreateRoom = computed(
  () => nickname.value.trim().length >= 2 && socket.connected && !isCreating.value && canUseSelectedGame.value,
)
const canJoinRoom = computed(
  () =>
    nickname.value.trim().length >= 2 &&
    normalizedRoomCode.value.length >= 4 &&
    socket.connected &&
    !isJoining.value &&
    canUseSelectedGame.value,
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
// pendingMoves is a server-owned FIFO queue. The client can only use the first result.
const selectedMove = computed(() => pendingMoves.value[0])
const movablePieces = computed(() => {
  const move = selectedMove.value
  const state = gameState.value
  if (!move || !state) return []

  const legalPieceIds = state.turn.legalMoves[move.id] ?? []
  return state.board.pieces.filter((piece) => legalPieceIds.includes(piece.id))
})

const canSendChat = computed(() => isInRoom.value && chatInput.value.trim().length > 0)

const pushLog = (log: LogMessage) => {
  logs.value = [...logs.value.filter((item) => item.id !== log.id), log].slice(-80)
}

const setRoom = (room: RoomPayload) => {
  currentRoomCode.value = room.code
  roomCodeInput.value = room.code
  hostId.value = room.hostId
  roomGameType.value = room.gameType ?? room.gameState.gameType ?? 'yut'
  players.value = room.players
  gameState.value = normalizeGameState(room.gameState)
  logs.value = room.logs ?? []
  selectedMoveId.value = room.gameState.turn.pendingMoves[0]?.id ?? ''
}

const setMessageFromResponse = (response: ServerResponse, fallback: string) => {
  if (!response.ok) message.value = response.error ?? fallback
}

// 게임 선택은 로비 폼만 바꿉니다. YUT 외 게임은 아직 서버 입장을 막습니다.
const selectGame = (gameType: GameType) => {
  selectedGame.value = gameType
  message.value = gameType === 'word' ? '끝말잇기는 아직 준비중입니다.' : ''
}

socket.on('connect', () => {
  connectionStatus.value = '서버 연결됨'
})

socket.on('disconnect', () => {
  connectionStatus.value = '서버 연결 끊김'
})

socket.on('connect_error', () => {
  connectionStatus.value = '서버에 연결할 수 없습니다'
})

socket.on('roomCreated', (room: RoomPayload) => {
  setRoom(room)
  message.value = `방 ${room.code}를 만들었습니다.`
  nextTick(drawBoard)
})

socket.on('roomJoined', (room: RoomPayload) => {
  setRoom(room)
  message.value = `방 ${room.code}에 참가했습니다.`
  nextTick(drawBoard)
})

socket.on('roomError', ({ message: errorMessage }: { message: string }) => {
  message.value = errorMessage
})

socket.on('playersUpdated', ({ players: nextPlayers }: { roomId?: string; roomCode: string; players: Player[] }) => {
  players.value = nextPlayers
})

socket.on(
  'gameStateUpdated',
  ({ gameState: nextGameState }: { roomId?: string; roomCode: string; gameState: GameState }) => {
  gameState.value = normalizeGameState(nextGameState)
  if (!nextGameState.turn.pendingMoves.some((move) => move.id === selectedMoveId.value)) {
    selectedMoveId.value = nextGameState.turn.pendingMoves[0]?.id ?? ''
  }
  nextTick(drawBoard)
  },
)

socket.on('systemMessage', (log: LogMessage) => {
  pushLog(log)
})

socket.on('chatMessage', (log: LogMessage) => {
  pushLog(log)
})

const createRoom = () => {
  if (!canCreateRoom.value) {
    message.value = selectedGame.value === 'word' ? '끝말잇기는 아직 준비중입니다.' : message.value
    return
  }

  isCreating.value = true
  message.value = ''

  socket.emit(
    'createRoom',
    {
      gameType: selectedGame.value,
      nickname: nickname.value.trim(),
      maxPlayers: maxPlayers.value,
    },
    (response: ServerResponse<{ room?: RoomPayload }>) => {
      isCreating.value = false
      setMessageFromResponse(response, '방을 만들지 못했습니다.')
      if (response.ok && response.room) setRoom(response.room)
    },
  )
}

const joinRoom = () => {
  if (!canJoinRoom.value) {
    message.value = selectedGame.value === 'word' ? '끝말잇기는 아직 준비중입니다.' : message.value
    return
  }

  isJoining.value = true
  message.value = ''

  socket.emit(
    'joinRoom',
    {
      nickname: nickname.value.trim(),
      roomCode: normalizedRoomCode.value,
    },
    (response: ServerResponse<{ room?: RoomPayload }>) => {
      isJoining.value = false
      setMessageFromResponse(response, '방에 참가하지 못했습니다.')
      if (response.ok && response.room) setRoom(response.room)
    },
  )
}

const startGame = () => {
  if (!canStartGame.value) return
  isStarting.value = true
  message.value = ''

  socket.emit('startGame', (response: ServerResponse<{ gameState?: GameState }>) => {
    isStarting.value = false
    setMessageFromResponse(response, '게임을 시작하지 못했습니다.')
    if (response.ok && response.gameState) gameState.value = normalizeGameState(response.gameState)
    nextTick(drawBoard)
  })
}

const throwYut = () => {
  if (!canThrowYut.value) return
  isThrowing.value = true
  message.value = ''

  socket.emit('rollYut', (response: ServerResponse<{ gameState?: GameState }>) => {
    isThrowing.value = false
    setMessageFromResponse(response, '윷을 던지지 못했습니다.')
    if (response.ok && response.gameState) {
      gameState.value = normalizeGameState(response.gameState)
      selectedMoveId.value = response.gameState.turn.pendingMoves[0]?.id ?? ''
      nextTick(drawBoard)
    }
  })
}

const movePiece = (pieceId: string) => {
  const move = selectedMove.value
  if (!move) return

  socket.emit('movePiece', { pieceId, throwId: move.id }, (response: ServerResponse<{ gameState?: GameState }>) => {
    setMessageFromResponse(response, '말을 이동하지 못했습니다.')
    if (response.ok && response.gameState) {
      gameState.value = normalizeGameState(response.gameState)
      nextTick(drawBoard)
    }
  })
}

const sendChat = () => {
  const text = chatInput.value.trim()
  if (!text) return

  socket.emit('chatMessage', { message: text }, (response: ServerResponse) => {
    setMessageFromResponse(response, '채팅을 보내지 못했습니다.')
    if (response.ok) chatInput.value = ''
  })
}

const leaveRoom = () => {
  socket.emit('leaveRoom', () => {
    currentRoomCode.value = ''
    hostId.value = ''
    roomGameType.value = 'yut'
    players.value = []
    gameState.value = null
    logs.value = []
    chatInput.value = ''
    selectedMoveId.value = ''
    message.value = '방에서 나왔습니다.'
  })
}

const getPieceKey = (piece: YutPiece) => {
  if (piece.state !== 'active') return piece.state
  return getSafeBoardKey(piece, gameState.value)
}

const getPiecePoint = (piece: YutPiece): BoardPoint => {
  if (piece.state === 'home') {
    const playerIndex = players.value.findIndex((player) => player.id === piece.playerId)
    // Waiting pieces stay just outside the bottom-right start/home corner.
    // They are offset by player so every player's four pieces remain visible.
    const homeOrigins: BoardPoint[] = [
      { x: 668, y: 650 },
      { x: 650, y: 676 },
      { x: 680, y: 676 },
      { x: 626, y: 650 },
      { x: 626, y: 678 },
    ]
    const origin = homeOrigins[playerIndex] ?? homeOrigins[0]!
    return {
      x: origin.x + (piece.index % 2) * 28 - 14,
      y: origin.y + Math.floor(piece.index / 2) * 28 - 14,
    }
  }

  if (piece.state === 'finished') {
    // Finished pieces gather inside the bottom-right finish area, separate
    // from waiting pieces so a completed piece never looks like it disappeared.
    return {
      x: 628 + (piece.index % 2) * 24,
      y: 560 + Math.floor(piece.index / 2) * 24,
    }
  }

  const key = getPieceKey(piece)
  return pointByKey[key] ?? pointByKey.O0!
}

const getPlayerColor = (playerId: string) => players.value.find((player) => player.id === playerId)?.color ?? '#111827'

const drawBoard = () => {
  const canvas = canvasRef.value
  const state = gameState.value
  if (!canvas || !state || !isInRoom.value) return

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

  const boardRouteLines = getBoardRouteLines(state)
  const outerRoute = boardRouteLines[0]

  // Draw from the server-sent route table first. The local routes are only a
  // fallback for old rooms or a disconnected preview state.
  for (const route of boardRouteLines) {
    ctx.strokeStyle = route === outerRoute ? '#283246' : '#8b5cf6'
    ctx.lineWidth = route === outerRoute ? 5 : 3
    ctx.beginPath()
    route.forEach((key, index) => {
      const point = pointByKey[key]
      if (!point) return
      if (index === 0) ctx.moveTo(point.x, point.y)
      else ctx.lineTo(point.x, point.y)
    })
    ctx.stroke()
  }

  const uniqueKeys = [...new Set(boardRouteLines.flat())]
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
  // The start, waiting pieces, and finish area all belong near the bottom-right corner.
  ctx.textAlign = 'left'
  ctx.fillText('완주', 626, 566)
  ctx.fillText('대기 말', 626, 706)

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

  const firstMove = state.turn.pendingMoves[0]
  const legalPieceIds = firstMove ? new Set(state.turn.legalMoves[firstMove.id] ?? []) : new Set<string>()

  const drawPiece = (piece: YutPiece, offsetX = 0, offsetY = 0, stackSize = 1) => {
    const point = getPiecePoint(piece)
    const x = Number.isFinite(point.x) ? point.x + offsetX : pointByKey.O0!.x
    const y = Number.isFinite(point.y) ? point.y + offsetY : pointByKey.O0!.y
    const canMoveNow = state.turn.currentPlayerId === socket.id && legalPieceIds.has(piece.id)

    if (canMoveNow) {
      ctx.beginPath()
      ctx.fillStyle = 'rgba(17, 17, 17, 0.08)'
      ctx.strokeStyle = '#111111'
      ctx.lineWidth = 2
      ctx.arc(x, y, PIECE_RADIUS + 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.fillStyle = getPlayerColor(piece.playerId)
    ctx.strokeStyle = piece.playerId === socket.id ? '#111827' : '#ffffff'
    ctx.lineWidth = piece.playerId === socket.id ? 4 : 3
    ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '800 11px sans-serif'
    ctx.fillText(stackSize > 1 ? `x${stackSize}` : String(piece.index + 1), x, y + 4)
  }

  for (const piece of loosePieces) drawPiece(piece)
  for (const group of activeGroups.values()) {
    group.forEach((piece, index) => {
      const offsets = [
        { x: 0, y: 0 },
        { x: 10, y: -10 },
        { x: -10, y: 10 },
        { x: 10, y: 10 },
      ]
      const offset = offsets[index] ?? offsets[0]!
      drawPiece(piece, offset.x, offset.y, group.length)
    })
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
  <main class="app-shell" :class="{ 'in-room': isInRoom }">
    <header class="top-logo" aria-label="YUT 로고">
      <span>Y</span>
      <strong>YUT</strong>
    </header>

    <section v-if="!isInRoom" class="entry-stage" aria-labelledby="entry-title">
      <div class="entry-card">
        <div class="game-tabs" aria-label="게임 선택">
          <button
            v-for="game in games"
            :key="game.id"
            class="game-tab"
            :class="{ active: selectedGame === game.id }"
            type="button"
            @click="selectGame(game.id)"
          >
            {{ game.label }}
          </button>
        </div>

        <div class="entry-heading">
          <h1 id="entry-title">{{ isYutSelected ? '윷놀이' : '끝말잇기' }}</h1>
          <p>{{ isYutSelected ? '닉네임과 방 코드로 바로 시작하세요.' : '아직 준비중입니다.' }}</p>
        </div>

        <form v-if="isYutSelected" class="entry-form" @submit.prevent="joinRoom">
          <label class="field">
            <span>닉네임</span>
            <input v-model.trim="nickname" type="text" autocomplete="nickname" maxlength="16" placeholder="닉네임" />
          </label>

          <label class="field">
            <span>목표 인원</span>
            <select v-model.number="maxPlayers">
              <option v-for="count in [2, 3, 4, 5]" :key="count" :value="count">{{ count }}명</option>
            </select>
          </label>

          <p class="rule-box">{{ ruleText }}</p>

          <label class="field">
            <span>방 코드</span>
            <input v-model.trim="roomCodeInput" type="text" inputmode="text" maxlength="8" placeholder="입장할 방 코드" />
          </label>

          <div class="entry-actions">
            <button class="dark-button" type="button" :disabled="!canCreateRoom" @click="createRoom">
              {{ isCreating ? '생성 중...' : '방 만들기' }}
            </button>
            <button class="light-button" type="submit" :disabled="!canJoinRoom">
              {{ isJoining ? '입장 중...' : '입장' }}
            </button>
          </div>
        </form>

        <div v-else class="coming-soon">
          <strong>준비중</strong>
          <p>끝말잇기는 다음 단계에서 연결할 예정입니다.</p>
        </div>

        <p class="server-line">
          <span :class="{ online: socket.connected }"></span>
          {{ connectionStatus }}
        </p>

        <p v-if="message" class="message" role="status">{{ message }}</p>
      </div>
    </section>

    <section v-else class="game-panel" aria-label="윷놀이 게임">
      <header class="game-header">
        <div>
          <p class="eyebrow">{{ currentRoomCode }} · {{ roomGameType.toUpperCase() }}</p>
          <h2>윷놀이</h2>
          <p v-if="gameState">{{ players.length }} / {{ gameState.maxPlayers }}명 · {{ gameState.status }}</p>
        </div>

        <div class="header-actions">
          <div class="room-code-badge" aria-label="방 코드">
            <span>방 코드</span>
            <strong>{{ currentRoomCode }}</strong>
          </div>
          <button class="dark-button compact" type="button" :disabled="!canStartGame" @click="startGame">
            {{ isStarting ? '시작 중...' : '게임 시작' }}
          </button>
          <button class="danger-button compact" type="button" @click="leaveRoom">나가기</button>
        </div>
      </header>

      <div class="board-layout">
        <aside class="log-panel" aria-label="채팅 및 시스템 로그">
          <section class="side-card log-card">
            <div class="card-header">
              <h3>로그</h3>
              <span>{{ logs.length }}</span>
            </div>

            <div class="log-list">
              <p v-if="logs.length === 0" class="muted">아직 기록이 없습니다.</p>
              <article v-for="log in logs" :key="log.id" class="log-item" :class="log.type">
                <strong>{{ log.player?.nickname ?? (log.type === 'chat' ? '플레이어' : 'SYSTEM') }}</strong>
                <span>{{ log.message }}</span>
              </article>
            </div>

            <form class="chat-form" @submit.prevent="sendChat">
              <input v-model.trim="chatInput" type="text" maxlength="120" placeholder="메시지 입력" />
              <button class="dark-button chat-button" type="submit" :disabled="!canSendChat">전송</button>
            </form>
          </section>
        </aside>

        <canvas ref="canvasRef" class="game-canvas" width="720" height="720" @click="handleCanvasClick"></canvas>

        <aside class="state-panel">
          <section class="side-card">
            <div class="card-header">
              <h3>플레이어</h3>
              <span>{{ players.length }}명</span>
            </div>
            <ul class="player-list">
              <li v-for="player in players" :key="player.id" :class="{ current: player.id === gameState?.turn.currentPlayerId }">
                <i :style="{ background: player.color }"></i>
                <span>{{ player.nickname }}</span>
                <strong v-if="player.isHost">방장</strong>
              </li>
            </ul>
          </section>

          <section class="side-card">
            <h3>현재 턴</h3>
            <p>{{ currentPlayer?.nickname ?? '대기 중' }}</p>
            <p v-if="gameState" class="turn-meta">추가 턴 {{ gameState.extraTurns ?? gameState.turn.extraTurnCount }}회</p>
            <button class="dark-button full" type="button" :disabled="!canThrowYut" @click="throwYut">
              {{ isThrowing ? '던지는 중...' : '윷 던지기' }}
            </button>
          </section>

          <section class="side-card">
            <h3>사용할 윷 결과</h3>
            <div v-if="pendingMoves.length" class="move-list">
              <button
                v-for="(move, index) in pendingMoves"
                :key="move.id"
                class="move-button"
                :class="{ active: index === 0 }"
                type="button"
                disabled
              >
                {{ index + 1 }}. {{ move.label }} {{ move.steps > 0 ? `+${move.steps}` : move.steps }}
              </button>
            </div>
            <p v-else class="muted">윷을 던지면 결과가 표시됩니다.</p>
          </section>

          <section class="side-card">
            <h3>이동 가능한 말</h3>
            <div v-if="movablePieces.length" class="piece-action-list">
              <button
                v-for="piece in movablePieces"
                :key="piece.id"
                class="light-button piece-action"
                type="button"
                @click="movePiece(piece.id)"
              >
                {{ piece.index + 1 }}번 말
              </button>
            </div>
            <p v-else class="muted">윷을 던진 뒤 움직일 수 있는 말이 표시됩니다.</p>
          </section>

          <section class="side-card">
            <h3>게임 로그</h3>
            <p>{{ gameState?.lastAction?.message ?? '아직 이벤트가 없습니다.' }}</p>
            <p v-if="winner" class="winner-text">{{ winner.nickname }}님 승리!</p>
            <p v-if="myPlayer" class="muted">내 말은 진한 테두리로 표시됩니다.</p>
          </section>
        </aside>
      </div>
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #ffffff;
  color: #111111;
  overflow-x: hidden;
}

.top-logo {
  position: fixed;
  top: 28px;
  left: 32px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.top-logo span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 2px solid #111111;
  border-radius: 10px;
  font-weight: 950;
}

.top-logo strong {
  font-size: 1rem;
  font-weight: 950;
  letter-spacing: 0.08em;
}

.entry-stage {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 88px 20px 40px;
}

.entry-card {
  width: min(100%, 390px);
  border: 2px solid #111111;
  border-radius: 22px;
  background: #ffffff;
  padding: 16px;
  box-shadow: 0 10px 0 #111111;
}

.game-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 18px;
}

.game-tab {
  min-height: 46px;
  border: 2px solid #111111;
  border-radius: 14px;
  background: #ffffff;
  color: #111111;
  cursor: pointer;
  font: inherit;
  font-weight: 950;
}

.game-tab.active {
  background: #2f2f2f;
  color: #ffffff;
}

.entry-heading {
  margin-bottom: 16px;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  font-size: 1.8rem;
  font-weight: 950;
}

h2 {
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 950;
}

h3 {
  font-size: 1rem;
  font-weight: 950;
}

.entry-heading p,
.muted,
.server-line {
  color: #666666;
}

.entry-form {
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-weight: 900;
}

.field input,
.field select {
  width: 100%;
  height: 48px;
  border: 2px solid #111111;
  border-radius: 14px;
  background: #ffffff;
  color: #111111;
  font: inherit;
  font-weight: 800;
  outline: none;
  padding: 0 12px;
}

.rule-box,
.coming-soon {
  border: 2px solid #111111;
  border-radius: 14px;
  background: #f7f7f7;
  padding: 12px;
  font-weight: 850;
}

.coming-soon {
  display: grid;
  gap: 8px;
}

.coming-soon p {
  color: #666666;
}

.entry-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.dark-button,
.light-button,
.danger-button,
.move-button {
  min-height: 48px;
  border: 2px solid #111111;
  border-radius: 14px;
  cursor: pointer;
  font: inherit;
  font-weight: 950;
}

.dark-button {
  background: #111111;
  color: #ffffff;
}

.light-button,
.move-button {
  background: #ffffff;
  color: #111111;
}

.danger-button {
  border-color: #be123c;
  background: #fff1f2;
  color: #be123c;
}

.compact {
  min-height: 42px;
  padding: 0 16px;
}

.room-code-badge {
  display: grid;
  min-height: 42px;
  align-content: center;
  border: 2px solid #111111;
  border-radius: 14px;
  background: #ffffff;
  padding: 4px 14px;
}

.room-code-badge span {
  color: #666666;
  font-size: 0.68rem;
  font-weight: 900;
}

.room-code-badge strong {
  color: #111111;
  font-size: 1.05rem;
  font-weight: 950;
  letter-spacing: 0.08em;
}

.full {
  width: 100%;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.server-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  font-size: 0.84rem;
  font-weight: 800;
}

.server-line span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #e11d48;
}

.server-line span.online {
  background: #16a34a;
}

.message {
  margin-top: 10px;
  border: 2px solid #111111;
  border-radius: 14px;
  background: #f7f7f7;
  padding: 10px;
  font-weight: 850;
}

.game-panel {
  min-height: 100vh;
  padding: 32px;
  padding-top: 92px;
}

.game-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}

.game-header p,
.eyebrow {
  color: #666666;
}

.eyebrow {
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.board-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 300px;
  gap: 22px;
  align-items: start;
}

.game-canvas,
.side-card {
  border: 2px solid #111111;
  border-radius: 22px;
  background: #fffaf0;
}

.game-canvas {
  width: 100%;
  max-width: 780px;
  aspect-ratio: 1;
  cursor: pointer;
}

.log-panel,
.state-panel {
  display: grid;
  gap: 14px;
}

.side-card {
  display: grid;
  gap: 12px;
  background: #ffffff;
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
  border: 2px solid #111111;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 0.78rem;
  font-weight: 950;
}

.player-list {
  display: grid;
  gap: 8px;
  padding: 0;
  list-style: none;
}

.player-list li {
  border: 2px solid #111111;
  border-radius: 14px;
  padding: 10px;
  font-weight: 900;
}

.player-list li.current {
  background: #f6f6f6;
}

.player-list i {
  width: 14px;
  height: 14px;
  border: 2px solid #111111;
  border-radius: 999px;
  flex: 0 0 auto;
}

.move-list {
  display: grid;
  gap: 8px;
}

.move-button.active {
  background: #2f2f2f;
  color: #ffffff;
}

.turn-meta {
  font-size: 0.86rem;
  font-weight: 900;
  color: #666666;
}

.log-card {
  min-height: min(720px, calc(100vh - 132px));
  grid-template-rows: auto minmax(220px, 1fr) auto;
}

.log-list {
  display: grid;
  align-content: start;
  gap: 8px;
  max-height: 520px;
  overflow: auto;
}

.log-item {
  display: grid;
  gap: 3px;
  border: 2px solid #111111;
  border-radius: 12px;
  background: #ffffff;
  padding: 9px;
}

.log-item.chat {
  background: #f7f7f7;
}

.log-item strong {
  font-size: 0.75rem;
  font-weight: 950;
}

.log-item span {
  line-height: 1.35;
}

.chat-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px;
  gap: 8px;
}

.chat-form input {
  min-width: 0;
  height: 44px;
  border: 2px solid #111111;
  border-radius: 14px;
  padding: 0 10px;
  font: inherit;
  font-weight: 800;
}

.chat-button {
  min-height: 44px;
}

.piece-action-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.piece-action {
  min-height: 42px;
}

.winner-text {
  color: #be123c;
  font-weight: 950;
}

@media (max-width: 980px) {
  .board-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .top-logo {
    top: 18px;
    left: 20px;
  }

  .entry-actions,
  .header-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .game-panel {
    padding: 24px 16px;
    padding-top: 84px;
  }
}
</style>
