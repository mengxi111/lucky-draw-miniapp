const test = require('node:test')
const assert = require('node:assert/strict')

const { getDrawModeOptions, getDrawModeMeta, isDrawModeSupported } = require('../miniprogram/utils/draw-mode')

test('local demo exposes only instant draw as executable', () => {
  const options = getDrawModeOptions()
  assert.deepEqual(options.filter((item) => item.supported).map((item) => item.key), ['instant'])
  assert.equal(isDrawModeSupported('time'), false)
  assert.equal(isDrawModeSupported('people'), false)
  assert.equal(isDrawModeSupported('instant'), true)
})

test('activities created before draw modes existed remain instant-compatible', () => {
  assert.equal(getDrawModeMeta(undefined).key, 'instant')
  assert.equal(isDrawModeSupported(undefined), true)
  assert.equal(isDrawModeSupported('unexpected-mode'), false)
})
