const store = require('../../utils/store')
const id = require('../../utils/id')
const { getDrawModeOptions, isDrawModeSupported } = require('../../utils/draw-mode')
const { formatDateTime, parseLocalDateTime } = require('../../utils/time')

const LIMIT_OPTIONS = [1, 2, 3, 5]
const PRIZE_TYPE_OPTIONS = [
  { key: 'physical', label: '奖品', drawType: 'physical', symbol: '礼', available: true },
  { key: 'coupon', label: '优惠券', drawType: 'coupon', symbol: '券', available: true },
  { key: 'redpacket', label: '红包', drawType: null, symbol: '红', available: false },
  { key: 'code', label: '兑换码', drawType: null, symbol: '码', available: false },
  { key: 'shop', label: '商城奖品', drawType: null, symbol: '商', available: false }
]
const COVER_OPTIONS = [
  { tone: 'coral', image: '/assets/covers/summer.png' },
  { tone: 'gold', image: '/assets/covers/coffee.png' },
  { tone: 'green', image: '/assets/covers/camping.png' }
]
const TEMPLATE_PRESETS = [
  {
    key: 'fresh', mark: '新', label: '日常福利', category: '日常福利', coverIndex: 0, dailyLimit: 1,
    description: '感谢关注，欢迎免费参与本次抽奖。'
  },
  {
    key: 'group', mark: '群', label: '社群互动', category: '社群福利', coverIndex: 2, dailyLimit: 1,
    description: '社群成员专属福利，活动期间可免费参与。'
  },
  {
    key: 'annual', mark: '宴', label: '年会现场', category: '现场活动', coverIndex: 1, dailyLimit: 1,
    description: '现场福利抽奖，请在活动结束前完成参与。'
  },
  {
    key: 'official', mark: '公', label: '品牌活动', category: '品牌福利', coverIndex: 0, dailyLimit: 2,
    description: '品牌限时福利，奖品数量有限，欢迎免费参与。'
  }
]

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function makeShortName(name) {
  return name.length > 6 ? `${name.slice(0, 6)}…` : name
}

function makePrizes(name, stock, selectedType) {
  const typeOption = PRIZE_TYPE_OPTIONS.find((item) => item.key === selectedType) || PRIZE_TYPE_OPTIONS[0]
  const thanksWeights = [12, 12, 12, 12, 12, 11, 11]

  return Array.from({ length: 8 }, (_, index) => {
    if (index === 0) {
      return {
        id: id.createId('prize'),
        name,
        shortName: makeShortName(name),
        symbol: typeOption.symbol,
        tone: selectedType === 'coupon' ? 'green' : selectedType === 'redpacket' ? 'red' : 'coral',
        weight: 18,
        stock,
        type: typeOption.drawType,
        configuredType: selectedType,
        enabled: true
      }
    }
    return {
      id: id.createId('prize'),
      name: '谢谢参与',
      shortName: '谢谢参与',
      symbol: '谢',
      tone: 'muted',
      weight: thanksWeights[index - 1],
      stock: null,
      type: 'none',
      enabled: true
    }
  })
}

function getFormProgress(data) {
  const completed = [
    String(data.prizeName || '').trim().length >= 2,
    Number(data.prizeCount) > 0,
    Number.isFinite(parseLocalDateTime(data.endDate, data.endTime)),
    String(data.organizer || '').trim().length >= 2
  ].filter(Boolean).length
  return {
    completed,
    total: 4,
    percent: completed * 25,
    ready: completed === 4,
    copy: completed === 4 ? '基本信息已完整，可先预览再发布' : `还需完成 ${4 - completed} 项核心信息`
  }
}

function getFeatureSections() {
  return [
    {
      key: 'display',
      title: '参与页设置',
      items: [
        { key: 'hideShare', title: '隐藏参与页分享按钮', subtitle: '开启后参与者页面不显示分享入口', link: '', enabled: false, available: true }
      ]
    }
  ]
}

