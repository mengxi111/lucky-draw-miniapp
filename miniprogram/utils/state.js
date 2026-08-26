const { createDefaultState } = require('./default-data')

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function migrateState(input) {
  if (!input || typeof input !== 'object' || input.schemaVersion !== 1) {
    return createDefaultState()
  }

  const state = clone(input)
  if (!Array.isArray(state.activities)) state.activities = []
  state.activities = state.activities.map((activity) => {
    if (activity.id === 'summer_lucky' && activity.official === undefined) {
      return { ...activity, official: true }
    }
    return activity
  })
  if (!Array.isArray(state.records)) state.records = []
  if (!state.profile) state.profile = { nickname: '微信用户', joinedAt: Date.now() }
  if (typeof state.revision !== 'number') state.revision = 1
  if (!Object.prototype.hasOwnProperty.call(state, 'pendingDraw')) state.pendingDraw = null
  return state
}

function getActivityStatus(activity, now = Date.now()) {
  if (!activity) return 'missing'
  if (['closed', 'ended', 'cancelled'].includes(activity.status)) return 'ended'
  const hasEndAt = activity.endAt !== undefined && activity.endAt !== null && activity.endAt !== ''
  const hasStartAt = activity.startAt !== undefined && activity.startAt !== null && activity.startAt !== ''
  if (hasEndAt && Number.isFinite(Number(activity.endAt)) && now >= Number(activity.endAt)) return 'ended'
  if (activity.status === 'paused') return 'paused'
  if (activity.status === 'draft') return 'upcoming'
  if (hasStartAt && Number.isFinite(Number(activity.startAt)) && now < Number(activity.startAt)) return 'upcoming'
  return 'active'
}

function getTodayKey(now = Date.now()) {
  const date = new Date(now)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function getRemainingQuota(state, activityId, now = Date.now()) {
  const activity = state.activities.find((item) => item.id === activityId)
  if (!activity) return 0
  const today = getTodayKey(now)
  const used = state.records.filter((record) => (
    record.activityId === activityId && record.dayKey === today
  )).length
  const dailyLimit = Math.max(0, Number(activity.dailyLimit) || 0)
  return Math.max(0, dailyLimit - used)
}

module.exports = {
  clone,
  migrateState,
  getActivityStatus,
  getTodayKey,
  getRemainingQuota
}
