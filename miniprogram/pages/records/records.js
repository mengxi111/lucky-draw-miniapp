const store = require('../../utils/store')
const { formatShortDate } = require('../../utils/time')
const { getActivityStatus } = require('../../utils/state')

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'wins', label: '中奖' },
  { key: 'created', label: '发起' }
]

function asTimestamp(value, fallback = 0) {
  const timestamp = typeof value === 'number' ? value : new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : fallback
}

function getActivityStatusMeta(activity, now) {
  const status = getActivityStatus(activity, now)
  if (status === 'ended') {
    return { label: '已结束', tone: 'muted' }
  }
  if (status === 'upcoming') {
    return { label: '未开始', tone: 'warn' }
  }
  if (status === 'paused') {
    return { label: '已暂停', tone: 'warn' }
  }
  return { label: '进行中', tone: 'active' }
}

function getRecordStatus(record, now) {
  if (!record.isWin) return { label: '未中奖', tone: 'muted', canClaim: false }
  if (record.claimStatus === 'submitted') {
    return { label: '已提交', tone: 'active', canClaim: true }
  }
  if (record.claimDeadline && asTimestamp(record.claimDeadline) < now) {
    return { label: '已过期', tone: 'muted', canClaim: false }
  }
  if (record.prizeType === 'coupon') {
    return { label: '查看券码', tone: 'active', canClaim: true }
  }
  return { label: '待领奖', tone: 'warn', canClaim: true }
}

function buildRecordItem(record, now) {
  const status = getRecordStatus(record, now)
  let actionText = '活动详情'
  if (status.canClaim) {
    if (record.claimStatus === 'submitted') actionText = '查看领奖'
    else if (record.prizeType === 'coupon') actionText = '查看券码'
    else actionText = '去领奖'
  }
  return {
    ...record,
    itemKey: `record-${record.id}`,
    itemType: 'record',
    sortAt: asTimestamp(record.drawnAt),
    timeText: record.drawnAt ? formatShortDate(record.drawnAt) : '时间待确认',
    symbol: record.prizeSymbol || (record.isWin ? '礼' : '谢'),
    prizeText: record.isWin ? (record.prizeName || '神秘奖品') : '本次未中奖',
    statusLabel: status.label,
    statusTone: status.tone,
    canClaim: status.canClaim,
    actionText
  }
}

function buildActivityItem(activity, now) {
  const status = getActivityStatusMeta(activity, now)
  return {
    ...activity,
    itemKey: `activity-${activity.id}`,
    itemType: 'activity',
    sortAt: asTimestamp(activity.createdAt, asTimestamp(activity.startAt)),
    timeText: activity.endAt ? `${formatShortDate(activity.endAt)} 截止` : '长期有效',
    symbol: activity.coverSymbol || '奖',
    statusLabel: status.label,
    statusTone: status.tone,
    participantText: `${activity.participantCount || 0} 人参与`
  }
}

Page({
  data: {
    filters: FILTERS,
    activeFilter: 'all',
    emptySymbol: '签',
    emptyTitle: '还没有抽奖记录',
    emptyCopy: '去发现页看看正在进行的活动，好运也许就在下一次。',
    items: [],
    allItems: [],
    winItems: [],
    createdItems: [],
    counts: { all: 0, wins: 0, created: 0 }
  },

  onShow() {
    this.loadRecords()
  },

  onPullDownRefresh() {
    this.loadRecords()
    wx.stopPullDownRefresh()
  },

  loadRecords() {
    const state = store.loadState() || {}
    const now = Date.now()
    const records = Array.isArray(state.records) ? state.records : []
    const activities = Array.isArray(state.activities) ? state.activities : []
    const recordItems = records.map((record) => buildRecordItem(record, now))
    const winItems = recordItems.filter((item) => item.isWin)
    const createdItems = activities
      .filter((activity) => activity.createdByMe)
      .map((activity) => buildActivityItem(activity, now))
    const allItems = [...recordItems, ...createdItems].sort((a, b) => b.sortAt - a.sortAt)

    const counts = {
      all: allItems.length,
      wins: winItems.length,
      created: createdItems.length
    }
    const activeFilter = this.data.activeFilter
    const source = { all: allItems, wins: winItems, created: createdItems }

    this.setData({
      filters: FILTERS.map((filter) => ({ ...filter, count: counts[filter.key] })),
      allItems,
      winItems,
      createdItems,
      counts,
      items: source[activeFilter] || []
    })
  },

  applyFilter(filter) {
    const source = {
      all: this.data.allItems,
      wins: this.data.winItems,
      created: this.data.createdItems
    }
    const emptyMeta = {
      all: {
        symbol: '签',
        title: '还没有抽奖记录',
        copy: '去发现页看看正在进行的活动，好运也许就在下一次。'
      },
      wins: {
        symbol: '奖',
        title: '还没有中奖记录',
        copy: '去发现页看看正在进行的活动，好运也许就在下一次。'
      },
      created: {
        symbol: '发',
        title: '还没有发起活动',
        copy: '发起一场轻松透明的抽奖，邀请朋友来参加。'
      }
    }[filter] || {}
    this.setData({
      activeFilter: filter,
      items: source[filter] || [],
      emptySymbol: emptyMeta.symbol,
      emptyTitle: emptyMeta.title,
      emptyCopy: emptyMeta.copy
    })
  },

  changeFilter(event) {
    this.applyFilter(event.currentTarget.dataset.filter)
  },

  openItem(event) {
    const { type, id, claimable } = event.currentTarget.dataset
    if (type === 'record' && claimable) {
      wx.navigateTo({ url: `/pages/claim/claim?id=${encodeURIComponent(id)}` })
      return
    }
    const item = this.data.items.find((entry) => entry.itemKey === `${type}-${id}`)
    const activityId = type === 'activity' ? id : item && item.activityId
    if (activityId) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${encodeURIComponent(activityId)}` })
    }
  },

  goDiscover() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
