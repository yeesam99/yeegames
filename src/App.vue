<script setup>
import GameBoard from './components/GameBoard.vue'
import PlayerPanel from './components/PlayerPanel.vue'
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
      <PlayerPanel class="player-panel" :players="state.players" :current-player-id="currentPlayer.id" />

      <section class="panel log-panel">
        <h2>로그</h2>
        <p v-for="log in state.logs" :key="log">{{ log }}</p>
      </section>

      <TurnStatus
        class="status-panel"
        :current-player="currentPlayer"
        :phase="state.phase"
        :message="state.message"
        :extra-turn="state.extraTurn"
        :captured="state.lastCaptured"
        :winner="getWinner()"
      />

      <GameBoard
        class="board-panel"
        :players="state.players"
        :pieces="representativePieces"
        :movable-piece-ids="state.movablePieces"
        :get-piece-render-position="getPieceRenderPosition"
        @select-piece="selectPiece"
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
  grid-template-columns: 260px minmax(0, 1fr) 260px;
  grid-template-rows: auto 1fr;
  gap: 16px;
  align-items: stretch;
}

.player-panel,
.log-panel,
.status-panel,
.board-panel,
.control-panel,
.movable-panel {
  width: 100%;
  min-width: 0;
}

.player-panel {
  grid-column: 1;
  grid-row: 1;
}

.log-panel {
  grid-column: 1;
  grid-row: 2;
}

.status-panel {
  grid-column: 2;
  grid-row: 1;
}

.board-panel {
  grid-column: 2;
  grid-row: 2;
}

.control-panel {
  grid-column: 3;
  grid-row: 1;
}

.movable-panel {
  grid-column: 3;
  grid-row: 2;
  align-content: start;
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

.log-panel {
  max-height: min(620px, calc(100vh - 170px));
  overflow: auto;
}

.log-panel p {
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

.muted {
  color: #666666;
}

@media (max-width: 1080px) {
  .main-layout {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }

  .player-panel,
  .log-panel,
  .status-panel,
  .board-panel,
  .control-panel,
  .movable-panel {
    grid-column: 1;
    grid-row: auto;
  }
}
</style>
