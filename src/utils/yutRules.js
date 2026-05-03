export const yutResults = [
  { id: 'do', label: '도', steps: 1, extraTurn: false, weight: 4 },
  { id: 'gae', label: '개', steps: 2, extraTurn: false, weight: 6 },
  { id: 'geol', label: '걸', steps: 3, extraTurn: false, weight: 4 },
  { id: 'yut', label: '윷', steps: 4, extraTurn: true, weight: 1 },
  { id: 'mo', label: '모', steps: 5, extraTurn: true, weight: 1 },
  { id: 'backdo', label: '뒷도', steps: -1, extraTurn: false, weight: 1 },
]

const weightedResults = yutResults.flatMap((result) => Array.from({ length: result.weight }, () => result))

export const rollYutResult = () => {
  const result = weightedResults[Math.floor(Math.random() * weightedResults.length)]
  return {
    ...result,
    rollId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  }
}

export const isBackdo = (result) => result?.steps === -1

export const shouldGrantExtraTurn = ({ result, captured }) => Boolean(result?.extraTurn || captured)
