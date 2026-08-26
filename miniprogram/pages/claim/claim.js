const store = require('../../utils/store')
const { formatDateTime } = require('../../utils/time')

function asTimestamp(value) {
  const timestamp = typeof value === 'number' ? value : new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function makeCouponCode(id) {
  const normalized = String(id || 'LUCKY')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(-8)
  return `LUCKY-${normalized.padStart(8, '0')}`
}

Page({
  data: {
    loading: true,
    invalid: false,
    expired: false,
    record: null,
    isCoupon: false,
    isSubmitted: false,
    deadlineText: '',
    submittedText: '',
    couponCode: '',
    couponDeadlineCopy: '',
    regionText: '',
    form: {
      recipient: '',
      mobile: '',
      region: [],
      address: ''
    },
    agreed: false,
    submitting: false
  },

  onLoad(options) {
    this.recordId = options && options.id ? decodeURIComponent(options.id) : ''
  },

  onShow() {
    this.loadClaim()
  },

  loadClaim() {
    let state
    try {
      state = store.loadState() || {}
    } catch (error) {
      this.setData({ loading: false, invalid: true, record: null })
      wx.showToast({ title: '领奖记录读取失败，请重试', icon: 'none' })
      return
    }
    const records = Array.isArray(state.records) ? state.records : []
    const record = records.find((item) => String(item.id) === String(this.recordId))
    if (!record || !record.isWin) {
      this.setData({ loading: false, invalid: true, record: null })
      return
    }

    const isCoupon = record.prizeType === 'coupon'
    const isSubmitted = record.claimStatus === 'submitted'
    const expired = !isSubmitted && record.claimDeadline && asTimestamp(record.claimDeadline) < Date.now()
    const claim = record.claim || {}

    if (isCoupon && record.claimStatus === 'pending' && !expired) {
      const viewedAt = Date.now()
      try {
        state = store.updateState((draft) => ({
          ...draft,
          records: (draft.records || []).map((item) => (
            String(item.id) === String(this.recordId)
              ? { ...item, claimStatus: 'viewed', claim: { ...(item.claim || {}), viewedAt } }
              : item
          ))
        }))
      } catch (error) {
        // Viewing the local demo code is still useful if the status marker fails.
      }
    }

    this.setData({
      loading: false,
      invalid: false,
      expired: Boolean(expired),
      record,
      isCoupon,
      isSubmitted,
      deadlineText: record.claimDeadline ? formatDateTime(record.claimDeadline) : '',
      submittedText: claim.submittedAt ? formatDateTime(claim.submittedAt) : '',
      couponCode: isCoupon ? makeCouponCode(record.id) : '',
      couponDeadlineCopy: record.claimDeadline
        ? `请在 ${formatDateTime(record.claimDeadline)} 前完成核销。`
        : '具体核销时间请以主办方说明为准。',
      form: {
        recipient: claim.recipient || '',
        mobile: claim.mobile || '',
        region: Array.isArray(claim.region) ? claim.region : [],
        address: claim.address || ''
      },
      regionText: Array.isArray(claim.region) ? claim.region.join(' ') : '',
      agreed: isSubmitted
    })
  },

  updateField(event) {
    const field = event.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: event.detail.value })
  },

  chooseRegion(event) {
    const region = event.detail.value || []
    this.setData({
      'form.region': region,
      regionText: region.join(' ')
    })
  },

  toggleAgreement() {
    if (!this.data.isSubmitted) this.setData({ agreed: !this.data.agreed })
  },

  copyCoupon() {
    wx.setClipboardData({
      data: this.data.couponCode,
      success: () => wx.showToast({ title: '券码已复制', icon: 'success' })
    })
  },

  submitClaim() {
    if (this.data.submitting || this.data.isSubmitted || this.data.expired) return
    const deadline = this.data.record && asTimestamp(this.data.record.claimDeadline)
    if (deadline && deadline < Date.now()) {
      this.setData({ expired: true })
      wx.showToast({ title: '领奖时间已截止', icon: 'none' })
      return
    }
    const form = {
      recipient: this.data.form.recipient.trim(),
      mobile: this.data.form.mobile.trim(),
      region: this.data.form.region,
      address: this.data.form.address.trim()
    }

    if (!form.recipient) {
      wx.showToast({ title: '请填写收件人', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(form.mobile)) {
      wx.showToast({ title: '请填写有效手机号', icon: 'none' })
      return
    }
    if (!Array.isArray(form.region) || form.region.length < 3) {
      wx.showToast({ title: '请选择所在地区', icon: 'none' })
      return
    }
    if (form.address.length < 5) {
      wx.showToast({ title: '请填写详细地址', icon: 'none' })
      return
    }
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意信息使用说明', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    const submittedAt = Date.now()
    try {
      store.updateState((state) => {
        let updated = false
        const records = (Array.isArray(state.records) ? state.records : []).map((record) => {
          if (String(record.id) !== String(this.recordId)) return record
          const deadline = asTimestamp(record.claimDeadline)
          if (!record.isWin || record.prizeType !== 'physical' || record.claimStatus !== 'pending') {
            throw new Error('CLAIM_NOT_AVAILABLE')
          }
          if (deadline && deadline < submittedAt) throw new Error('CLAIM_EXPIRED')
          updated = true
          return {
            ...record,
            claimStatus: 'submitted',
            claim: { ...form, submittedAt }
          }
        })
        if (!updated) throw new Error('CLAIM_NOT_FOUND')
        return { ...state, records }
      })
      const app = getApp()
      if (app && typeof app.refreshState === 'function') app.refreshState()
      this.setData({ submitting: false })
      this.loadClaim()
      wx.showToast({ title: '领奖信息已提交', icon: 'success' })
    } catch (error) {
      this.setData({ submitting: false })
      const message = error.message === 'CLAIM_EXPIRED'
        ? '领奖时间已截止'
        : error.message === 'CLAIM_NOT_AVAILABLE' || error.message === 'CLAIM_NOT_FOUND'
          ? '领奖记录已失效，请刷新后重试'
          : '提交失败，请重试'
      wx.showToast({ title: message, icon: 'none' })
      this.loadClaim()
    }
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.redirectTo({ url: '/pages/records/records' })
    }
  }
})
