const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const { createDefaultState } = require('../miniprogram/utils/default-data')

test('every seeded activity can render an eight-cell grid', () => {
  const state = createDefaultState(new Date('2026-08-23T10:00:00+08:00').getTime())
  for (const activity of state.activities) {
    assert.equal(activity.prizes.length, 8, activity.id)
    assert.equal(new Set(activity.prizes.map((prize) => prize.id)).size, 8, activity.id)
    assert.ok(activity.prizes.some((prize) => prize.type === 'none'), activity.id)
  }
})

test('seeded local cover assets exist and are valid PNG files', () => {
  const state = createDefaultState()
  for (const activity of state.activities) {
    const relativePath = activity.coverImage.replace(/^\//, '')
    const file = path.resolve(__dirname, '..', 'miniprogram', relativePath)
    const signature = fs.readFileSync(file).subarray(0, 8)
    assert.deepEqual([...signature], [137, 80, 78, 71, 13, 10, 26, 10])
  }
})
