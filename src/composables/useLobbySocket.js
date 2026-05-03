import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { socket } from '../services/socket'
import { useSession } from './useSession'

const rooms = ref([])
const currentRoom = ref(null)
const errorMessage = ref('')
const connected = ref(false)
let listenersReady = false

export const useLobbySocket = () => {
  const router = useRouter()
  const { userId, nickname } = useSession()

  const registerListeners = () => {
    if (listenersReady) return
    listenersReady = true

    socket.on('connect', () => {
      connected.value = true
      if (nickname.value) socket.emit('session:join', { userId: userId.value, nickname: nickname.value })
    })

    socket.on('disconnect', () => {
      connected.value = false
    })

    socket.on('session:joined', (session) => {
      errorMessage.value = ''
      console.log('[socket] session joined', session)
    })

    socket.on('lobby:rooms', ({ rooms: nextRooms }) => {
      rooms.value = nextRooms
    })

    socket.on('room:updated', ({ room }) => {
      currentRoom.value = room
      rooms.value = rooms.value.map((item) => (item.id === room.id ? room : item))
    })

    socket.on('room:error', ({ message }) => {
      errorMessage.value = message
    })

    socket.on('room:gameStarted', ({ roomId, room }) => {
      currentRoom.value = room
      router.push(`/game/${roomId}`)
    })
  }

  const connect = () => {
    registerListeners()
    if (!socket.connected) socket.connect()
    else if (nickname.value) socket.emit('session:join', { userId: userId.value, nickname: nickname.value })
  }

  const joinSession = () => {
    connect()
    socket.emit('session:join', { userId: userId.value, nickname: nickname.value })
  }

  const getRooms = () => {
    connect()
    socket.emit('lobby:getRooms')
  }

  const createRoom = ({ name, maxPlayers }) => {
    errorMessage.value = ''
    socket.emit('room:create', {
      name,
      maxPlayers,
      userId: userId.value,
      nickname: nickname.value,
    })
  }

  const joinRoom = (roomId) => {
    errorMessage.value = ''
    socket.emit('room:join', { roomId, userId: userId.value, nickname: nickname.value })
    router.push(`/room/${roomId}`)
  }

  const leaveRoom = (roomId) => {
    socket.emit('room:leave', { roomId, userId: userId.value })
    currentRoom.value = null
    router.push('/lobby')
  }

  const setReady = (roomId, ready) => {
    socket.emit('room:ready', { roomId, userId: userId.value, ready })
  }

  const startGame = (roomId) => {
    socket.emit('room:startGame', { roomId, userId: userId.value })
  }

  const getRoom = (roomId) => {
    connect()
    socket.emit('room:get', { roomId })
  }

  onBeforeUnmount(() => {
    // Shared singleton listeners stay active for route transitions.
  })

  return {
    socket,
    rooms,
    currentRoom,
    errorMessage,
    connected,
    connect,
    joinSession,
    getRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    getRoom,
  }
}
