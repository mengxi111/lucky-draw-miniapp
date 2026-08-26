const { loadState } = require('../../utils/store')
const { getActivityStatus, getRemainingQuota } = require('../../utils/state')
const { formatDateTime, formatShortDate, formatCountdown } = require('../../utils/time')
const { commitDraw, acknowledgePendingDraw, recoverPendingDraw } = require('../../utils/draw')
const { buildAnimationSteps } = require('../../utils/lottery')
const { getDrawModeMeta } = require('../../utils/draw-mode')

const GRID_SLOTS = [0, 1, 2, 5, 8, 7, 6, 3]
const STATUS_META = {
  active: { label: '进行中', className: 'active' },
  upcoming: { label: '即将开始', className: 'upcoming' },
  paused: { label: '已暂停', className: 'paused' },
  ended: { label: '已结束', className: 'ended' }
}

const DRAW_ERROR_MESSAGES = {
  ACTIVITY_NOT_FOUND: '活动不存在或已被删除',
  ACTIVITY_NOT_ACTIVE: '当前不在活动时间内',
  NO_QUOTA: '今天的抽奖机会已经用完',
  NO_AVAILABLE_PRIZE: '奖品暂时抽完了，请稍后再来',
  DRAW_MODE_NOT_SUPPORTED: '此开奖方式需接入服务端'
}

function getPrizeOverview(prizes) {
  const enabled = prizes.filter((prize) => prize.enabled !== false && prize.type !== 'none')
  const remaining = enabled.reduce((sum, prize) => (
    prize.stock === null ? sum : sum + Math.max(0, Number(prize.stock) || 0)
  ), 0)
  return {
    prizeKindText: `${enabled.length} 种奖品`,
    stockSummaryText: enabled.some((prize) => prize.stock === null) ? '库存以结果为准' : `剩余 ${remaining} 份`
  }
}

function normalizePrizes(prizes) {
  return GRID_SLOTS.map((slot, index) => {
    const prize = prizes[index]
    if (!prize) {
      return {
        id: `placeholder_${index}`,
        index,
        slot,
        name: '好运待续',
        shortName: '好运待续',
        symbol: '福',
        tone: 'gray',
        type: 'none',
        stock: null,
        enabled: false,
        unavailable: true,
        stockText: ''
      }
    }
    const stock = prize.stock === null ? null : Number(prize.stock)
    const hasStock = stock === null || (Number.isFinite(stock) && stock > 0)
    return {
      ...prize,
      index,
      slot,
      name: prize.name || '神秘好礼',
      shortName: prize.shortName || prize.name || '神秘好礼',
      symbol: prize.symbol || '礼',
      tone: prize.tone || 'gray',
      stockText: stock === null ? '' : hasStock ? `${stock <= 5 ? '仅余' : '余'} ${stock}` : '已抽完',
      stockLow: hasStock && stock !== null && stock <= 5,
      unavailable: prize.enabled === false || !hasStock
    }
  })
}

function getButtonState(status, remaining, prizeCount, drawing, drawMode, pendingResult) {
  if (pendingResult) return { text: '查看抽奖结果', disabled: false }
  if (drawing) return { text: '好运揭晓中', disabled: true }
  if (status === 'upcoming') return { text: '活动尚未开始', disabled: true }
  if (status === 'paused') return { text: '活动已暂停', disabled: true }
  if (status === 'ended') return { text: '活动已结束', disabled: true }
  if (!drawMode.supported) return { text: '需服务端开奖', disabled: true }
  if (!prizeCount) return { text: '奖品暂不可用', disabled: true }
  if (remaining <= 0) return { text: '今日机会已用完', disabled: true }
  return { text: '立即抽奖', disabled: false }
}

