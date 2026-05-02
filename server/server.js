import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

const PORT = process.env.PORT || 4000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*'
const ROOM_CODE_LENGTH = 6
const PIECES_PER_PLAYER = 4
const PLAYER_COLORS = ['#ef4444', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed']

const ROUTES = {
  outer: Array.from({ length: 21 }, (_item, index) => `O${index}`),
  shortcutA: ['O5', 'A1', 'A2', 'C', 'D1', 'D2', 'O20'],
  shortcutB: ['O10', 'B1', 'B2', 'C', 'D1', 'D2', 'O20'],
  shortcutC: ['O15', 'E1', 'E2', 'C', 'D1', 'D2', 'O20'],
}

const SHORTCUT_BY_OUTER_INDEX = {
  5: 'shortcutA',
  10: 'shortcutB',
  15: 'shortcutC',
}

const YUT_RESULTS = [
  { name: 'backdo', label: '빽도', steps: -1, grantsExtraTurn: false, weight: 1 },
  { name: 'do', label: '도', steps: 1, grantsExtraTurn: false, weight: 4 },
  { name: 'gae', label: '개', steps: 2, grantsExtraTurn: false, weight: 6 },
  { name: 'geol', label: '걸', steps: 3, grantsExtraTurn: false, weight: 4 },
  { name: 'yut', label: '윷', steps: 4, grantsExtraTurn: true, weight: 1 },
  { name: 'mo', label: '모', steps: 5, grantsExtraTurn: true, weight: 1 },
]

const weightedYutPool = YUT_RESULTS.flatMap((result) => Array.from({ length: result.weight }, () => result))

const app = express()
const httpServer = createServer(app)

app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
})

const rooms = new Map()
const now = () => new Date().toISOString()

const createInitialGameState = (maxPlayers, gameType = 'yut') => ({
  gameType,
  status: 'waiting',
  maxPlayers,
  players: [],
  turn: {
    playerIndex: 0,
    currentPlayerId: null,
    pendingMoves: [],
    extraTurnCount: 0,
    mustThrow: false,
    legalMoves: {},
  },
  board: {
    routes: ROUTES,
    pieces: [],
  },
  lastAction: null,
  winnerPlayerId: null,
  updatedAt: now(),
})

const makeRoomCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''

  do {
    code = Array.from({ length: ROOM_CODE_LENGTH }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
      '',
    )
  } while (rooms.has(code))

  return code
}

const makeMoveId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const sanitizeNickname = (nickname) => {
  if (typeof nickname !== 'string') return ''
  return nickname.trim().slice(0, 16)
}

const sanitizeMaxPlayers = (maxPlayers) => {
  const parsed = Number(maxPlayers)
  if (!Number.isInteger(parsed)) return 2
  return Math.min(5, Math.max(2, parsed))
}

const sanitizeGameType = (gameType) => {
  return gameType === 'word' ? 'word' : 'yut'
}

const getPublicPlayer = (player) => ({
  id: player.id,
  nickname: player.nickname,
  isHost: player.isHost,
  color: player.color,
})

const getRoute = (routeName) => ROUTES[routeName] ?? ROUTES.outer

const getBoardKey = (piece) => {
  if (piece.state !== 'active') return piece.state
  return getRoute(piece.route)[piece.position] ?? 'finished'
}

const sameStack = (a, b) => {
  return a.playerId === b.playerId && a.state === 'active' && b.state === 'active' && getBoardKey(a) === getBoardKey(b)
}

const syncGamePlayers = (room) => {
  room.gameState.players = room.players.map(getPublicPlayer)

  if (room.gameState.status !== 'playing' && room.gameState.status !== 'finished') {
    room.gameState.status = room.players.length === room.gameState.maxPlayers ? 'ready' : 'waiting'
  }
}

const canMovePiece = (piece, steps) => {
  if (piece.state === 'finished') return false
  if (piece.state === 'home') return steps > 0
  if (steps < 0) return piece.position >= 0
  return true
}

const updateLegalMoves = (gameState) => {
  const currentPlayerId = gameState.turn.currentPlayerId
  const legalMoves = {}

  for (const move of gameState.turn.pendingMoves) {
    legalMoves[move.id] = gameState.board.pieces
      .filter((piece) => piece.playerId === currentPlayerId)
      .filter((piece) => canMovePiece(piece, move.steps))
      .map((piece) => piece.id)
  }

  gameState.turn.legalMoves = legalMoves
}

const touchGameState = (room, message, type = 'system') => {
  syncGamePlayers(room)
  updateLegalMoves(room.gameState)
  room.gameState.lastAction = message
    ? {
        type,
        message,
        at: now(),
      }
    : room.gameState.lastAction
  room.gameState.updatedAt = now()
}

