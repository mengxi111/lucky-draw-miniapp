function getEligiblePrizes(prizes) {
  return (Array.isArray(prizes) ? prizes : []).filter((prize) => {
    const stock = prize.stock === null ? null : Number(prize.stock)
    const hasStock = stock === null || (Number.isFinite(stock) && stock > 0)
    const weight = Number(prize.weight)
    return prize.enabled !== false && Number.isFinite(weight) && weight > 0 && hasStock
  })
}

function pickWeighted(prizes, rng = Math.random) {
  const eligible = getEligiblePrizes(prizes)
  if (!eligible.length) throw new Error('NO_AVAILABLE_PRIZE')

  const totalWeight = eligible.reduce((sum, prize) => sum + Number(prize.weight), 0)
  const randomValue = Number(rng())
  const unit = Number.isFinite(randomValue)
    ? Math.min(Math.max(randomValue, 0), 0.999999999999)
    : 0
  let cursor = unit * totalWeight

  for (const prize of eligible) {
    cursor -= Number(prize.weight)
    if (cursor < 0) return prize
  }

  return eligible[eligible.length - 1]
}

function getGridPath(winnerIndex) {
  const perimeter = [0, 1, 2, 5, 8, 7, 6, 3]
  const pathIndex = perimeter.indexOf(winnerIndex)
  if (pathIndex < 0) throw new Error('INVALID_WINNER_INDEX')
  return { perimeter, pathIndex }
}

function buildAnimationSteps(winnerIndex, rounds = 3) {
  const { perimeter, pathIndex } = getGridPath(winnerIndex)
  const count = Math.max(1, rounds) * perimeter.length + pathIndex + 1
  return Array.from({ length: count }, (_, index) => perimeter[index % perimeter.length])
}

module.exports = {
  getEligiblePrizes,
  pickWeighted,
  getGridPath,
  buildAnimationSteps
}
