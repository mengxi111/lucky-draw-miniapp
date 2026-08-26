const test = require('node:test')
const assert = require('node:assert/strict')

const { createDefaultState } = require('../miniprogram/utils/default-data')
const store = require('../miniprogram/utils/store')
const { commitDraw, recoverPendingDraw, acknowledgePendingDraw } = require('../miniprogram/utils/draw')

function createTestState(now) {
  const state = createDefaultState(now)
  state.activities = [
    {
      id: 'test_activity',
      title: '测试抽奖',
      startAt: now - 1000,
      endAt: now + 86400000,
      status: 'active',
      dailyLimit: 1,
      participantCount: 0,
      prizes: [
        { id: 'winner', name: '测试奖品', symbol: '奖', tone: 'red', type: 'physical', weight: 1, stock: 1, enabled: true },
        { id: 'none', name: '谢谢参与', symbol: '谢', tone: 'gray', type: 'none', weight: 1, stock: null, enabled: true }
      ]
    }
  ]
  state.records = []
  state.pendingDraw = null
  return state
}

test('draw commits result, stock, history and pending recovery in one snapshot', () => {
  const now = new Date('2026-08-23T10:00:00+08:00').getTime()
  store.setMemoryStateForTests(createTestState(now))

  const result = commitDraw('test_activity', () => 0, now)
  const saved = store.loadState()

  assert.equal(result.record.prizeId, 'winner')
  assert.equal(saved.records.length, 1)
  assert.equal(saved.activities[0].prizes[0].stock, 0)
  assert.equal(saved.activities[0].participantCount, 1)
  assert.equal(recoverPendingDraw('test_activity').drawId, result.record.id)
})

test('pending result prevents a second draw and acknowledgement does not redraw', () => {
  const now = new Date('2026-08-23T10:00:00+08:00').getTime()
  store.setMemoryStateForTests(createTestState(now))
  const first = commitDraw('test_activity', () => 0, now)

  assert.throws(() => commitDraw('test_activity', () => 0.9, now + 1), /PENDING_DRAW_EXISTS/)
  acknowledgePendingDraw(first.record.id)

  const state = store.loadState()
  assert.equal(state.pendingDraw, null)
  assert.equal(state.records.length, 1)
  assert.equal(state.activities[0].prizes[0].stock, 0)
})

test('daily quota prevents another committed result after acknowledgement', () => {
  const now = new Date('2026-08-23T10:00:00+08:00').getTime()
  store.setMemoryStateForTests(createTestState(now))
  const first = commitDraw('test_activity', () => 0.9, now)
  acknowledgePendingDraw(first.record.id)

  assert.throws(() => commitDraw('test_activity', () => 0.9, now + 10), /NO_QUOTA/)
  assert.equal(store.loadState().records.length, 1)
})

test('storage failure happens before caller can animate a result', () => {
  const now = new Date('2026-08-23T10:00:00+08:00').getTime()
  const originalWx = global.wx
  const state = createTestState(now)
  global.wx = {
    getStorageSync: () => state,
    setStorageSync: () => { throw new Error('DISK_FULL') }
  }

  assert.throws(() => commitDraw('test_activity', () => 0, now), /DISK_FULL/)
  global.wx = originalWx
})

test('server-coordinated draw modes never commit an instant local result', () => {
  const now = new Date('2026-08-23T10:00:00+08:00').getTime()

  for (const drawMode of ['time', 'people', 'unknown']) {
    const state = createTestState(now)
    state.activities[0].drawMode = drawMode
    store.setMemoryStateForTests(state)

    assert.throws(() => commitDraw('test_activity', () => 0, now), /DRAW_MODE_NOT_SUPPORTED/)
    const saved = store.loadState()
    assert.equal(saved.records.length, 0, drawMode)
    assert.equal(saved.pendingDraw, null, drawMode)
    assert.equal(saved.activities[0].participantCount, 0, drawMode)
    assert.equal(saved.activities[0].prizes[0].stock, 1, drawMode)
  }
})

test('draw pool matches the eight prizes rendered by the detail grid', () => {
  const now = new Date('2026-08-23T10:00:00+08:00').getTime()
  const state = createTestState(now)
  state.activities[0].prizes = Array.from({ length: 9 }, (_, index) => ({
    id: `prize_${index}`,
    name: `奖品 ${index}`,
    symbol: String(index),
    tone: 'red',
    type: 'physical',
    weight: index === 8 ? 1000 : 1,
    stock: 1,
    enabled: true
  }))
  store.setMemoryStateForTests(state)

  const result = commitDraw('test_activity', () => 0.999999, now)
  assert.equal(result.record.prizeId, 'prize_7')
  assert.equal(store.loadState().activities[0].prizes[8].stock, 1)
})

test('draw history is not discarded when it exceeds the display page size', () => {
  const now = new Date('2026-08-23T10:00:00+08:00').getTime()
  const state = createTestState(now)
  state.activities[0].dailyLimit = 500
  state.records = Array.from({ length: 205 }, (_, index) => ({
    id: `old_${index}`,
    activityId: index === 0 ? 'another_activity' : 'test_activity',
    dayKey: '2026-08-22'
  }))
  store.setMemoryStateForTests(state)

  commitDraw('test_activity', () => 0, now)
  assert.equal(store.loadState().records.length, 206)
})

test('participant count represents the local participant, not repeated draw attempts', () => {
  const now = new Date('2026-08-23T10:00:00+08:00').getTime()
  const state = createTestState(now)
  state.activities[0].dailyLimit = 2
  store.setMemoryStateForTests(state)

  const first = commitDraw('test_activity', () => 0.9, now)
  acknowledgePendingDraw(first.record.id)
  const second = commitDraw('test_activity', () => 0.9, now + 1)
  acknowledgePendingDraw(second.record.id)

  assert.equal(store.loadState().activities[0].participantCount, 1)
})

test('create draft storage works in the non-WeChat fallback and can be cleared', () => {
  store.clearCreateDraft()
  const saved = store.saveCreateDraft({ prizeName: '测试礼物', endDate: '2026-08-30' })

  assert.equal(saved.version, 1)
  assert.equal(store.loadCreateDraft().prizeName, '测试礼物')
  assert.ok(saved.savedAt)

  store.clearCreateDraft()
  assert.equal(store.loadCreateDraft(), null)
})
