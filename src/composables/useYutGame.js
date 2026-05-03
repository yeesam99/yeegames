import { computed, reactive } from 'vue'
import {
  finishedOrigin,
  getBranchOptions,
  getPoint,
  getRouteIndex,
  routes,
  waitingOffsets,
  waitingOrigins,
} from '../utils/boardRoutes'
import { isBackdo, rollYutResult, shouldGrantExtraTurn } from '../utils/yutRules'

export const GamePhase = {
  IDLE: 'IDLE',
  ROLLING: 'ROLLING',
  RESULT_SHOWN: 'RESULT_SHOWN',
  SELECTING_PIECE: 'SELECTING_PIECE',
  SELECTING_ROUTE: 'SELECTING_ROUTE',
  MOVING: 'MOVING',
  RESOLVING: 'RESOLVING',
  TURN_END: 'TURN_END',
  GAME_OVER: 'GAME_OVER',
}

export const PieceStatus = {
  WAITING: 'WAITING',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED',
}

const createPieces = (playerId) =>
  Array.from({ length: 4 }, (_item, index) => ({
    id: `P${playerId}-${index + 1}`,
    playerId,
    number: index + 1,
    position: null,
    route: 'outer',
    status: PieceStatus.WAITING,
    stack: [],
  }))

const createInitialState = () => ({
  phase: GamePhase.IDLE,
  players: [
    { id: 1, name: '플레이어 1', color: '#ef4444', pieces: createPieces(1) },
    { id: 2, name: '플레이어 2', color: '#2563eb', pieces: createPieces(2) },
  ],
  currentTurnIndex: 0,
  currentResult: null,
  movablePieces: [],
  selectedPieceId: null,
  routeOptions: [],
  pendingRoutePieceId: null,
  extraTurn: false,
  lastCaptured: false,
  winner: null,
  message: '플레이어 1의 차례입니다. 윷을 던져주세요.',
  logs: ['게임을 시작했습니다. 플레이어 1의 차례입니다.'],
})

