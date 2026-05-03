<script setup>
import Piece from './Piece.vue'
import { BOARD_SIZE, boardPoints, routeLines } from '../utils/boardRoutes'

defineProps({
  players: {
    type: Array,
    required: true,
  },
  pieces: {
    type: Array,
    required: true,
  },
  movablePieceIds: {
    type: Array,
    default: () => [],
  },
  getPieceRenderPosition: {
    type: Function,
    required: true,
  },
})

defineEmits(['select-piece'])

const getPlayerColor = (players, playerId) => players.find((player) => player.id === playerId)?.color ?? '#111111'

const pointFor = (pointId) => boardPoints[pointId]
</script>

<template>
  <section class="board-wrap">
    <svg class="board" :viewBox="`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`" role="img" aria-label="윷놀이 판">
      <rect x="1" y="1" :width="BOARD_SIZE - 2" :height="BOARD_SIZE - 2" rx="18" fill="#fffaf0" stroke="#111111" stroke-width="2" />

      <polyline
        v-for="(route, index) in routeLines"
        :key="index"
        :points="route.map((pointId) => `${pointFor(pointId).x},${pointFor(pointId).y}`).join(' ')"
        fill="none"
        :stroke="index === 0 ? '#1f2937' : '#8b5cf6'"
        :stroke-width="index === 0 ? 5 : 3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <g v-for="point in boardPoints" :key="point.id">
        <circle :cx="point.x" :cy="point.y" :r="point.id === 23 ? 22 : 18" fill="#ffffff" stroke="#111111" stroke-width="3" />
      </g>

      <text x="584" y="552" class="board-label">완주</text>
      <text x="640" y="704" class="board-label">대기</text>

      <Piece
        v-for="piece in pieces"
        :key="piece.id"
        :piece="piece"
        :x="getPieceRenderPosition(piece).x"
        :y="getPieceRenderPosition(piece).y"
        :color="getPlayerColor(players, piece.playerId)"
        :stack-count="piece.stack.length + 1"
        :selectable="movablePieceIds.includes(piece.id)"
        @select="$emit('select-piece', $event)"
      />
    </svg>
  </section>
</template>

<style scoped>
.board-wrap {
  border: 2px solid #111111;
  border-radius: 18px;
  background: #fffaf0;
  overflow: hidden;
}

.board {
  display: block;
  width: 100%;
  aspect-ratio: 1;
}

.board-label {
  fill: #111111;
  font-size: 16px;
  font-weight: 900;
}
</style>