function getDraftFields(data) {
  return {
    activeTemplate: data.activeTemplate,
    coverTone: data.coverTone,
    coverImage: data.coverImage,
    coverIndex: data.coverIndex,
    prizeType: data.prizeType,
    prizeName: data.prizeName,
    prizeCount: data.prizeCount,
    drawMode: data.drawMode,
    endDate: data.endDate,
    endTime: data.endTime,
    participantGoal: data.participantGoal,
    unlockByParticipants: data.unlockByParticipants,
    dailyLimit: data.dailyLimit,
    organizer: data.organizer,
    description: data.description,
    introBlocks: data.introBlocks,
    contactType: data.contactType,
    contactText: data.contactText,
    moreExpanded: data.moreExpanded,
    featureSections: data.featureSections
  }
}

Page({
  data: {
    templates: TEMPLATE_PRESETS,
    activeTemplate: 'fresh',
    coverTone: COVER_OPTIONS[0].tone,
    coverImage: COVER_OPTIONS[0].image,
    coverIndex: 0,
    prizeTypes: PRIZE_TYPE_OPTIONS.filter((item) => item.available),
    cloudPrizeTypes: PRIZE_TYPE_OPTIONS.filter((item) => !item.available).map((item) => item.label).join('、'),
    prizeType: 'physical',
    prizeName: '',
    prizeCount: '1',
    drawModes: getDrawModeOptions(),
    drawMode: 'instant',
    endDate: '',
    endTime: '',
    minDate: '',
    maxDate: '',
    participantGoal: '100',
    unlockByParticipants: false,
    dailyLimit: 1,
    limitOptions: LIMIT_OPTIONS,
    organizer: '好运发起人',
    description: '',
    introBlocks: [],
    contactType: 'none',
    contactLabel: '设置引流信息',
    contactText: '',
    draftContactType: 'none',
    draftContactText: '',
    contactSheetVisible: false,
    contactOptions: [
      { key: 'qrcode', title: '二维码', subtitle: '图片上传需接入云存储', available: false },
      { key: 'phone', title: '手机号', subtitle: '填写用于领奖咨询的公开号码', available: true },
      { key: 'address', title: '店铺地址', subtitle: '填写线下领奖或到店使用地址', available: true }
    ],
    contactError: '',
    moreExpanded: false,
    featureSections: getFeatureSections(),
    cloudCapabilities: ['定时与人数开奖', '兑换码与红包履约', '口令、问卷和地域条件', '运营统计与核销后台'],
    errors: {},
    submitting: false,
    formProgress: { completed: 2, total: 4, percent: 50, ready: false, copy: '请完成核心信息' },
    previewVisible: false,
    previewActivity: null,
    previewPrizeText: '',
    previewEndText: '',
    hasDraft: false,
    draftSavedText: ''
  },

  onLoad() {
    const now = new Date()
    const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const maxEnd = new Date(now.getFullYear() + 10, 11, 31)
    this.setData({
      endDate: formatDate(defaultEnd),
      endTime: formatTime(defaultEnd),
      minDate: formatDate(now),
      maxDate: formatDate(maxEnd)
    }, () => {
      this.restoreDraft()
      this.refreshFormProgress()
    })
  },

  onShow() {
    if (this.data.submitting) this.setData({ submitting: false })
  },

  onHide() {
    if (!this.data.submitting && (this._draftDirty || this.data.hasDraft)) this.saveDraftNow()
  },

  onUnload() {
    if (this._draftSaveTimer) clearTimeout(this._draftSaveTimer)
    this._draftSaveTimer = null
  },

  restoreDraft() {
    let draft
    try {
      draft = store.loadCreateDraft()
    } catch (error) {
      return
    }
    if (!draft || !draft.savedAt) return

    const fields = getDraftFields(draft)
    Object.keys(fields).forEach((key) => {
      if (fields[key] === undefined) delete fields[key]
    })
    const contactOption = this.data.contactOptions.find((item) => item.key === fields.contactType)
    fields.contactLabel = fields.contactText
      ? `${contactOption ? contactOption.title : '联系方式'} · 已填写`
      : (contactOption ? contactOption.title : '设置引流信息')
    this.setData({
      ...fields,
      hasDraft: true,
      draftSavedText: `已自动恢复草稿 · ${formatDateTime(draft.savedAt)}`
    }, () => {
      this.refreshFormProgress()
      wx.showToast({ title: '已恢复上次未完成的草稿', icon: 'none', duration: 1400 })
    })
  },

  collectDraft() {
    return getDraftFields(this.data)
  },

  saveDraftNow() {
    if (this._draftSaveTimer) clearTimeout(this._draftSaveTimer)
    this._draftSaveTimer = null
    try {
      const draft = store.saveCreateDraft(this.collectDraft())
      this.setData({ hasDraft: true, draftSavedText: `草稿已保存 · ${formatDateTime(draft.savedAt)}` })
    } catch (error) {
      // Draft persistence is best-effort and should never interrupt editing.
    }
  },

  persistDraft() {
    this._draftDirty = true
    if (this._draftSaveTimer) clearTimeout(this._draftSaveTimer)
    this._draftSaveTimer = setTimeout(() => this.saveDraftNow(), 180)
  },

  discardDraft() {
    wx.showModal({
      title: '清除保存的草稿？',
      content: '只会清除本机保存的草稿，不会删除当前页面正在编辑的内容。',
      confirmText: '清除保存',
      confirmColor: '#C54033',
      success: (result) => {
        if (!result.confirm) return
        store.clearCreateDraft()
        this._draftDirty = false
        this.setData({ hasDraft: false, draftSavedText: '' })
        wx.showToast({ title: '已清除草稿', icon: 'success' })
      }
    })
  },

  clearError(name) {
    if (this.data.errors[name]) this.setData({ [`errors.${name}`]: '' })
  },

  refreshFormProgress() {
    this.setData({ formProgress: getFormProgress(this.data) })
  },

  selectTemplate(event) {
    const preset = TEMPLATE_PRESETS.find((item) => item.key === event.currentTarget.dataset.key)
    if (!preset) return
    const previousPresetCopy = TEMPLATE_PRESETS.some((item) => item.description === this.data.description.trim())
    const cover = COVER_OPTIONS[preset.coverIndex]
    const changes = {
      activeTemplate: preset.key,
      coverIndex: preset.coverIndex,
      coverTone: cover.tone,
      coverImage: cover.image,
      dailyLimit: preset.dailyLimit
    }
    if (!this.data.description.trim() || previousPresetCopy) changes.description = preset.description
    this.setData(changes)
    this.persistDraft()
  },

  changeCover() {
    const coverIndex = (this.data.coverIndex + 1) % COVER_OPTIONS.length
    const cover = COVER_OPTIONS[coverIndex]
    this.setData({ coverIndex, coverTone: cover.tone, coverImage: cover.image })
    this.persistDraft()
  },

  selectPrizeType(event) {
    const prizeType = event.currentTarget.dataset.key
    const option = this.data.prizeTypes.find((item) => item.key === prizeType)
    if (!option || !option.available) {
      wx.showToast({ title: '该奖品类型需接入对应履约能力', icon: 'none' })
      return
    }
    this.setData({ prizeType })
    this.persistDraft()
  },

  onPrizeNameInput(event) {
    this.setData({ prizeName: event.detail.value })
    this.clearError('prizeName')
    this.refreshFormProgress()
    this.persistDraft()
  },

  onPrizeCountInput(event) {
    this.setData({ prizeCount: event.detail.value.replace(/[^0-9]/g, '') })
    this.clearError('prizeCount')
    this.refreshFormProgress()
    this.persistDraft()
  },

  selectDrawMode(event) {
    const drawMode = event.currentTarget.dataset.key
    if (!isDrawModeSupported(drawMode)) {
      wx.showToast({ title: '统一开奖需接入服务端', icon: 'none' })
      return
    }
    this.setData({ drawMode })
    this.clearError('schedule')
    this.persistDraft()
  },

  onDateChange(event) {
    this.setData({ endDate: event.detail.value })
    this.clearError('schedule')
    this.refreshFormProgress()
    this.persistDraft()
  },

  onTimeChange(event) {
    this.setData({ endTime: event.detail.value })
    this.clearError('schedule')
    this.refreshFormProgress()
    this.persistDraft()
  },

  onParticipantGoalInput(event) {
    this.setData({ participantGoal: event.detail.value.replace(/[^0-9]/g, '') })
    this.clearError('schedule')
    this.persistDraft()
  },

  onUnlockChange(event) {
    if (event.detail.value) {
      wx.showToast({ title: '奖品解锁需接入服务端', icon: 'none' })
    }
    this.setData({ unlockByParticipants: false })
  },

  onLimitTap(event) {
    this.setData({ dailyLimit: Number(event.currentTarget.dataset.value) })
    this.persistDraft()
  },

  onOrganizerInput(event) {
    this.setData({ organizer: event.detail.value })
    this.clearError('organizer')
    this.refreshFormProgress()
    this.persistDraft()
  },

  onDescriptionInput(event) {
    this.setData({ description: event.detail.value })
    this.persistDraft()
  },

  addIntroBlock() {
    if (this.data.introBlocks.length >= 3) {
      wx.showToast({ title: '最多添加 3 段图文介绍', icon: 'none' })
      return
    }
    this.setData({ introBlocks: [...this.data.introBlocks, ''] })
    this.persistDraft()
  },

  onIntroInput(event) {
    const index = Number(event.currentTarget.dataset.index)
    this.setData({ [`introBlocks[${index}]`]: event.detail.value })
    this.persistDraft()
  },

  removeIntroBlock(event) {
    const index = Number(event.currentTarget.dataset.index)
    this.setData({ introBlocks: this.data.introBlocks.filter((item, itemIndex) => itemIndex !== index) })
    this.persistDraft()
  },

  openContactSheet() {
    this.setData({
      contactSheetVisible: true,
      draftContactType: this.data.contactType,
      draftContactText: this.data.contactText
    })
  },

  closeContactSheet() {
    this.setData({ contactSheetVisible: false })
  },

  preventClose() {},

  selectContactType(event) {
    const draftContactType = event.currentTarget.dataset.key
    const option = this.data.contactOptions.find((item) => item.key === draftContactType)
    if (!option || !option.available) {
      wx.showToast({ title: '二维码上传需接入云存储', icon: 'none' })
      return
    }
    this.setData({
      draftContactType,
      draftContactText: draftContactType === this.data.draftContactType ? this.data.draftContactText : '',
      contactError: ''
    })
    this.persistDraft()
  },

  onContactTextInput(event) {
    this.setData({ draftContactText: event.detail.value, contactError: '' })
    this.persistDraft()
  },

  confirmContact() {
    const option = this.data.contactOptions.find((item) => item.key === this.data.draftContactType)
    if (!option) {
      this.setData({
        contactType: 'none', contactText: '', contactLabel: '设置引流信息', contactError: '', contactSheetVisible: false
      })
      return
    }
    if (!option.available) {
      this.setData({ contactError: '该联系方式暂未开放' })
      return
    }
    const contactText = this.data.draftContactText.trim()
    if (option.key === 'phone' && !/^1[3-9]\d{9}$/.test(contactText)) {
      this.setData({ contactError: '请输入有效的 11 位手机号' })
      return
    }
    if (option.key === 'address' && contactText.length < 5) {
      this.setData({ contactError: '请填写至少 5 个字的完整店铺地址' })
      return
    }
    this.setData({
      contactType: option.key,
      contactText,
      contactLabel: contactText ? `${option.title} · 已填写` : option.title,
      contactError: '',
      contactSheetVisible: false
    })
    this.persistDraft()
  },

  clearContact() {
    this.setData({ draftContactType: 'none', draftContactText: '', contactError: '' })
    this.persistDraft()
  },

  toggleMore() {
    this.setData({ moreExpanded: !this.data.moreExpanded })
    this.persistDraft()
  },

  onFeatureChange(event) {
    const sectionIndex = Number(event.currentTarget.dataset.section)
    const itemIndex = Number(event.currentTarget.dataset.index)
    const feature = this.data.featureSections[sectionIndex].items[itemIndex]
    if (!feature.available) {
      wx.showToast({ title: '此功能需接入服务端后开放', icon: 'none' })
      return
    }
    this.setData({ [`featureSections[${sectionIndex}].items[${itemIndex}].enabled`]: event.detail.value })
    this.persistDraft()
  },

  validate() {
    const prizeName = this.data.prizeName.trim()
    const prizeCount = Number(this.data.prizeCount)
    const organizer = this.data.organizer.trim()
    const prizeType = this.data.prizeTypes.find((item) => item.key === this.data.prizeType)
    const errors = {}

    if (prizeName.length < 2) errors.prizeName = '请输入至少 2 个字的奖品名称'
    if (!Number.isInteger(prizeCount) || prizeCount < 1 || prizeCount > 99999) {
      errors.prizeCount = '奖品份数须为 1 至 99999'
    }
    if (organizer.length < 2) errors.organizer = '请填写完整的抽奖发起人'
    if (!prizeType || !prizeType.available) errors.prizeType = '当前奖品类型尚未开放'

    if (!isDrawModeSupported(this.data.drawMode)) {
      errors.schedule = '当前本地演示仅支持即抽即中'
    }
    const endAt = parseLocalDateTime(this.data.endDate, this.data.endTime)
    if (!Number.isFinite(endAt) || endAt <= Date.now() + 60 * 1000) {
      errors.schedule = '活动截止时间须晚于当前时间'
    }

    this.setData({ errors })
    const firstError = Object.values(errors)[0]
    if (firstError) {
      wx.showToast({ title: firstError, icon: 'none' })
      return null
    }
    return { prizeName, prizeCount, organizer, endAt }
  },

  buildActivity(values) {
    const enabledFeatures = []
    this.data.featureSections.forEach((section) => {
      section.items.forEach((feature) => {
        if (feature.enabled) enabledFeatures.push(feature.key)
      })
    })
    const contactOption = this.data.contactOptions.find((item) => item.key === this.data.contactType)
    const template = TEMPLATE_PRESETS.find((item) => item.key === this.data.activeTemplate)
    const description = this.data.description.trim()
    const now = Date.now()

    return {
      id: id.createId('activity'),
      title: `${values.prizeName}抽奖`,
      subtitle: description || '免费参与，试试今天的手气',
      category: template ? template.category : '福利抽奖',
      coverTone: this.data.coverTone,
      coverImage: this.data.coverImage,
      coverSymbol: '奖',
      organizer: values.organizer,
      contact: this.data.contactText.trim() || (contactOption ? contactOption.title : '请联系活动发起人'),
      contactConfig: { type: this.data.contactType, text: this.data.contactText.trim() },
      startAt: now,
      endAt: values.endAt,
      createdAt: now,
      status: 'active',
      dailyLimit: this.data.dailyLimit,
      participantCount: 0,
      createdByMe: true,
      drawMode: 'instant',
      participantGoal: null,
      unlockByParticipants: false,
      prizeType: this.data.prizeType,
      introBlocks: this.data.introBlocks.map((item) => item.trim()).filter(Boolean),
      enabledFeatures,
      rules: [
        `每位参与者每天最多抽奖 ${this.data.dailyLimit} 次`,
        '参与后即时开奖',
        '活动免费参与，不以付费作为参与条件'
      ],
      prizes: makePrizes(values.prizeName, values.prizeCount, this.data.prizeType)
    }
  },

  onTest() {
    const values = this.validate()
    if (!values) return
    const activity = this.buildActivity(values)
    this.setData({
      previewVisible: true,
      previewActivity: activity,
      previewPrizeText: `${values.prizeName} × ${values.prizeCount} 份`,
      previewEndText: formatDateTime(values.endAt)
    })
  },

  closePreview() {
    if (!this.data.submitting) this.setData({ previewVisible: false, previewActivity: null })
  },

  onSubmit() {
    if (this.data.submitting) return
    const values = this.validate()
    if (!values) return
    const activity = this.buildActivity(values)
    this.setData({ submitting: true, previewVisible: false })

    try {
      const nextState = store.updateState((state) => ({
        ...state,
        activities: [activity, ...(state.activities || [])]
      }))
      store.clearCreateDraft()
      this._draftDirty = false
      const app = getApp()
      if (nextState) app.globalData.state = nextState
      else if (app.refreshState) app.refreshState()
      wx.showToast({ title: '抽奖已发起', icon: 'success', duration: 900 })
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/detail/detail?id=${encodeURIComponent(activity.id)}`,
          fail: () => wx.switchTab({ url: '/pages/profile/profile' })
        })
      }, 500)
    } catch (error) {
      this.setData({ submitting: false })
      wx.showToast({ title: '创建失败，请稍后重试', icon: 'none' })
    }
  }
})
