<script setup>
import GameBoard from './components/GameBoard.vue'
import RouteSelector from './components/RouteSelector.vue'
import TurnStatus from './components/TurnStatus.vue'
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

const getWinner = () => state.players.find((player) => player.id === state.winner) ?? null
const finishedCount = (player) => player.pieces.filter((piece) => piece.status === 'FINISHED').length
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span>Y</span>
        <strong>YUT</strong>
      </div>
      <button class="reset-button" type="button" @click="resetGame">새 게임</button>
    </header>

    <section class="main-layout">
      <section class="panel left-panel">
        <h2>로그</h2>
        <p v-for="log in state.logs" :key="log">{{ log }}</p>
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
        <section class="panel player-summary">
          <h2>플레이어 요약</h2>
          <article v-for="player in state.players" :key="player.id" class="summary-row" :class="{ active: player.id === currentPlayer.id }">
            <span class="color-dot" :style="{ background: player.color }"></span>
            <strong>{{ player.name }}</strong>
            <em>{{ finishedCount(player) }} / 4</em>
          </article>
        </section>

        <section class="panel status-summary">
          <h2>상태 요약</h2>
          <p>현재 턴: <strong>{{ currentPlayer.name }}</strong></p>
          <p>게임 상태: <strong>{{ state.phase }}</strong></p>
          <p>윷 결과: <strong>{{ state.currentResult?.label ?? '-' }}</strong></p>
          <p>추가 턴: <strong>{{ state.extraTurn ? '있음' : '없음' }}</strong></p>
        </section>

        <TurnStatus
          class="compact-status"
          :current-player="currentPlayer"
          :phase="state.phase"
          :message="state.message"
          :extra-turn="state.extraTurn"
          :captured="state.lastCaptured"
          :winner="getWinner()"
        />

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
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #ffffff;
  color: #111111;
  padding: 24px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.brand span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 2px solid #111111;
  border-radius: 10px;
  font-weight: 950;
}

.brand strong {
  font-weight: 950;
  letter-spacing: 0.08em;
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

.main-layout {
  display: grid;
  min-height: calc(100vh - 78px);
  grid-template-columns: 240px minmax(0, 1fr) 320px;
  grid-template-rows: 1fr;
  gap: 16px;
  align-items: stretch;
}

.left-panel,
.center-panel,
.right-panel {
  width: 100%;
  min-width: 0;
}

.left-panel {
  grid-column: 1;
  overflow-y: auto;
}

.center-panel {
  display: flex;
  grid-column: 2;
  align-items: center;
  justify-content: center;
}

.board-container {
  width: 80%;
  max-width: 780px;
}

.right-panel {
  display: flex;
  grid-column: 3;
  max-height: calc(100vh - 88px);
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.panel {
  display: grid;
  gap: 10px;
  border: 2px solid #111111;
  border-radius: 14px;
  background: #ffffff;
  padding: 16px;
}

h2,
p {
  margin: 0;
}

.left-panel p {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 800;
}

.piece-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
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

.muted {
  color: #666666;
}

@media (max-width: 1080px) {
  .main-layout {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }

  .left-panel,
  .center-panel,
  .right-panel {
    grid-column: 1;
  }

  .board-container {
    width: 100%;
  }

  .right-panel {
    max-height: none;
    overflow: visible;
  }
}
</style>
