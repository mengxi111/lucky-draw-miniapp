const store = require('../../utils/store')
const { getActivityStatus, getRemainingQuota, getTodayKey } = require('../../utils/state')
const { formatShortDate, formatCountdown } = require('../../utils/time')

const COMMAND_ALIASES = {
  666: 'summer_lucky',
  summer: 'summer_lucky',
  '夏日': 'summer_lucky',
  coffee: 'weekend_coffee',
  '咖啡': 'weekend_coffee',
  camping: 'camping_preview',
  '露营': 'camping_preview'
}

const REWARD_DAYS = [
  { key: 'today', value: '66', label: '今日开奖', action: '抽', current: true },
  { key: 'tomorrow', value: '88', label: '明日开奖', action: '本机标记' },
  { key: 'day2', value: '128', label: '后天开奖', action: '本机标记' },
  { key: 'day3', value: '188', label: '大后天开奖', action: '本机标记' }
]

function statusMeta(activity, now) {
  const key = getActivityStatus(activity, now)
  if (key === 'active') {
    return { key, label: '进行中', timingText: `距结束 ${formatCountdown(activity.endAt, now)}` }
  }
  if (key === 'upcoming') {
    return { key, label: '即将开始', timingText: `${formatShortDate(activity.startAt)} 开始` }
  }
  if (key === 'paused') {
    return { key, label: '已暂停', timingText: '主办方暂时停止参与' }
  }
  return { key: 'ended', label: '已结束', timingText: `${formatShortDate(activity.endAt)} 已结束` }
}

function prizeSummary(activity) {
  const prizes = Array.isArray(activity.prizes) ? activity.prizes : []
  return prizes
    .filter((prize) => prize.enabled !== false && prize.type !== 'none')
    .slice(0, 3)
    .map((prize) => prize.shortName || prize.name)
    .join(' / ') || '多份好礼等你来'
}

function normalizeActivity(state, activity, now) {
  const status = statusMeta(activity, now)
  const remaining = getRemainingQuota(state, activity.id, now)
  return {
    ...activity,
    coverTone: activity.coverTone || 'coral',
    coverSymbol: activity.coverSymbol || '奖',
    coverImage: activity.coverImage || '',
    category: activity.category || '精选活动',
    organizer: activity.organizer || '好运抽奖',
    subtitle: activity.subtitle || '免费参与，试试今天的手气',
    participantText: `${Number(activity.participantCount) || 0} 人已参与`,
    prizeNames: prizeSummary(activity),
    statusKey: status.key,
    statusLabel: status.label,
    timingText: status.timingText,
    quotaText: status.key === 'active' ? `今日还可参与 ${remaining} 次` : ''
  }
}

