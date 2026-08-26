const test = require('node:test')
const assert = require('node:assert/strict')

const { parseLocalDateTime } = require('../miniprogram/utils/time')

test('local date and time fields produce the selected wall-clock value', () => {
  const timestamp = parseLocalDateTime('2026-09-03', '18:45')
  const date = new Date(timestamp)
  assert.equal(date.getFullYear(), 2026)
  assert.equal(date.getMonth(), 8)
  assert.equal(date.getDate(), 3)
  assert.equal(date.getHours(), 18)
  assert.equal(date.getMinutes(), 45)
})

test('invalid local date and time fields are rejected', () => {
  assert.equal(Number.isNaN(parseLocalDateTime('2026-02-30', '12:00')), true)
  assert.equal(Number.isNaN(parseLocalDateTime('2026-09-03', '24:00')), true)
  assert.equal(Number.isNaN(parseLocalDateTime('', '')), true)
})
