import { createRouter, createWebHistory } from 'vue-router'
import LobbyView from '../views/LobbyView.vue'
import RoomView from '../views/RoomView.vue'
import GameView from '../views/GameView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/lobby' },
    { path: '/lobby', component: LobbyView },
    { path: '/room/:roomId', component: RoomView, props: true },
    { path: '/game/:roomId', component: GameView, props: true },
  ],
})
