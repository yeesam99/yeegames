import { io } from 'socket.io-client'

// Vercel 환경변수 설정 필요:
// VITE_SOCKET_URL=https://yeegames.onrender.com
const LOCAL_SOCKET_URL = `http://localhost:${4000}`
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || LOCAL_SOCKET_URL

console.log('[socket] connecting to:', SOCKET_URL)

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
})

socket.on('connect', () => {
  console.log('socket connected:', socket.id)
})

socket.on('connect_error', (err) => {
  console.error('socket connection error:', err)
})

socket.connect()
