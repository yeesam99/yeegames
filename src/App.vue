<script setup>
import GameBoard from './components/GameBoard.vue'
import RouteSelector from './components/RouteSelector.vue'
import YutControls from './components/YutControls.vue'
import { GamePhase, useYutGame } from './composables/useYutGame'

const {
  state,
  currentPlayer,
  representativePieces,
  rollYut,
  selectPiece,
  selectRoute,
  getPieceRenderPosition,
  resetGame,
} = useYutGame()

const finishedCount = (player) => player.pieces.filter((piece) => piece.status === 'FINISHED').length
</script>

<template>
  <main class="main-layout">
    <section class="left-panel">
      <section class="panel player-summary">
        <div class="panel-header">
          <h2>플레이어 요약</h2>
          <button class="reset-button" type="button" @click="resetGame">새 게임</button>
        </div>
        <article v-for="player in state.players" :key="player.id" class="summary-row" :class="{ active: player.id === currentPlayer.id }">
          <span class="color-dot" :style="{ background: player.color }"></span>
          <strong>{{ player.name }}</strong>
          <em>{{ finishedCount(player) }} / 4</em>
        </article>
      </section>

      <section class="panel log-panel">
        <h2>로그</h2>
        <p v-for="log in state.logs" :key="log">{{ log }}</p>
      </section>
    </section>

    <section class="center-panel">
      <GameBoard
        class="board-container"
        :players="state.players"
        :pieces="representativePieces"
        :movable-piece-ids="state.movablePieces"
        :get-piece-render-position="getPieceRenderPosition"
        @select-piece="selectPiece"
      />
    </section>

    <aside class="right-panel" aria-label="게임 컨트롤과 상태 요약">
      <section class="panel status-summary">
        <h2>상태 요약</h2>
        <p>현재 턴: <strong>{{ currentPlayer.name }}</strong></p>
        <p>게임 상태: <strong>{{ state.phase }}</strong></p>
        <p>안내: <strong>{{ state.message }}</strong></p>
        <p>윷 결과: <strong>{{ state.currentResult?.label ?? '-' }}</strong></p>
        <p>추가 턴: <strong>{{ state.extraTurn ? '있음' : '없음' }}</strong></p>
        <p>잡기: <strong>{{ state.lastCaptured ? '발생' : '없음' }}</strong></p>
      </section>

      <YutControls
        class="control-panel"
        :phase="state.phase"
        :current-result="state.currentResult"
        :disabled="state.phase !== GamePhase.IDLE || state.phase === GamePhase.GAME_OVER"
        @roll="rollYut"
      />

      <section class="panel movable-panel">
        <RouteSelector
          :visible="state.phase === GamePhase.SELECTING_ROUTE"
          :options="state.routeOptions"
          @select="selectRoute"
        />

        <h2>이동 가능한 말</h2>
        <div v-if="state.movablePieces.length" class="piece-list">
          <button v-for="pieceId in state.movablePieces" :key="pieceId" type="button" @click="selectPiece(pieceId)">
            {{ pieceId }}
          </button>
        </div>
        <p v-else class="muted">윷을 던지면 표시됩니다.</p>
      </section>
    </aside>
  </main>
</template>

<style scoped>
.main-layout {
  box-sizing: border-box;
  display: grid;
  width: 100%;
  height: 100vh;
  grid-template-columns: 260px minmax(0, 1fr) 300px;
  grid-template-rows: 1fr;
  gap: 16px;
  overflow: hidden;
  background: #ffffff;
  color: #111111;
  padding: 16px;
}

.left-panel,
.right-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.center-panel {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.board-container {
  width: 80%;
  max-width: 780px;
}

.panel {
  display: grid;
  gap: 10px;
  border: 2px solid #111111;
  border-radius: 14px;
  background: #ffffff;
  padding: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

h2,
p {
  margin: 0;
}

.reset-button,
.piece-list button {
  min-height: 42px;
  border: 2px solid #111111;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 900;
  padding: 0 14px;
}

.log-panel {
  flex: 1;
  align-content: start;
  overflow-y: auto;
}

.log-panel p {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 800;
}

.summary-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border: 2px solid #111111;
  border-radius: 12px;
  padding: 10px;
}

.summary-row.active {
  background: #f4f4f5;
}

.summary-row em {
  color: #666666;
  font-style: normal;
  font-weight: 900;
}

.color-dot {
  width: 14px;
  height: 14px;
  border: 2px solid #111111;
  border-radius: 999px;
}

.status-summary strong {
  overflow-wrap: anywhere;
}

.piece-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.muted {
  color: #666666;
}

@media (max-width: 1080px) {
  .main-layout {
    height: auto;
    min-height: 100vh;
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .left-panel,
  .right-panel {
    overflow: visible;
  }

  .board-container {
    width: 100%;
  }
}
</style>
