const DRAW_MODE_OPTIONS = [
  {
    key: 'time',
    label: '按时间开奖',
    resultLabel: '定时',
    supported: false,
    unavailableText: '需服务端'
  },
  {
    key: 'people',
    label: '按人数开奖',
    resultLabel: '满员',
    supported: false,
    unavailableText: '需服务端'
  },
  {
    key: 'instant',
    label: '即抽即中',
    resultLabel: '即时',
    supported: true,
    unavailableText: ''
  }
]

function getDrawModeOptions() {
  return DRAW_MODE_OPTIONS.map((item) => ({ ...item }))
}

function getDrawModeMeta(mode) {
  const normalized = mode === undefined || mode === null || mode === '' ? 'instant' : mode
  const match = DRAW_MODE_OPTIONS.find((item) => item.key === normalized)
  if (match) return { ...match }
  return {
    key: normalized,
    label: '未知开奖方式',
    resultLabel: '未知',
    supported: false,
    unavailableText: '暂不可用'
  }
}

function isDrawModeSupported(mode) {
  return getDrawModeMeta(mode).supported
}

module.exports = {
  getDrawModeOptions,
  getDrawModeMeta,
  isDrawModeSupported
}
