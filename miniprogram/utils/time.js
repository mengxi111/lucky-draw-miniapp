function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatShortDate(timestamp) {
  const date = new Date(timestamp)
  return `${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatCountdown(endAt, now = Date.now()) {
  const remaining = Math.max(0, endAt - now)
  const days = Math.floor(remaining / 86400000)
  const hours = Math.floor((remaining % 86400000) / 3600000)
  const minutes = Math.floor((remaining % 3600000) / 60000)
  if (days > 0) return `${days}天 ${hours}小时`
  if (hours > 0) return `${hours}小时 ${minutes}分钟`
  return `${Math.max(1, minutes)}分钟`
}

function parseLocalDateTime(dateValue, timeValue) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ''))
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(timeValue || ''))
  if (!dateMatch || !timeMatch) return NaN

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return NaN

  const date = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) return NaN
  return date.getTime()
}

module.exports = {
  formatDateTime,
  formatShortDate,
  formatCountdown,
  parseLocalDateTime
}