export const useYutGame = () => {
  const state = reactive(createInitialState())

  const currentPlayer = computed(() => state.players[state.currentTurnIndex])
  const opponentPlayer = computed(() => state.players[(state.currentTurnIndex + 1) % state.players.length])

  const allPieces = computed(() => state.players.flatMap((player) => player.pieces))

  const representativePieces = computed(() =>
    allPieces.value.filter((piece) => piece.status !== 'PLAYING' || !isStackChild(piece)),
  )

  const addLog = (message) => {
    state.logs = [...state.logs.slice(-39), message]
    console.log(`[YUT] ${message}`, {
      phase: state.phase,
      player: currentPlayer.value?.name,
      result: state.currentResult,
      extraTurn: state.extraTurn,
    })
  }

  const resetSelection = () => {
    state.currentResult = null
    state.movablePieces = []
    state.selectedPieceId = null
    state.routeOptions = []
    state.pendingRoutePieceId = null
    state.lastCaptured = false
  }

  const findPiece = (pieceId) => allPieces.value.find((piece) => piece.id === pieceId)

  const getStackMembers = (piece) => {
    if (!piece) return []
    const ids = [piece.id, ...piece.stack]
    return ids.map(findPiece).filter(Boolean)
  }

  const isStackChild = (piece) => allPieces.value.some((target) => target.stack.includes(piece.id))

  const detachFromStacks = (pieceId) => {
    for (const piece of allPieces.value) {
      piece.stack = piece.stack.filter((id) => id !== pieceId)
    }
  }

  const getMovablePieces = (playerId, result) => {
    if (!result) return []

    const player = state.players.find((item) => item.id === playerId)
    if (!player) return []

    return player.pieces.filter((piece) => {
      if (piece.status === PieceStatus.FINISHED || isStackChild(piece)) return false
      if (isBackdo(result)) return piece.status === PieceStatus.PLAYING
      return piece.status === PieceStatus.PLAYING || piece.status === PieceStatus.WAITING
    })
  }

  const getRouteForMove = (piece, selectedRoute) => {
    if (selectedRoute && routes[selectedRoute]) return selectedRoute
    return piece.route || 'outer'
  }

  const getDestination = (piece, result, selectedRoute) => {
    if (!piece || !result) return { finished: false, position: null, route: 'outer' }

    if (isBackdo(result)) {
      if (piece.status !== PieceStatus.PLAYING) return { finished: false, position: null, route: 'outer' }
      if (piece.route !== 'outer') {
        const route = routes[piece.route] ?? routes.outer
        const index = getRouteIndex(piece.route, piece.position)
        if (index > 0) return { finished: false, position: route[index - 1], route: piece.route }
      }

      const outerIndex = getRouteIndex('outer', piece.position)
      if (outerIndex <= 1) return { finished: false, position: null, route: 'outer', waiting: true }
      return { finished: false, position: routes.outer[outerIndex - 1], route: 'outer' }
    }

    const routeName = piece.status === PieceStatus.WAITING ? 'outer' : getRouteForMove(piece, selectedRoute)
    const route = routes[routeName] ?? routes.outer
    const startIndex = piece.status === PieceStatus.WAITING ? 0 : getRouteIndex(routeName, piece.position)
    const safeStartIndex = startIndex < 0 ? getRouteIndex('outer', piece.position) : startIndex
    const nextIndex = safeStartIndex + result.steps

    if (nextIndex >= route.length - 1) return { finished: true, position: 'FINISHED', route: routeName }
    return { finished: false, position: route[nextIndex], route: routeName }
  }

  const needsRouteSelection = (piece, result) => {
    if (!piece || !result || isBackdo(result) || piece.status !== PieceStatus.PLAYING) return false
    return getBranchOptions(piece.position).length > 0
  }

  const rollYut = () => {
    if (state.phase !== GamePhase.IDLE || state.winner) {
      state.message = '지금은 윷을 던질 수 없습니다.'
      addLog(state.message)
      return
    }

    state.phase = GamePhase.ROLLING
    const result = rollYutResult()
    state.currentResult = result
    state.extraTurn = Boolean(result.extraTurn)
    state.phase = GamePhase.RESULT_SHOWN
    state.message = `결과: ${result.label}`

    state.movablePieces = getMovablePieces(currentPlayer.value.id, result).map((piece) => piece.id)
    addLog(`${currentPlayer.value.name}: ${result.label}`)

    if (state.movablePieces.length === 0) {
      state.message = '이동 가능한 말이 없어 턴이 넘어갑니다.'
      addLog(state.message)
      endTurn({ extraTurn: false })
      return
    }

    state.phase = GamePhase.SELECTING_PIECE
    state.message = '이동할 말을 선택하세요.'
  }

  const selectPiece = (pieceId) => {
    if (state.phase !== GamePhase.SELECTING_PIECE || !state.movablePieces.includes(pieceId)) {
      state.message = '선택할 수 없는 말입니다.'
      addLog(state.message)
      return
    }

    const piece = findPiece(pieceId)
    state.selectedPieceId = pieceId

    if (needsRouteSelection(piece, state.currentResult)) {
      state.phase = GamePhase.SELECTING_ROUTE
      state.pendingRoutePieceId = pieceId
      state.routeOptions = ['outer', ...getBranchOptions(piece.position)]
      state.message = '이동할 경로를 선택하세요.'
      return
    }

    movePiece(pieceId, state.currentResult)
  }

  const selectRoute = (routeName) => {
    if (state.phase !== GamePhase.SELECTING_ROUTE || !state.pendingRoutePieceId) return
    movePiece(state.pendingRoutePieceId, state.currentResult, routeName)
  }

  const movePiece = (pieceId, result, selectedRoute) => {
    const piece = findPiece(pieceId)
    if (!piece || !result) return

    state.phase = GamePhase.MOVING
    const movingPieces = getStackMembers(piece)
    const destination = getDestination(piece, result, selectedRoute)

    for (const movingPiece of movingPieces) {
      detachFromStacks(movingPiece.id)
      movingPiece.stack = []
      movingPiece.route = destination.route

      if (destination.finished) {
        movingPiece.position = 'FINISHED'
        movingPiece.status = PieceStatus.FINISHED
      } else if (destination.waiting) {
        movingPiece.position = null
        movingPiece.status = PieceStatus.WAITING
      } else {
        movingPiece.position = destination.position
        movingPiece.status = PieceStatus.PLAYING
      }
    }

    const captured = resolveAfterMove(pieceId)
    const won = checkWinner()
    if (won) return

    const extraTurn = shouldGrantExtraTurn({ result, captured })
    state.extraTurn = extraTurn

    if (captured) state.message = '상대 말을 잡았습니다! 한 번 더 던지세요.'
    else if (result.extraTurn) state.message = `${result.label}이 나왔습니다! 한 번 더 던지세요.`
    else state.message = `${result.label}로 이동했습니다.`

    addLog(state.message)
    endTurn({ extraTurn })
  }

  const resolveAfterMove = (pieceId) => {
    state.phase = GamePhase.RESOLVING
    const piece = findPiece(pieceId)
    if (!piece || piece.status !== PieceStatus.PLAYING) return false

    const sameCellPieces = allPieces.value.filter(
      (target) => target.id !== piece.id && target.status === PieceStatus.PLAYING && target.position === piece.position,
    )

    const enemies = sameCellPieces.filter((target) => target.playerId !== piece.playerId)
    const allies = sameCellPieces.filter((target) => target.playerId === piece.playerId)

    let captured = false
    for (const enemy of enemies) {
      const capturedPieces = getStackMembers(enemy)
      for (const capturedPiece of capturedPieces) {
        detachFromStacks(capturedPiece.id)
        capturedPiece.position = null
        capturedPiece.route = 'outer'
        capturedPiece.status = PieceStatus.WAITING
        capturedPiece.stack = []
      }
      captured = true
    }

    const root = findPiece(pieceId)
    if (root?.status === PieceStatus.PLAYING) {
      for (const ally of allies) {
        const allyMembers = getStackMembers(ally)
        for (const allyPiece of allyMembers) {
          if (allyPiece.id !== root.id && !root.stack.includes(allyPiece.id)) {
            root.stack.push(allyPiece.id)
          }
        }
      }
    }

    state.lastCaptured = captured
    return captured
  }

  const checkWinner = () => {
    const winner = currentPlayer.value.pieces.every((piece) => piece.status === PieceStatus.FINISHED)
    if (!winner) return false

    state.phase = GamePhase.GAME_OVER
    state.winner = currentPlayer.value.id
    state.message = `${currentPlayer.value.name} 승리!`
    addLog(state.message)
    return true
  }

  const endTurn = ({ extraTurn }) => {
    if (state.phase === GamePhase.GAME_OVER) return

    state.phase = GamePhase.TURN_END
    const keepTurn = Boolean(extraTurn)

    resetSelection()
    if (!keepTurn) {
      state.currentTurnIndex = (state.currentTurnIndex + 1) % state.players.length
    }

    state.phase = GamePhase.IDLE
    state.message = keepTurn
      ? `${currentPlayer.value.name}의 추가 턴입니다. 윷을 던져주세요.`
      : `${currentPlayer.value.name}의 차례입니다. 윷을 던져주세요.`
  }

  const getPieceRenderPosition = (piece) => {
    if (!piece) return getPoint(0)
    const playerOrigin = waitingOrigins[piece.playerId] ?? waitingOrigins[1]
    const offset = waitingOffsets[(piece.number ?? 1) - 1] ?? waitingOffsets[0]

    if (piece.status === PieceStatus.WAITING) {
      return { x: playerOrigin.x + offset.x, y: playerOrigin.y + offset.y }
    }

    if (piece.status === PieceStatus.FINISHED) {
      const origin = finishedOrigin[piece.playerId] ?? finishedOrigin[1]
      return { x: origin.x + offset.x, y: origin.y + offset.y }
    }

    const point = getPoint(piece.position)
    return { x: point.x, y: point.y }
  }

  const resetGame = () => {
    Object.assign(state, createInitialState())
  }

  return {
    state,
    currentPlayer,
    opponentPlayer,
    representativePieces,
    rollYut,
    getMovablePieces,
    selectPiece,
    selectRoute,
    movePiece,
    resolveAfterMove,
    checkWinner,
    endTurn,
    getPieceRenderPosition,
    resetGame,
    isStackChild,
  }
}
