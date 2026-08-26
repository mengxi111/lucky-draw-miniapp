const test = require('node:test')
const assert = require('node:assert/strict')

const {
  getEligiblePrizes,
  pickWeighted,
  buildAnimationSteps
} = require('../miniprogram/utils/lottery')

const prizes = [
  { id: 'a', weight: 1, stock: 1, enabled: true },
  { id: 'b', weight: 3, stock: 2, enabled: true },
  { id: 'c', weight: 100, stock: 0, enabled: true },
  { id: 'd', weight: 100, stock: null, enabled: false }
]

test('weighted picker respects lower and upper random boundaries', () => {
  assert.equal(pickWeighted(prizes, () => 0).id, 'a')
  assert.equal(pickWeighted(prizes, () => 0.999999).id, 'b')
})

test('disabled and depleted prizes are excluded', () => {
  assert.deepEqual(getEligiblePrizes(prizes).map((prize) => prize.id), ['a', 'b'])
})

test('picker rejects a draw with no eligible prize', () => {
  assert.throws(
    () => pickWeighted([{ id: 'x', weight: 0, stock: 1 }]),
    /NO_AVAILABLE_PRIZE/
  )
})

test('picker ignores malformed weights and stock values', () => {
  const malformed = [
    { id: 'nan-weight', weight: Number.NaN, stock: 1 },
    { id: 'infinite-weight', weight: Number.POSITIVE_INFINITY, stock: 1 },
    { id: 'invalid-stock', weight: 10, stock: 'not-a-number' },
    { id: 'valid', weight: 1, stock: 1 }
  ]
  assert.deepEqual(getEligiblePrizes(malformed).map((prize) => prize.id), ['valid'])
  assert.equal(pickWeighted(malformed, () => Number.NaN).id, 'valid')
})

test('grid animation finishes at the requested perimeter cell', () => {
  const steps = buildAnimationSteps(7, 2)
  assert.equal(steps.at(-1), 7)
  assert.ok(steps.length > 16)
})

test('grid animation rejects the center cell', () => {
  assert.throws(() => buildAnimationSteps(4), /INVALID_WINNER_INDEX/)
})
