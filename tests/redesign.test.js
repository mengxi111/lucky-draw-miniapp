const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')

test('reference redesign uses three primary tabs and keeps records as a page', () => {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'miniprogram', 'app.json'), 'utf8'))
  assert.deepEqual(app.tabBar.list.map((item) => item.text), ['首页', '发起抽奖', '我的'])
  assert.ok(app.pages.includes('pages/records/records'))
  assert.ok(!app.tabBar.list.some((item) => item.pagePath === 'pages/records/records'))
})

test('home provides command entry and create page provides reference configuration sections', () => {
  const home = fs.readFileSync(path.join(root, 'miniprogram', 'pages', 'index', 'index.wxml'), 'utf8')
  const create = fs.readFileSync(path.join(root, 'miniprogram', 'pages', 'create', 'create.wxml'), 'utf8')
  const createScript = fs.readFileSync(path.join(root, 'miniprogram', 'pages', 'create', 'create.js'), 'utf8')
  const drawModeScript = fs.readFileSync(path.join(root, 'miniprogram', 'utils', 'draw-mode.js'), 'utf8')
  assert.match(home, /官方大奖/)
  assert.match(home, /输入口令，进入专属抽奖/)
  assert.match(home, /今日奖品/)
  assert.match(create, /奖品名称/)
  assert.match(drawModeScript, /按时间开奖/)
  assert.match(createScript, /drawMode: 'instant'/)
  assert.match(create, /联系方式/)
  assert.match(create, /展开参与页设置/)
  assert.match(create, /预览配置/)
  assert.match(create, /活动截止/)
  assert.match(create, /核心信息/)
  assert.match(create, /云端版扩展能力/)
  assert.match(create, /清除保存/)
})

test('reference redesign does not depend on remote image assets', () => {
  const files = [
    path.join(root, 'miniprogram', 'pages', 'index', 'index.wxml'),
    path.join(root, 'miniprogram', 'pages', 'create', 'create.wxml')
  ]
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /https?:\/\//)
  }
})

test('visible configuration options have matching local behavior', () => {
  const create = fs.readFileSync(path.join(root, 'miniprogram', 'pages', 'create', 'create.js'), 'utf8')
  const detail = fs.readFileSync(path.join(root, 'miniprogram', 'pages', 'detail', 'detail.wxml'), 'utf8')
  const detailScript = fs.readFileSync(path.join(root, 'miniprogram', 'pages', 'detail', 'detail.js'), 'utf8')
  const homeScript = fs.readFileSync(path.join(root, 'miniprogram', 'pages', 'index', 'index.js'), 'utf8')

  assert.match(create, /key: 'redpacket'.+available: false/)
  assert.match(create, /key: 'code'.+available: false/)
  assert.match(create, /key: 'shop'.+available: false/)
  assert.match(create, /请输入有效的 11 位手机号/)
  assert.match(detail, /wx:if="{{!shareHidden}}"/)
  assert.match(detailScript, /enabledFeatures\.includes\('hideShare'\)/)
  assert.match(homeScript, /profile\.rewardReminders/)
  assert.match(homeScript, /不会发送通知/)
  assert.match(homeScript, /已暂停/)
  assert.match(detailScript, /活动已暂停/)
  assert.match(detailScript, /查看券码/)
  assert.match(detailScript, /查看抽奖结果/)
  assert.match(detail, /item\.unavailable/)
  assert.match(fs.readFileSync(path.join(root, 'miniprogram', 'pages', 'profile', 'profile.wxml'), 'utf8'), /toggleActivity/)
})

test('created supplementary notes are rendered on the activity detail page', () => {
  const createScript = fs.readFileSync(path.join(root, 'miniprogram', 'pages', 'create', 'create.js'), 'utf8')
  const detail = fs.readFileSync(path.join(root, 'miniprogram', 'pages', 'detail', 'detail.wxml'), 'utf8')
  assert.match(createScript, /introBlocks:/)
  assert.match(detail, /activity\.introBlocks/)
  assert.match(detail, /补充说明/)
})
