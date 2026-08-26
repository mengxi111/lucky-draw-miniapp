const store = require('../../utils/store')
const { formatShortDate } = require('../../utils/time')
const { getActivityStatus } = require('../../utils/state')

function asTimestamp(value) {
  const timestamp = typeof value === 'number' ? value : new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function activityStatus(activity, now) {
  const status = getActivityStatus(activity, now)
  if (status === 'ended') {
    return { label: '已结束', tone: 'muted' }
  }
  if (status === 'upcoming') {
    return { label: '未开始', tone: 'warn', actionText: '' }
  }
  if (status === 'paused') {
    return { label: '已暂停', tone: 'warn', actionText: '恢复参与' }
  }
  return { label: '进行中', tone: 'active', actionText: '暂停参与' }
}

Page({
  data: {
    nickname: '好运体验官',
    avatarText: '好',
    stats: [
      { key: 'draws', value: 0, label: '参与' },
      { key: 'wins', value: 0, label: '中奖' },
      { key: 'created', value: 0, label: '发起' }
    ],
    recordCount: 0,
    pendingClaimCount: 0,
    createdActivities: []
  },

  onShow() {
    this.loadProfile()
  },

  loadProfile() {
    const state = store.loadState() || {}
    const records = Array.isArray(state.records) ? state.records : []
    const activities = Array.isArray(state.activities) ? state.activities : []
    const nickname = (state.profile && state.profile.nickname) || '好运体验官'
    const now = Date.now()
    const createdActivities = activities
      .filter((activity) => activity.createdByMe)
      .map((activity) => {
        const status = activityStatus(activity, now)
        return {
          ...activity,
          symbol: activity.coverSymbol || '奖',
          statusKey: getActivityStatus(activity, now),
          endText: activity.endAt ? `${formatShortDate(activity.endAt)} 截止` : '长期有效',
          statusLabel: status.label,
          statusTone: status.tone,
          actionText: status.actionText
        }
      })
      .sort((a, b) => asTimestamp(b.createdAt || b.startAt) - asTimestamp(a.createdAt || a.startAt))

    this.setData({
      nickname,
      avatarText: nickname.trim().slice(0, 1) || '好',
      stats: [
        { key: 'draws', value: records.length, label: '参与' },
        { key: 'wins', value: records.filter((record) => record.isWin).length, label: '中奖' },
        { key: 'created', value: createdActivities.length, label: '发起' }
      ],
      recordCount: records.length,
      pendingClaimCount: records.filter((record) => (
        record.isWin &&
        record.claimStatus === 'pending' &&
        (!record.claimDeadline || asTimestamp(record.claimDeadline) >= now)
      )).length,
      createdActivities
    })
  },

  goRecords() {
    wx.navigateTo({ url: '/pages/records/records' })
  },

  openActivity(event) {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${encodeURIComponent(event.currentTarget.dataset.id)}`
    })
  },

  toggleActivity(event) {
    const activityId = event.currentTarget.dataset.id
    const action = event.currentTarget.dataset.action
    const activity = (store.loadState().activities || []).find((item) => item.id === activityId)
    if (!activity || !activity.createdByMe || !['pause', 'resume'].includes(action)) return

    const isPausing = action === 'pause'
    wx.showModal({
      title: isPausing ? '暂停这场活动？' : '恢复这场活动？',
      content: isPausing
        ? '暂停后，参与者将暂时无法抽奖，已有抽奖记录和领奖信息不会受影响。'
        : '恢复后，参与者可以继续参与，活动截止时间保持不变。',
      confirmText: isPausing ? '确认暂停' : '确认恢复',
      confirmColor: isPausing ? '#C54033' : '#08A962',
      success: (result) => {
        if (!result.confirm) return
        try {
          const nextState = store.updateState((state) => ({
            ...state,
            activities: (state.activities || []).map((item) => (
              item.id === activityId
                ? {
                    ...item,
                    status: isPausing ? 'paused' : 'active',
                    ...(isPausing ? { pausedAt: Date.now() } : { resumedAt: Date.now() })
                  }
                : item
            ))
          }))
          const app = getApp()
          if (app) app.globalData.state = nextState
          this.loadProfile()
          wx.showToast({ title: isPausing ? '活动已暂停' : '活动已恢复', icon: 'success' })
        } catch (error) {
          wx.showToast({ title: '操作失败，请重试', icon: 'none' })
        }
      }
    })
  },

  goCreate() {
    wx.switchTab({ url: '/pages/create/create' })
  },

  confirmReset() {
    wx.showModal({
      title: '清空本地演示数据？',
      content: '参与记录、领奖信息和你发起的活动都会恢复为初始演示状态。此操作无法撤销。',
      confirmText: '继续清空',
      confirmColor: '#D94A3A',
      success: (firstResult) => {
        if (!firstResult.confirm) return
        wx.showModal({
          title: '再次确认',
          content: '确定要清空并恢复演示数据吗？',
          confirmText: '确认清空',
          confirmColor: '#D94A3A',
          success: (secondResult) => {
            if (!secondResult.confirm) return
            try {
              store.resetState()
              store.clearCreateDraft()
              const app = getApp()
              if (app && typeof app.refreshState === 'function') app.refreshState()
              this.loadProfile()
              wx.showToast({ title: '已恢复演示数据', icon: 'success' })
            } catch (error) {
              wx.showToast({ title: '清空失败，请重试', icon: 'none' })
            }
          }
        })
      }
    })
  }
})