const getPublicRoom = (room) => {
  touchGameState(room)

  return {
    code: room.code,
    gameType: room.gameType,
    hostId: room.hostId,
    players: room.players.map(getPublicPlayer),
    gameState: room.gameState,
  }
}

const emitPlayersUpdated = (room) => {
  io.to(room.code).emit('playersUpdated', {
    roomCode: room.code,
    players: room.players.map(getPublicPlayer),
  })
}

const emitGameStateUpdated = (room) => {
  touchGameState(room)

  io.to(room.code).emit('gameStateUpdated', {
    roomCode: room.code,
    gameState: room.gameState,
  })
}

const findCurrentRoom = (socket) => {
  const roomCode = socket.data.roomCode
  return roomCode ? rooms.get(roomCode) : null
}

const createPieces = (players) => {
  return players.flatMap((player) =>
    Array.from({ length: PIECES_PER_PLAYER }, (_item, index) => ({
      id: `${player.id}-${index}`,
      playerId: player.id,
      index,
      route: 'outer',
      position: -1,
      state: 'home',
    })),
  )
}

const rollYut = () => {
  const result = weightedYutPool[Math.floor(Math.random() * weightedYutPool.length)]

  return {
    id: makeMoveId(),
    name: result.name,
    label: result.label,
    steps: result.steps,
    grantsExtraTurn: result.grantsExtraTurn,
  }
}

const setTurnPlayer = (gameState, playerIndex) => {
  const boundedIndex = playerIndex % gameState.players.length

  gameState.turn.playerIndex = boundedIndex
  gameState.turn.currentPlayerId = gameState.players[boundedIndex]?.id ?? null
  gameState.turn.mustThrow = true
  gameState.turn.pendingMoves = []
  gameState.turn.extraTurnCount = 0
  gameState.turn.legalMoves = {}
}

const advanceTurn = (gameState) => {
  if (gameState.turn.extraTurnCount > 0) {
    gameState.turn.extraTurnCount -= 1
    gameState.turn.mustThrow = true
    return
  }

  setTurnPlayer(gameState, gameState.turn.playerIndex + 1)
}

const chooseForwardRoute = (piece) => {
  if (piece.route !== 'outer') return piece.route
  return SHORTCUT_BY_OUTER_INDEX[piece.position] ?? piece.route
}

const getNextLocation = (piece, steps) => {
  if (piece.state === 'home') {
    return steps > 0
      ? {
          state: 'active',
          route: 'outer',
          position: steps - 1,
        }
      : {
          state: 'home',
          route: 'outer',
          position: -1,
        }
  }

  if (steps < 0) {
    if (piece.route === 'outer') {
      const nextPosition = piece.position - 1
      return nextPosition < 0
        ? { state: 'home', route: 'outer', position: -1 }
        : { state: 'active', route: 'outer', position: nextPosition }
    }

    if (piece.position === 0) {
      const outerStart = Number(getRoute(piece.route)[0].slice(1))
      return { state: 'active', route: 'outer', position: outerStart - 1 }
    }

    return { state: 'active', route: piece.route, position: piece.position - 1 }
  }

  const route = chooseForwardRoute(piece)
  const routePath = getRoute(route)
  const startPosition = route === piece.route ? piece.position : 0
  const nextPosition = startPosition + steps

  if (nextPosition >= routePath.length - 1) {
    return { state: 'finished', route, position: routePath.length - 1 }
  }

  return { state: 'active', route, position: nextPosition }
}

const setPieceLocation = (piece, location) => {
  piece.state = location.state
  piece.route = location.route
  piece.position = location.position
}

const getMovingStack = (gameState, piece) => {
  if (piece.state !== 'active') return [piece]
  return gameState.board.pieces.filter((target) => sameStack(piece, target))
}

const applyMove = (gameState, piece, move) => {
  const movingStack = getMovingStack(gameState, piece)
  const location = getNextLocation(piece, move.steps)

  for (const movingPiece of movingStack) {
    setPieceLocation(movingPiece, location)
  }

  let capturedPieces = []

  if (location.state === 'active') {
    const movedKey = getBoardKey(piece)

    capturedPieces = gameState.board.pieces.filter(
      (target) => target.playerId !== piece.playerId && target.state === 'active' && getBoardKey(target) === movedKey,
    )

    for (const capturedPiece of capturedPieces) {
      capturedPiece.route = 'outer'
      capturedPiece.position = -1
      capturedPiece.state = 'home'
    }
  }

  if (capturedPieces.length > 0) {
    gameState.turn.extraTurnCount += 1
  }

  const playerPieces = gameState.board.pieces.filter((target) => target.playerId === piece.playerId)
  const hasWon = playerPieces.every((target) => target.state === 'finished')

  if (hasWon) {
    gameState.status = 'finished'
    gameState.winnerPlayerId = piece.playerId
    gameState.turn.mustThrow = false
    gameState.turn.pendingMoves = []
    gameState.turn.extraTurnCount = 0
  }

  return {
    capturedPieces,
    movedPieces: movingStack,
  }
}

