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

const pointFor = (pointId) => boardPoints.find((point) => point.id === pointId)

const toPolylinePoints = (route) =>
  route
    .map(pointFor)
    .filter(Boolean)
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
</script>

<template>
  <section class="board-wrap" aria-label="윷놀이 판">
    <div class="board">
      <svg class="board-lines" :viewBox="`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`" aria-hidden="true">
        <polyline
          v-for="(route, index) in routeLines"
          :key="index"
          :points="toPolylinePoints(route)"
          fill="none"
          :stroke="index === 0 ? '#1f2937' : '#8b5cf6'"
          :stroke-width="index === 0 ? 1.25 : 0.85"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>

      <div
        v-for="point in boardPoints"
        :key="point.id"
        class="board-cell"
        :class="point.type"
        :style="{ left: `${point.x}%`, top: `${point.y}%` }"
        :title="String(point.id)"
      >
        <span v-if="point.type === 'start'" class="cell-label">출발</span>
      </div>

      <span class="waiting-label">대기</span>

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
    </div>
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
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  min-height: 320px;
}

.board-lines {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
}

.board-cell {
  position: absolute;
  z-index: 2;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 3px solid #111827;
  border-radius: 999px;
  background: #ffffff;
  transform: translate(-50%, -50%);
}

.board-cell.corner,
.board-cell.start {
  width: 42px;
  height: 42px;
  border-width: 4px;
}

.board-cell.center {
  width: 46px;
  height: 46px;
  background: #ede9fe;
  border-width: 4px;
}

.board-cell.shortcut {
  width: 32px;
  height: 32px;
}

.cell-label {
  color: #111827;
  font-size: 9px;
  font-weight: 950;
}

.waiting-label {
  position: absolute;
  right: 2.5%;
  bottom: 0.8%;
  color: #111827;
  font-size: 0.78rem;
  font-weight: 950;
}
</style>
