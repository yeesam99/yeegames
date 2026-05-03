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

    <section class="game-layout">
      <aside class="left-panel">
        <PlayerPanel :players="state.players" :current-player-id="currentPlayer.id" />

        <section class="panel log-panel">
          <h2>로그</h2>
          <p v-for="log in state.logs" :key="log">{{ log }}</p>
        </section>
      </aside>

      <section class="center-panel">
        <TurnStatus
          :current-player="currentPlayer"
          :phase="state.phase"
          :message="state.message"
          :extra-turn="state.extraTurn"
          :captured="state.lastCaptured"
          :winner="getWinner()"
        />

        <GameBoard
          :players="state.players"
          :pieces="representativePieces"
          :movable-piece-ids="state.movablePieces"
          :get-piece-render-position="getPieceRenderPosition"
          @select-piece="selectPiece"
        />
      </section>

      <aside class="right-panel">
        <YutControls
          :phase="state.phase"
          :current-result="state.currentResult"
          :disabled="state.phase !== GamePhase.IDLE || state.phase === GamePhase.GAME_OVER"
          @roll="rollYut"
        />

        <RouteSelector
          :visible="state.phase === GamePhase.SELECTING_ROUTE"
          :options="state.routeOptions"
          @select="selectRoute"
        />

        <section class="panel">
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
  margin-bottom: 22px;
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

.game-layout {
  display: grid;
  grid-template-columns: 260px minmax(420px, 1fr) 280px;
  gap: 18px;
  align-items: start;
}

.left-panel,
.center-panel,
.right-panel {
  display: grid;
  gap: 14px;
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
  max-height: 320px;
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
  .game-layout {
    grid-template-columns: 1fr;
  }
}
</style>