const leaveCurrentRoom = (socket) => {
  const roomCode = socket.data.roomCode
  if (!roomCode) return

  const room = rooms.get(roomCode)
  socket.leave(roomCode)
  socket.data.roomCode = null

  if (!room) return

  room.players = room.players.filter((player) => player.id !== socket.id)

  if (room.players.length === 0) {
    rooms.delete(roomCode)
    return
  }

  if (room.hostId === socket.id) {
    room.hostId = room.players[0].id
    room.players = room.players.map((player, index) => ({
      ...player,
      isHost: index === 0,
    }))
  }

  if (room.gameState.status === 'playing') {
    room.gameState.status = 'waiting'
    room.gameState.turn.mustThrow = false
    room.gameState.turn.pendingMoves = []
    room.gameState.lastAction = {
      type: 'player-left',
      message: '플레이어가 나가서 게임이 대기 상태로 돌아갔습니다.',
      at: now(),
    }
  }

  syncGamePlayers(room)
  emitPlayersUpdated(room)
  emitGameStateUpdated(room)
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    rooms: rooms.size,
  })
})

io.on('connection', (socket) => {
  socket.data.roomCode = null

  socket.on('createRoom', ({ nickname, maxPlayers, gameType } = {}, callback) => {
    const safeNickname = sanitizeNickname(nickname)
    const safeMaxPlayers = sanitizeMaxPlayers(maxPlayers)
    const safeGameType = sanitizeGameType(gameType)

    if (!safeNickname) {
      callback?.({ ok: false, error: '닉네임을 입력해주세요.' })
      return
    }

    if (safeGameType !== 'yut') {
      callback?.({ ok: false, error: '아직 준비 중인 게임입니다.' })
      return
    }

    leaveCurrentRoom(socket)

    const roomCode = makeRoomCode()
    const player = {
      id: socket.id,
      nickname: safeNickname,
      isHost: true,
      color: PLAYER_COLORS[0],
    }
    const room = {
      code: roomCode,
      gameType: safeGameType,
      hostId: socket.id,
      players: [player],
      gameState: createInitialGameState(safeMaxPlayers, safeGameType),
    }

    syncGamePlayers(room)
    rooms.set(roomCode, room)
    socket.join(roomCode)
    socket.data.roomCode = roomCode

    const publicRoom = getPublicRoom(room)

    socket.emit('roomCreated', publicRoom)
    emitPlayersUpdated(room)
    emitGameStateUpdated(room)
    callback?.({ ok: true, room: publicRoom })
  })

  socket.on('joinRoom', ({ roomCode, nickname } = {}, callback) => {
    const safeNickname = sanitizeNickname(nickname)
    const safeRoomCode = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : ''
    const room = rooms.get(safeRoomCode)

    if (!safeNickname) {
      callback?.({ ok: false, error: '닉네임을 입력해주세요.' })
      return
    }

    if (!room) {
      callback?.({ ok: false, error: '존재하지 않는 방입니다.' })
      return
    }

    if (room.gameState.status === 'playing' || room.gameState.status === 'finished') {
      callback?.({ ok: false, error: '이미 게임이 시작된 방입니다.' })
      return
    }

    if (room.players.length >= room.gameState.maxPlayers) {
      callback?.({ ok: false, error: '방이 가득 찼습니다.' })
      return
    }

    leaveCurrentRoom(socket)

    const player = {
      id: socket.id,
      nickname: safeNickname,
      isHost: false,
      color: PLAYER_COLORS[room.players.length],
    }

    room.players.push(player)
    syncGamePlayers(room)
    socket.join(safeRoomCode)
    socket.data.roomCode = safeRoomCode

    const publicRoom = getPublicRoom(room)

    socket.emit('roomJoined', publicRoom)
    emitPlayersUpdated(room)
    emitGameStateUpdated(room)
    callback?.({ ok: true, room: publicRoom })
  })

  socket.on('startGame', (callback) => {
    const room = findCurrentRoom(socket)

    if (!room) {
      callback?.({ ok: false, error: '참가 중인 방이 없습니다.' })
      return
    }

    if (room.hostId !== socket.id) {
      callback?.({ ok: false, error: '방장만 게임을 시작할 수 있습니다.' })
      return
    }

    if (room.players.length !== room.gameState.maxPlayers) {
      callback?.({ ok: false, error: '최대 인원이 모두 들어와야 시작할 수 있습니다.' })
      return
    }

    room.gameState.status = 'playing'
    room.gameState.winnerPlayerId = null
    room.gameState.board.pieces = createPieces(room.players)
    setTurnPlayer(room.gameState, 0)
    touchGameState(room, '게임이 시작되었습니다.', 'start')
    emitGameStateUpdated(room)
    callback?.({ ok: true, gameState: room.gameState })
  })

  socket.on('throwYut', (callback) => {
    const room = findCurrentRoom(socket)

    if (!room) {
      callback?.({ ok: false, error: '참가 중인 방이 없습니다.' })
      return
    }

    const gameState = room.gameState

    if (gameState.status !== 'playing') {
      callback?.({ ok: false, error: '게임이 진행 중이 아닙니다.' })
      return
    }

    if (gameState.turn.currentPlayerId !== socket.id) {
      callback?.({ ok: false, error: '현재 턴이 아닙니다.' })
      return
    }

    if (!gameState.turn.mustThrow) {
      callback?.({ ok: false, error: '먼저 말을 이동해주세요.' })
      return
    }

    const result = rollYut()
    gameState.turn.pendingMoves.push(result)
    gameState.turn.mustThrow = false

    if (result.grantsExtraTurn) {
      gameState.turn.extraTurnCount += 1
    }

    updateLegalMoves(gameState)

    if (gameState.turn.legalMoves[result.id]?.length === 0) {
      gameState.turn.pendingMoves = gameState.turn.pendingMoves.filter((move) => move.id !== result.id)
      touchGameState(room, `${result.label}가 나왔지만 움직일 수 있는 말이 없습니다.`, 'throw')
      advanceTurn(gameState)
    } else {
      touchGameState(room, `${result.label}가 나왔습니다.`, 'throw')
    }

    emitGameStateUpdated(room)
    callback?.({ ok: true, result, gameState })
  })

  socket.on('movePiece', ({ pieceId, throwId } = {}, callback) => {
    const room = findCurrentRoom(socket)

    if (!room) {
      callback?.({ ok: false, error: '참가 중인 방이 없습니다.' })
      return
    }

    const gameState = room.gameState

    if (gameState.status !== 'playing') {
      callback?.({ ok: false, error: '게임이 진행 중이 아닙니다.' })
      return
    }

    if (gameState.turn.currentPlayerId !== socket.id) {
      callback?.({ ok: false, error: '현재 턴이 아닙니다.' })
      return
    }

    if (gameState.turn.mustThrow) {
      callback?.({ ok: false, error: '먼저 윷을 던져주세요.' })
      return
    }

    const move = gameState.turn.pendingMoves.find((pendingMove) => pendingMove.id === throwId)
    const piece = gameState.board.pieces.find((target) => target.id === pieceId)

    if (!move) {
      callback?.({ ok: false, error: '사용할 수 없는 윷 결과입니다.' })
      return
    }

    if (!piece || piece.playerId !== socket.id) {
      callback?.({ ok: false, error: '자신의 말만 이동할 수 있습니다.' })
      return
    }

    if (!canMovePiece(piece, move.steps)) {
      callback?.({ ok: false, error: '이 윷 결과로 이동할 수 없는 말입니다.' })
      return
    }

    gameState.turn.pendingMoves = gameState.turn.pendingMoves.filter((pendingMove) => pendingMove.id !== throwId)

    const { capturedPieces, movedPieces } = applyMove(gameState, piece, move)
    const player = room.players.find((target) => target.id === socket.id)
    const stackText = movedPieces.length > 1 ? ` 업힌 말 ${movedPieces.length}개가 함께 이동했습니다.` : ''
    const captureText = capturedPieces.length > 0 ? ` 상대 말 ${capturedPieces.length}개를 잡았습니다.` : ''

    if (gameState.status === 'finished') {
      touchGameState(room, `${player?.nickname ?? '플레이어'}님이 승리했습니다.`, 'finish')
    } else if (gameState.turn.pendingMoves.length === 0) {
      advanceTurn(gameState)
      touchGameState(room, `${move.label}로 말을 이동했습니다.${stackText}${captureText}`, 'move')
    } else {
      touchGameState(room, `${move.label}로 말을 이동했습니다.${stackText}${captureText}`, 'move')
    }

    emitGameStateUpdated(room)
    callback?.({ ok: true, gameState })
  })

  socket.on('updateGameState', (_payload = {}, callback) => {
    callback?.({ ok: false, error: '게임 상태는 서버 게임 이벤트로만 변경할 수 있습니다.' })
  })

  socket.on('leaveRoom', (callback) => {
    leaveCurrentRoom(socket)
    callback?.({ ok: true })
  })

  socket.on('disconnect', () => {
    leaveCurrentRoom(socket)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server listening on http://localhost:${PORT}`)
})
