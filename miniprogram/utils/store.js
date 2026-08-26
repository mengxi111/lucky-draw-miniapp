const { createDefaultState } = require('./default-data')
const { migrateState, clone } = require('./state')

const STORAGE_KEY = 'lucky_draw_state_v1'
const CREATE_DRAFT_STORAGE_KEY = 'lucky_draw_create_draft_v1'
let memoryState = null
let memoryCreateDraft = null

function hasWxStorage() {
  return typeof wx !== 'undefined' && typeof wx.getStorageSync === 'function'
}

function loadState() {
  if (!hasWxStorage()) {
    if (!memoryState) memoryState = createDefaultState()
    return clone(memoryState)
  }

  try {
    const saved = wx.getStorageSync(STORAGE_KEY)
    if (!saved) {
      const initial = createDefaultState()
      wx.setStorageSync(STORAGE_KEY, initial)
      memoryState = clone(initial)
      return clone(initial)
    }
    const migrated = migrateState(saved)
    memoryState = clone(migrated)
    return clone(migrated)
  } catch (error) {
    // Keep the last known-good snapshot instead of replacing user data after a
    // transient storage failure. With no safe snapshot, surface the error.
    if (memoryState) return clone(memoryState)
    throw error
  }
}

function saveState(nextState) {
  const snapshot = clone(nextState)
  snapshot.revision = Number(snapshot.revision || 0) + 1
  snapshot.updatedAt = Date.now()

  if (hasWxStorage()) {
    wx.setStorageSync(STORAGE_KEY, snapshot)
  }
  memoryState = clone(snapshot)
  return clone(snapshot)
}

function updateState(recipe) {
  const draft = clone(loadState())
  const result = recipe(draft) || draft
  return saveState(result)
}

function resetState() {
  const fresh = createDefaultState()
  if (hasWxStorage()) wx.setStorageSync(STORAGE_KEY, fresh)
  memoryState = clone(fresh)
  return fresh
}

function setMemoryStateForTests(nextState) {
  memoryState = clone(nextState)
}

function loadCreateDraft() {
  if (!hasWxStorage()) return memoryCreateDraft ? clone(memoryCreateDraft) : null

  try {
    const saved = wx.getStorageSync(CREATE_DRAFT_STORAGE_KEY)
    if (!saved || typeof saved !== 'object') return null
    memoryCreateDraft = clone(saved)
    return clone(saved)
  } catch (error) {
    return memoryCreateDraft ? clone(memoryCreateDraft) : null
  }
}

function saveCreateDraft(draft) {
  const snapshot = clone(draft || {})
  snapshot.version = 1
  snapshot.savedAt = Date.now()
  if (hasWxStorage()) wx.setStorageSync(CREATE_DRAFT_STORAGE_KEY, snapshot)
  memoryCreateDraft = clone(snapshot)
  return clone(snapshot)
}

function clearCreateDraft() {
  if (hasWxStorage() && typeof wx.removeStorageSync === 'function') {
    wx.removeStorageSync(CREATE_DRAFT_STORAGE_KEY)
  }
  memoryCreateDraft = null
}

module.exports = {
  STORAGE_KEY,
  CREATE_DRAFT_STORAGE_KEY,
  loadState,
  saveState,
  updateState,
  resetState,
  setMemoryStateForTests,
  loadCreateDraft,
  saveCreateDraft,
  clearCreateDraft
}
