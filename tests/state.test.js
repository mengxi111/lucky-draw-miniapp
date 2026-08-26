const test = require('node:test')
const assert = require('node:assert/strict')

const { createDefaultState } = require('../miniprogram/utils/default-data')
const { migrateState, getActivityStatus, getRemainingQuota, getTodayKey } = require('../miniprogram/utils/state')

test('invalid snapshots migrate to a usable default state', () => {
  const state = migrateState({ schemaVersion: 99 })
  assert.equal(state.schemaVersion, 1)
  assert.ok(state.activities.length >= 1)
  assert.ok(Array.isArray(state.records))
})

test('activity state follows its time window', () => {
  const now = 10000
  assert.equal(getActivityStatus({ startAt: 0, endAt: 20000, status: 'active' }, now), 'active')
  assert.equal(getActivityStatus({ startAt: 11000, endAt: 20000, status: 'upcoming' }, now), 'upcoming')
  assert.equal(getActivityStatus({ startAt: 0, endAt: 9000, status: 'active' }, now), 'ended')
  assert.equal(getActivityStatus({ startAt: 0, endAt: 20000, status: 'upcoming' }, now), 'active')
  assert.equal(getActivityStatus({ startAt: 0, endAt: 20000, status: 'ended' }, now), 'ended')
  assert.equal(getActivityStatus({ startAt: 0, endAt: 20000, status: 'closed' }, now), 'ended')
  assert.equal(getActivityStatus({ startAt: 0, endAt: 20000, status: 'paused' }, now), 'paused')
  assert.equal(getActivityStatus({ startAt: 0, endAt: 9000, status: 'paused' }, now), 'ended')
})

test('quota counts only records from the current local day', () => {
  const now = new Date('2026-08-23T10:00:00+08:00').getTime()
  const state = createDefaultState(now)
  const activity = state.activities[0]
  activity.dailyLimit = 2
  state.records = [
    { activityId: activity.id, dayKey: getTodayKey(now) },
    { activityId: activity.id, dayKey: '2026-08-22' }
  ]
  assert.equal(getRemainingQuota(state, activity.id, now), 1)
})
