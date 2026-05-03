import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'

const PORT = process.env.PORT || 4000
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'https://yeegames.vercel.app']
const corsOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : allowedOrigins
const corsOptions = {
  origin: corsOrigins,
  credentials: true,
}

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

app.use(cors(corsOptions))
app.use(express.json())

const rooms = new Map()

const clampMaxPlayers = (value) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return 2
  return Math.min(5, Math.max(2, parsed))
}

const sanitizeText = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback
  return value.trim().slice(0, 32) || fallback
}

const publicRoom = (room) => ({
  id: room.id,
  name: room.name,
  hostUserId: room.hostUserId,
  players: room.players,
  maxPlayers: room.maxPlayers,
  status: room.status,
  createdAt: room.createdAt,
})

const getRooms = () =>
  [...rooms.values()]
    .map(publicRoom)
    .sort((a, b) => b.createdAt - a.createdAt)

const emitRooms = () => {
  io.emit('lobby:rooms', { rooms: getRooms() })
}

const emitRoom = (room) => {
  io.to(room.id).emit('room:updated', { room: publicRoom(room) })
}

const emitError = (socket, message) => {
  socket.emit('room:error', { message })
}

const findPlayer = (room, userId) => room.players.find((player) => player.userId === userId)

const canStartRoom = (room, userId) => {
  if (room.hostUserId !== userId) return { ok: false, message: '방장만 게임을 시작할 수 있습니다.' }
  if (room.status !== 'WAITING') return { ok: false, message: '대기 중인 방만 시작할 수 있습니다.' }
  if (room.players.length < 2) return { ok: false, message: '최소 2명 이상 필요합니다.' }
  if (room.players.length > 5) return { ok: false, message: '최대 5명까지 가능합니다.' }

  const notReady = room.players.filter((player) => player.userId !== room.hostUserId && !player.ready)
  if (notReady.length > 0) return { ok: false, message: '아직 준비하지 않은 플레이어가 있습니다.' }

  return { ok: true }
}

io.on('connection', (socket) => {
  console.log(`client connected: ${socket.id}`)

  socket.data.userId = null
  socket.data.nickname = null

  socket.on('session:join', ({ userId, nickname } = {}) => {
    const safeUserId = sanitizeText(userId, uuidv4())
    const safeNickname = sanitizeText(nickname, '플레이어')

    socket.data.userId = safeUserId
    socket.data.nickname = safeNickname

    for (const room of rooms.values()) {
      const player = findPlayer(room, safeUserId)
      if (player) {
        player.socketId = socket.id
        player.nickname = safeNickname
        player.connected = true
        socket.join(room.id)
        emitRoom(room)
      }
    }

    socket.emit('session:joined', { userId: safeUserId, nickname: safeNickname })
    socket.emit('lobby:rooms', { rooms: getRooms() })
  })

  socket.on('lobby:getRooms', () => {
    socket.emit('lobby:rooms', { rooms: getRooms() })
  })

  socket.on('room:create', ({ name, maxPlayers, userId, nickname } = {}) => {
    const safeUserId = sanitizeText(userId, socket.data.userId || uuidv4())
    const safeNickname = sanitizeText(nickname, socket.data.nickname || '플레이어')
    const room = {
      id: uuidv4(),
      name: sanitizeText(name, `${safeNickname}의 방`),
      hostUserId: safeUserId,
      players: [
        {
          userId: safeUserId,
          socketId: socket.id,
          nickname: safeNickname,
          ready: false,
          connected: true,
        },
      ],
      maxPlayers: clampMaxPlayers(maxPlayers),
      status: 'WAITING',
      createdAt: Date.now(),
    }

    rooms.set(room.id, room)
    socket.join(room.id)
    emitRooms()
    emitRoom(room)
  })

  socket.on('room:join', ({ roomId, userId, nickname } = {}) => {
    const room = rooms.get(roomId)
    if (!room) return emitError(socket, '존재하지 않는 방입니다.')
    if (room.status !== 'WAITING') return emitError(socket, '이미 시작된 방입니다.')

    const safeUserId = sanitizeText(userId, socket.data.userId || uuidv4())
    const safeNickname = sanitizeText(nickname, socket.data.nickname || '플레이어')
    const existing = findPlayer(room, safeUserId)

    if (!existing && room.players.length >= room.maxPlayers) {
      return emitError(socket, '방 인원이 가득 찼습니다.')
    }

    if (existing) {
      existing.socketId = socket.id
      existing.nickname = safeNickname
      existing.connected = true
    } else {
      room.players.push({
        userId: safeUserId,
        socketId: socket.id,
        nickname: safeNickname,
        ready: false,
        connected: true,
      })
    }

    socket.join(room.id)
    emitRoom(room)
    emitRooms()
  })

  socket.on('room:leave', ({ roomId, userId } = {}) => {
    const room = rooms.get(roomId)
    if (!room) return

    room.players = room.players.filter((player) => player.userId !== userId)
    socket.leave(room.id)

    if (room.players.length === 0) {
      rooms.delete(room.id)
      emitRooms()
      return
    }

    if (room.hostUserId === userId) {
      room.hostUserId = room.players[0].userId
      room.players[0].ready = false
    }

    emitRoom(room)
    emitRooms()
  })

  socket.on('room:ready', ({ roomId, userId, ready } = {}) => {
    const room = rooms.get(roomId)
    if (!room) return emitError(socket, '존재하지 않는 방입니다.')

    const player = findPlayer(room, userId)
    if (!player) return emitError(socket, '방 참가자가 아닙니다.')

    player.ready = Boolean(ready)
    emitRoom(room)
  })

  socket.on('room:startGame', ({ roomId, userId } = {}) => {
    const room = rooms.get(roomId)
    if (!room) return emitError(socket, '존재하지 않는 방입니다.')

    const result = canStartRoom(room, userId)
    if (!result.ok) return emitError(socket, result.message)

    room.status = 'PLAYING'
    emitRoom(room)
    io.to(room.id).emit('room:gameStarted', { roomId: room.id, room: publicRoom(room) })
    emitRooms()
  })

  socket.on('room:get', ({ roomId } = {}) => {
    const room = rooms.get(roomId)
    if (!room) return emitError(socket, '존재하지 않는 방입니다.')

    socket.join(room.id)
    socket.emit('room:updated', { room: publicRoom(room) })
  })

  socket.on('disconnect', () => {
    console.log(`client disconnected: ${socket.id}`)

    for (const room of rooms.values()) {
      const player = room.players.find((item) => item.socketId === socket.id)
      if (!player) continue

      player.connected = false
      emitRoom(room)
    }
    emitRooms()
  })
})

app.get('/', (_req, res) => {
  res.send('Yut Socket Server OK')
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size })
})

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})
