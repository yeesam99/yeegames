export const BOARD_SIZE = 720

export const boardPoints = {
  0: { id: 0, x: 610, y: 610, label: '출발/도착' },
  1: { id: 1, x: 610, y: 500 },
  2: { id: 2, x: 610, y: 390 },
  3: { id: 3, x: 610, y: 280 },
  4: { id: 4, x: 610, y: 170 },
  5: { id: 5, x: 610, y: 90, branchOptions: ['shortcutA'] },
  6: { id: 6, x: 500, y: 90 },
  7: { id: 7, x: 390, y: 90 },
  8: { id: 8, x: 280, y: 90 },
  9: { id: 9, x: 170, y: 90 },
  10: { id: 10, x: 90, y: 90, branchOptions: ['shortcutB'] },
  11: { id: 11, x: 90, y: 200 },
  12: { id: 12, x: 90, y: 310 },
  13: { id: 13, x: 90, y: 420 },
  14: { id: 14, x: 90, y: 530 },
  15: { id: 15, x: 90, y: 610 },
  16: { id: 16, x: 200, y: 610 },
  17: { id: 17, x: 310, y: 610 },
  18: { id: 18, x: 420, y: 610 },
  19: { id: 19, x: 530, y: 610 },
  20: { id: 20, x: 610, y: 610, label: '도착' },
  21: { id: 21, x: 550, y: 160 },
  22: { id: 22, x: 450, y: 260 },
  23: { id: 23, x: 350, y: 350, label: '중앙' },
  24: { id: 24, x: 450, y: 450 },
  25: { id: 25, x: 160, y: 160 },
  26: { id: 26, x: 260, y: 260 },
}

export const routes = {
  outer: Array.from({ length: 21 }, (_item, index) => index),
  shortcutA: [5, 21, 22, 23, 24, 20],
  shortcutB: [10, 25, 26, 23, 24, 20],
  center: [23, 24, 20],
}

export const routeLines = [routes.outer, routes.shortcutA, routes.shortcutB]

export const waitingOrigins = {
  1: { x: 638, y: 646 },
  2: { x: 638, y: 584 },
}

export const waitingOffsets = [
  { x: 0, y: 0 },
  { x: 18, y: 0 },
  { x: 0, y: 18 },
  { x: 18, y: 18 },
]

export const finishedOrigin = {
  1: { x: 560, y: 642 },
  2: { x: 560, y: 580 },
}

export const getPoint = (position) => boardPoints[position] ?? boardPoints[0]

export const getRouteIndex = (routeName, position) => {
  const route = routes[routeName] ?? routes.outer
  return route.indexOf(position)
}

export const getBranchOptions = (position) => boardPoints[position]?.branchOptions ?? []