Page({
  data: {
    activityId: '',
    activity: null,
    prizes: [],
    statusKey: 'ended',
    statusLabel: '',
    statusClass: 'ended',
    countdownText: '',
    timeRangeText: '',
    quotaText: '',
    remaining: 0,
    participantText: '',
    prizeKindText: '',
    stockSummaryText: '',
    drawModeLabel: '即时',
    modeNotice: '',
    shareHidden: false,
    buttonText: '加载中',
    buttonDisabled: true,
    drawing: false,
    activePrizeIndex: -1,
    resultVisible: false,
    result: null,
    resultTitle: '',
    resultCopy: '',
    resultActionText: '',
    notFound: false
  },

  onLoad(options) {
    const activityId = options && options.id ? decodeURIComponent(options.id) : ''
    this.setData({ activityId })
    this.refreshActivity()
  },

  onShow() {
    if (!this.data.activityId) return
    this.refreshActivity()
    this.recoverDrawIfNeeded()
    this.startTicker()
  },

  onHide() {
    this.stopTicker()
    if (this.data.drawing) this.stopAnimation(true)
  },

  onUnload() {
    this.stopTicker()
    this.stopAnimation(false)
  },

  onPullDownRefresh() {
    this.refreshActivity()
    wx.stopPullDownRefresh()
  },

  startTicker() {
    this.stopTicker()
    this._ticker = setInterval(() => this.refreshActivity(), 60000)
  },

  stopTicker() {
    if (this._ticker) clearInterval(this._ticker)
    this._ticker = null
  },

  stopAnimation(prepareRecovery) {
    if (this._animationTimer) clearTimeout(this._animationTimer)
    this._animationTimer = null
    this._animationToken = null
    if (prepareRecovery) {
      this._handledDrawId = null
      this.setData({ drawing: false, activePrizeIndex: -1 })
    }
  },

  refreshActivity() {
    const state = loadState()
    const app = getApp()
    const activity = (state.activities || []).find((item) => item.id === this.data.activityId)
    app.globalData.state = state

    if (!activity) {
      this.setData({ notFound: true, activity: null, shareHidden: true })
      this.syncShareMenu(true)
      return
    }

    const now = Date.now()
    const statusKey = getActivityStatus(activity, now)
    const statusMeta = STATUS_META[statusKey] || STATUS_META.ended
    const remaining = getRemainingQuota(state, activity.id, now)
    const rawPrizes = Array.isArray(activity.prizes) ? activity.prizes.slice(0, 8) : []
    const availableCount = rawPrizes.filter((prize) => (
      prize.enabled !== false &&
      Number(prize.weight) > 0 &&
      (prize.stock === null || Number(prize.stock) > 0)
    )).length
    const drawMode = getDrawModeMeta(activity.drawMode)
    const prizeOverview = getPrizeOverview(rawPrizes)
    const shareHidden = Array.isArray(activity.enabledFeatures) && activity.enabledFeatures.includes('hideShare')
    const pendingResult = Boolean(state.pendingDraw && state.pendingDraw.activityId === activity.id)
    const button = getButtonState(statusKey, remaining, availableCount, this.data.drawing, drawMode, pendingResult)
    let countdownText = ''
    if (statusKey === 'active') countdownText = `距结束 ${formatCountdown(activity.endAt, now)}`
    if (statusKey === 'upcoming') countdownText = `${formatCountdown(activity.startAt, now)}后开始`
    if (statusKey === 'paused') countdownText = '主办方暂时停止参与'
    if (statusKey === 'ended') countdownText = `${formatShortDate(activity.endAt)} 已结束`

    this.setData({
      notFound: false,
      activity: {
        ...activity,
        coverTone: activity.coverTone || 'coral',
        coverSymbol: activity.coverSymbol || '奖',
        organizer: activity.organizer || '好运抽奖',
        category: activity.category || '精选活动',
        subtitle: activity.subtitle || '免费参与，试试今天的手气',
        contact: activity.contact || '请联系活动主办方',
        rules: Array.isArray(activity.rules) ? activity.rules : [],
        introBlocks: Array.isArray(activity.introBlocks) ? activity.introBlocks.filter(Boolean) : []
      },
      prizes: normalizePrizes(rawPrizes),
      statusKey,
      statusLabel: statusMeta.label,
      statusClass: statusMeta.className,
      countdownText,
      timeRangeText: `${formatDateTime(activity.startAt)} 至 ${formatDateTime(activity.endAt)}`,
      remaining,
      quotaText: `今日 ${remaining}/${Number(activity.dailyLimit) || 0} 次`,
      participantText: `${Number(activity.participantCount) || 0} 人已参与`,
      prizeKindText: prizeOverview.prizeKindText,
      stockSummaryText: prizeOverview.stockSummaryText,
      drawModeLabel: drawMode.resultLabel,
      modeNotice: drawMode.supported ? '' : `${drawMode.label}需要服务端统一记录参与者并结算，本地演示暂不开奖。`,
      pendingResult,
      shareHidden,
      buttonText: button.text,
      buttonDisabled: button.disabled
    }, () => this.syncShareMenu(shareHidden))
  },

  syncShareMenu(hidden) {
    if (hidden && typeof wx.hideShareMenu === 'function') {
      wx.hideShareMenu()
      return
    }
    if (!hidden && typeof wx.showShareMenu === 'function') {
      wx.showShareMenu({ withShareTicket: false })
    }
  },

  recoverDrawIfNeeded() {
    const pending = recoverPendingDraw(this.data.activityId)
    if (!pending || pending.drawId === this._handledDrawId || this.data.resultVisible || this.data.drawing) return
    this._handledDrawId = pending.drawId
    wx.showToast({ title: '正在恢复抽奖结果', icon: 'none' })
    this.runAnimation(pending)
  },

  startDraw() {
    if (this.data.buttonDisabled || this.data.drawing) return

    const anyPending = recoverPendingDraw()
    if (anyPending) {
      if (anyPending.activityId === this.data.activityId) {
        this._handledDrawId = anyPending.drawId
        this.runAnimation(anyPending)
      } else {
        wx.showModal({
          title: '还有结果待查看',
          content: '请先查看上一场活动的抽奖结果。',
          confirmText: '去查看',
          success: (response) => {
            if (response.confirm) {
              wx.redirectTo({ url: `/pages/detail/detail?id=${encodeURIComponent(anyPending.activityId)}` })
            }
          }
        })
      }
      return
    }

    try {
      const committed = commitDraw(this.data.activityId)
      getApp().globalData.state = committed.state
      this._handledDrawId = committed.pendingDraw.drawId
      wx.vibrateShort({ type: 'light' })
      this.runAnimation(committed.pendingDraw)
    } catch (error) {
      const message = DRAW_ERROR_MESSAGES[error.message]
      if (error.message === 'PENDING_DRAW_EXISTS') {
        this._handledDrawId = null
        this.recoverDrawIfNeeded()
      } else {
        wx.showToast({ title: message || '抽奖没有完成，请稍后再试', icon: 'none' })
      }
      this.refreshActivity()
    }
  },

  runAnimation(pending) {
    if (!pending || !pending.result) return
    this.stopAnimation(false)
    const winnerIndex = Math.max(0, Math.min(7, Number(pending.winnerIndex) || 0))
    const steps = buildAnimationSteps(GRID_SLOTS[winnerIndex], 3).map((slot) => GRID_SLOTS.indexOf(slot))
    const token = `${pending.drawId}_${Date.now()}`
    this._animationToken = token
    this.setData({ drawing: true, resultVisible: false, activePrizeIndex: -1, buttonText: '好运揭晓中', buttonDisabled: true })

    let cursor = 0
    const advance = () => {
      if (this._animationToken !== token) return
      const activePrizeIndex = steps[cursor]
      this.setData({ activePrizeIndex })
      cursor += 1
      if (cursor >= steps.length) {
        this._animationTimer = setTimeout(() => this.revealResult(pending), 320)
        return
      }
      const progress = cursor / steps.length
      const delay = 52 + Math.round(Math.pow(progress, 3) * 225)
      this._animationTimer = setTimeout(advance, delay)
    }
    advance()
  },

  revealResult(pending) {
    this._animationTimer = null
    this._animationToken = null
    const result = pending.result
    const isWin = Boolean(result.isWin)
    const resultActionText = result.prizeType === 'physical'
      ? '填写领奖信息'
      : result.prizeType === 'coupon'
        ? '查看券码'
        : '我知道了'

    wx.vibrateShort({ type: isWin ? 'heavy' : 'light' })
    this.setData({
      drawing: false,
      activePrizeIndex: Math.max(0, Math.min(7, Number(pending.winnerIndex) || 0)),
      resultVisible: true,
      result,
      resultTitle: isWin ? '恭喜中奖' : '好运还在路上',
      resultCopy: isWin ? `你抽中了「${result.prizeName}」` : '谢谢参与，明天再来试试手气',
      resultActionText
    })
  },

  finishResult() {
    const result = this.data.result
    if (!result) return
    const nextState = acknowledgePendingDraw(result.id)
    getApp().globalData.state = nextState
    this._handledDrawId = null
    this.setData({ resultVisible: false, result: null, activePrizeIndex: -1 })
    this.refreshActivity()

    if (result.prizeType === 'physical' && result.isWin) {
      wx.navigateTo({ url: `/pages/claim/claim?id=${encodeURIComponent(result.id)}` })
    } else if (result.prizeType === 'coupon' && result.isWin) {
      wx.navigateTo({ url: `/pages/claim/claim?id=${encodeURIComponent(result.id)}` })
    }
  },

  closeResult() {
    if (this.data.drawing) return
    // Keep the committed result pending when the user closes the dialog. If
    // the page is interrupted before the user taps the action, the result can
    // still be recovered on the next visit instead of silently losing the CTA.
    this._handledDrawId = null
    this.setData({ resultVisible: false, result: null, activePrizeIndex: -1 })
    this.refreshActivity()
  },

  preventTouchMove() {},
  stopPropagation() {},

  goBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/index/index' })
    })
  },

  onShareAppMessage() {
    const activity = this.data.activity
    return {
      title: activity ? `${activity.title}，免费试试手气` : '好运抽奖',
      path: `/pages/detail/detail?id=${encodeURIComponent(this.data.activityId)}`
    }
  }
})
