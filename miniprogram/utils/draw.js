const store = require('./store')
const { pickWeighted } = require('./lottery')
const { createId } = require('./id')
const { getActivityStatus, getRemainingQuota, getTodayKey } = require('./state')
const { isDrawModeSupported } = require('./draw-mode')

const CLAIM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

function commitDraw(activityId, rng = Math.random, now = Date.now()) {
  const current = store.loadState()
  const activity = current.activities.find((item) => item.id === activityId)
  if (!activity) throw new Error('ACTIVITY_NOT_FOUND')
  if (!isDrawModeSupported(activity.drawMode)) throw new Error('DRAW_MODE_NOT_SUPPORTED')
  if (current.pendingDraw) throw new Error('PENDING_DRAW_EXISTS')
  if (getActivityStatus(activity, now) !== 'active') throw new Error('ACTIVITY_NOT_ACTIVE')
  if (getRemainingQuota(current, activityId, now) <= 0) throw new Error('NO_QUOTA')

  // The detail page renders an eight-cell board, so the committed pool must use
  // the same bounded set even when legacy/imported data contains extra prizes.
  const drawPrizes = Array.isArray(activity.prizes) ? activity.prizes.slice(0, 8) : []
  const selected = pickWeighted(drawPrizes, rng)
  const prizeIndex = drawPrizes.findIndex((prize) => prize.id === selected.id)
  const recordId = createId('draw')
  const isWin = selected.type !== 'none'
  const record = {
    id: recordId,
    requestId: createId('request'),
    activityId: activity.id,
    activityTitle: activity.title,
    prizeId: selected.id,
    prizeName: selected.name,
    prizeSymbol: selected.symbol,
    prizeTone: selected.tone,
    prizeType: selected.type,
    isWin,
    drawnAt: now,
    dayKey: getTodayKey(now),
    claimStatus: isWin ? 'pending' : 'unneeded',
    claimDeadline: isWin ? now + CLAIM_WINDOW_MS : null,
    claim: null
  }
  const pendingDraw = {
    drawId: recordId,
    activityId,
    winnerIndex: prizeIndex,
    committedAt: now,
    result: record
  }

  const nextState = JSON.parse(JSON.stringify(current))
  const nextActivity = nextState.activities.find((item) => item.id === activityId)
  const nextPrize = nextActivity.prizes.find((prize) => prize.id === selected.id)
  if (nextPrize.stock !== null) nextPrize.stock = Math.max(0, Number(nextPrize.stock) - 1)
  const hasParticipated = current.records.some((item) => item.activityId === activityId)
  if (!hasParticipated) {
    nextActivity.participantCount = Number(nextActivity.participantCount || 0) + 1
  }
  nextState.records.unshift(record)
  nextState.pendingDraw = pendingDraw

  const saved = store.saveState(nextState)
  return { state: saved, record, pendingDraw }
}

function recoverPendingDraw(activityId) {
  const state = store.loadState()
  const pending = state.pendingDraw
  if (!pending) return null
  if (activityId && pending.activityId !== activityId) return null
  return pending
}

function acknowledgePendingDraw(drawId) {
  const state = store.loadState()
  if (!state.pendingDraw) return state
  if (drawId && state.pendingDraw.drawId !== drawId) return state
  state.pendingDraw = null
  return store.saveState(state)
}

module.exports = {
  commitDraw,
  recoverPendingDraw,
  acknowledgePendingDraw
}
