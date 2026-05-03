export const BOARD_SIZE = 100
export const START_GOAL = 'START_GOAL'
export const FINISHED_POSITION = 'FINISHED'

// Single source of truth for every visual board coordinate.
// x/y are percentages inside a square board. Every cell, line, and piece uses
// these exact values, then CSS centers elements with translate(-50%, -50%).
export const boardPoints = [
  // Outer route: start at bottom-right, then move along the square border.
  { id: 0, x: 90, y: 90, type: 'start', routes: ['outer'], position: START_GOAL },
  { id: 1, x: 72, y: 90, type: 'normal', routes: ['outer'] },
  { id: 2, x: 54, y: 90, type: 'normal', routes: ['outer'] },
  { id: 3, x: 36, y: 90, type: 'normal', routes: ['outer'] },
  { id: 4, x: 18, y: 90, type: 'normal', routes: ['outer'] },
  { id: 5, x: 10, y: 90, type: 'corner', routes: ['outer', 'shortcutB'] },
  { id: 6, x: 10, y: 72, type: 'normal', routes: ['outer'] },
  { id: 7, x: 10, y: 54, type: 'normal', routes: ['outer'] },
  { id: 8, x: 10, y: 36, type: 'normal', routes: ['outer'] },
  { id: 9, x: 10, y: 18, type: 'normal', routes: ['outer'] },
  { id: 10, x: 10, y: 10, type: 'corner', routes: ['outer', 'shortcutA'], branchOptions: ['shortcutA'] },
  { id: 11, x: 28, y: 10, type: 'normal', routes: ['outer'] },
  { id: 12, x: 46, y: 10, type: 'normal', routes: ['outer'] },
  { id: 13, x: 64, y: 10, type: 'normal', routes: ['outer'] },
  { id: 14, x: 82, y: 10, type: 'normal', routes: ['outer'] },
  { id: 15, x: 90, y: 10, type: 'corner', routes: ['outer', 'shortcutB'], branchOptions: ['shortcutB'] },
  { id: 16, x: 90, y: 28, type: 'normal', routes: ['outer'] },
  { id: 17, x: 90, y: 46, type: 'normal', routes: ['outer'] },
  { id: 18, x: 90, y: 64, type: 'normal', routes: ['outer'] },
  { id: 19, x: 90, y: 82, type: 'normal', routes: ['outer'] },

  // Center and diagonal shortcut cells.
  { id: 20, x: 50, y: 50, type: 'center', routes: ['shortcutA', 'shortcutB', 'center'] },
  { id: 21, x: 25, y: 25, type: 'shortcut', routes: ['shortcutA'] },
  { id: 22, x: 37.5, y: 37.5, type: 'shortcut', routes: ['shortcutA'] },
  { id: 23, x: 62.5, y: 62.5, type: 'shortcut', routes: ['shortcutA', 'center'] },
  { id: 24, x: 75, y: 75, type: 'shortcut', routes: ['shortcutA', 'center'] },
  { id: 25, x: 75, y: 25, type: 'shortcut', routes: ['shortcutB'] },
  { id: 26, x: 62.5, y: 37.5, type: 'shortcut', routes: ['shortcutB'] },
  { id: 27, x: 37.5, y: 62.5, type: 'shortcut', routes: ['shortcutB'] },
  { id: 28, x: 25, y: 75, type: 'shortcut', routes: ['shortcutB'] },
]

export const boardPointMap = Object.fromEntries(boardPoints.map((point) => [point.id, point]))

export const routes = {
  // START_GOAL is a real board cell, not WAITING and not FINISHED.
  // A piece that reaches START_GOAL stays PLAYING; it finishes only when it
  // starts a later positive move from START_GOAL.
  outer: [START_GOAL, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, START_GOAL],
  // Left-top corner -> center -> bottom-right home.
  shortcutA: [10, 21, 22, 20, 23, 24, START_GOAL],
  // Right-top corner -> center -> left-bottom -> bottom side -> bottom-right home.
  shortcutB: [15, 25, 26, 20, 27, 28, 5, 4, 3, 2, 1, START_GOAL],
  center: [20, 23, 24, START_GOAL],
}

export const routeLines = [
  routes.outer.map((position) => (position === START_GOAL ? 0 : position)),
  [10, 21, 22, 20, 23, 24, 0],
  [15, 25, 26, 20, 27, 28, 5],
]

export const waitingOrigins = {
  1: { x: 94, y: 96 },
  2: { x: 94, y: 86 },
}

export const waitingOffsets = [
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 0, y: 3 },
  { x: 3, y: 3 },
]

export const finishedOrigin = {
  1: { x: 80, y: 96 },
  2: { x: 80, y: 86 },
}

export const getPoint = (position) => {
  if (position === START_GOAL) return boardPointMap[0]
  return boardPointMap[position] ?? boardPointMap[0]
}

export const getRouteIndex = (routeName, position) => {
  const route = routes[routeName] ?? routes.outer
  if (position === START_GOAL) return route.lastIndexOf(START_GOAL)
  return route.indexOf(position)
}

export const getBranchOptions = (position) => boardPointMap[position]?.branchOptions ?? []