Page({
  data: {
    officialActivity: null,
    prizeActivities: [],
    rewardDays: REWARD_DAYS,
    activeCount: 0,
    activityFilters: [
      { key: 'all', label: '全部' },
      { key: 'active', label: '进行中' },
      { key: 'upcoming', label: '即将开始' },
      { key: 'paused', label: '已暂停' }
    ],
    activeActivityFilter: 'all',
    allPrizeActivities: [],
    commandVisible: false,
    commandValue: '',
    commandError: '',
    commandFocus: false,
    signedIn: false
  },

  onLoad() {
    this.refreshActivities()
  },

  onShow() {
    this.refreshActivities()
    this.startTicker()
  },

  onHide() {
    this.stopTicker()
  },

  onUnload() {
    this.stopTicker()
  },

  onPullDownRefresh() {
    this.refreshActivities()
    wx.stopPullDownRefresh()
  },

  startTicker() {
    this.stopTicker()
    this._ticker = setInterval(() => this.refreshActivities(), 60000)
  },

  stopTicker() {
    if (this._ticker) clearInterval(this._ticker)
    this._ticker = null
  },

  refreshActivities() {
    const state = store.loadState()
    const now = Date.now()
    const activities = (Array.isArray(state.activities) ? state.activities : [])
      .map((activity) => normalizeActivity(state, activity, now))
      .sort((a, b) => {
        const order = { active: 0, upcoming: 1, paused: 2, ended: 3 }
        const difference = order[a.statusKey] - order[b.statusKey]
        return difference || Number(a.endAt) - Number(b.endAt)
      })
    const officialActivity = activities.find((activity) => activity.official && activity.statusKey === 'active') ||
      activities.find((activity) => activity.statusKey === 'active') || activities[0] || null
    const allPrizeActivities = activities.filter((activity) => !officialActivity || activity.id !== officialActivity.id)
    const activeActivityFilter = this.data.activeActivityFilter
    const prizeActivities = activeActivityFilter === 'all'
      ? allPrizeActivities
      : allPrizeActivities.filter((activity) => activity.statusKey === activeActivityFilter)
    const rewardReminders = new Set(
      state.profile && Array.isArray(state.profile.rewardReminders) ? state.profile.rewardReminders : []
    )

    getApp().globalData.state = state
    this.setData({
      officialActivity,
      allPrizeActivities,
      prizeActivities,
      rewardDays: REWARD_DAYS.map((item) => ({
        ...item,
        reminded: rewardReminders.has(item.key),
        action: !item.current && rewardReminders.has(item.key) ? '已标记' : item.action
      })),
      activeCount: activities.filter((activity) => activity.statusKey === 'active').length,
      signedIn: Boolean(state.profile && state.profile.lastSignInDay === getTodayKey(now))
    })
  },

  changeActivityFilter(event) {
    const activeActivityFilter = event.currentTarget.dataset.filter
    const prizeActivities = activeActivityFilter === 'all'
      ? this.data.allPrizeActivities
      : this.data.allPrizeActivities.filter((activity) => activity.statusKey === activeActivityFilter)
    this.setData({ activeActivityFilter, prizeActivities })
  },

  navigateToActivity(id) {
    if (!id) {
      wx.showToast({ title: '暂无可参与活动', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/detail/detail?id=${encodeURIComponent(id)}` })
  },

  openOfficial() {
    this.navigateToActivity(this.data.officialActivity && this.data.officialActivity.id)
  },

  openActivity(event) {
    this.navigateToActivity(event.currentTarget.dataset.id)
  },

  signIn() {
    if (this.data.signedIn) {
      wx.showToast({ title: '今天已签到', icon: 'none' })
      return
    }
    try {
      const nextState = store.updateState((state) => {
        state.profile = state.profile || {}
        state.profile.lastSignInDay = getTodayKey()
        return state
      })
      getApp().globalData.state = nextState
      this.setData({ signedIn: true })
      wx.showToast({ title: '签到成功', icon: 'success' })
    } catch (error) {
      wx.showToast({ title: '签到失败，请重试', icon: 'none' })
    }
  },

  showCommand() {
    this.setData({ commandVisible: true, commandError: '', commandFocus: true })
  },

  hideCommand() {
    this.setData({
      commandVisible: false,
      commandValue: '',
      commandError: '',
      commandFocus: false
    })
  },

  stopPropagation() {},

  onCommandInput(event) {
    this.setData({ commandValue: event.detail.value, commandError: '' })
  },

  submitCommand() {
    const command = String(this.data.commandValue || '').trim().toLowerCase()
    if (!command) {
      this.setData({ commandError: '请输入活动口令' })
      return
    }

    const state = store.loadState()
    const activities = Array.isArray(state.activities) ? state.activities : []
    const directMatch = activities.find((activity) => String(activity.id).toLowerCase() === command)
    const targetId = directMatch ? directMatch.id : COMMAND_ALIASES[command]
    const target = activities.find((activity) => activity.id === targetId)
    if (!target) {
      this.setData({ commandError: '没有找到该口令，请核对后重试' })
      return
    }

    this.hideCommand()
    this.navigateToActivity(target.id)
  },

  remindReward(event) {
    const item = this.data.rewardDays.find((reward) => reward.key === event.currentTarget.dataset.key)
    if (!item) return
    if (item.current) {
      this.openOfficial()
      return
    }
    if (item.reminded) {
      wx.showToast({ title: '已保存本机标记，不会发送通知', icon: 'none' })
      return
    }
    try {
      const nextState = store.updateState((state) => {
        state.profile = state.profile || {}
        const rewardReminders = Array.isArray(state.profile.rewardReminders) ? state.profile.rewardReminders : []
        state.profile.rewardReminders = [...new Set([...rewardReminders, item.key])]
        return state
      })
      getApp().globalData.state = nextState
      this.refreshActivities()
      wx.showToast({ title: '已保存本机标记，不会发送通知', icon: 'none' })
    } catch (error) {
      wx.showToast({ title: '标记失败，请重试', icon: 'none' })
    }
  },

  onShareAppMessage() {
    const activity = this.data.officialActivity
    return {
      title: activity ? `${activity.title}，免费试试手气` : '好运抽奖 · 免费活动正在进行',
      path: activity ? `/pages/detail/detail?id=${encodeURIComponent(activity.id)}` : '/pages/index/index'
    }
  }
})
