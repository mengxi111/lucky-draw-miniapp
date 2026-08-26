const DAY = 24 * 60 * 60 * 1000

function createDefaultState(now = Date.now()) {
  return {
    schemaVersion: 1,
    revision: 1,
    profile: {
      nickname: '微信用户',
      joinedAt: now
    },
    activities: [
      {
        id: 'summer_lucky',
        title: '夏日好运放送',
        subtitle: '把清凉和惊喜，一起送给认真生活的你',
        category: '品牌福利',
        coverTone: 'coral',
        coverSymbol: '礼',
        coverImage: '/assets/covers/summer.png',
        organizer: '好运生活体验馆',
        contact: '工作日 10:00-18:00',
        startAt: now - DAY,
        endAt: now + 12 * DAY,
        status: 'active',
        dailyLimit: 1,
        participantCount: 1248,
        official: true,
        createdByMe: false,
        rules: [
          '活动期间每位用户每天可免费参与 1 次。',
          '开奖结果以页面展示和抽奖记录为准。',
          '实物奖品请在中奖后 7 天内填写领奖信息，逾期视为放弃。',
          '本演示活动不收费，不以分享、关注或助力作为参与条件。'
        ],
        prizes: [
          { id: 'p1', name: '便携风扇', shortName: '便携风扇', symbol: '风', tone: 'mint', weight: 6, stock: 20, type: 'physical', enabled: true },
          { id: 'p2', name: '咖啡兑换券', shortName: '咖啡券', symbol: '咖', tone: 'amber', weight: 14, stock: 80, type: 'coupon', enabled: true },
          { id: 'p3', name: '帆布随行袋', shortName: '帆布袋', symbol: '袋', tone: 'blue', weight: 10, stock: 40, type: 'physical', enabled: true },
          { id: 'p4', name: '品牌贴纸包', shortName: '贴纸包', symbol: '贴', tone: 'pink', weight: 20, stock: 150, type: 'physical', enabled: true },
          { id: 'p5', name: '谢谢参与', shortName: '谢谢参与', symbol: '谢', tone: 'gray', weight: 50, stock: null, type: 'none', enabled: true },
          { id: 'p6', name: '清凉饮品券', shortName: '饮品券', symbol: '饮', tone: 'green', weight: 18, stock: 100, type: 'coupon', enabled: true },
          { id: 'p7', name: '香氛小夜灯', shortName: '小夜灯', symbol: '灯', tone: 'purple', weight: 5, stock: 12, type: 'physical', enabled: true },
          { id: 'p8', name: '好心情徽章', shortName: '好心情徽章', symbol: '章', tone: 'red', weight: 17, stock: 120, type: 'physical', enabled: true }
        ]
      },
      {
        id: 'weekend_coffee',
        title: '周末咖啡补给站',
        subtitle: '抽一份周末限定的松弛感',
        category: '门店活动',
        coverTone: 'coffee',
        coverSymbol: '咖',
        coverImage: '/assets/covers/coffee.png',
        organizer: '街角咖啡计划',
        contact: '门店营业时间内',
        startAt: now - 2 * DAY,
        endAt: now + 4 * DAY,
        status: 'active',
        dailyLimit: 2,
        participantCount: 386,
        createdByMe: false,
        rules: [
          '活动期间每位用户每天可免费参与 2 次。',
          '电子券仅限活动门店使用，具体有效期见中奖结果。',
          '奖品不可折现或转售。'
        ],
        prizes: [
          { id: 'c1', name: '双人咖啡套餐', shortName: '双人套餐', symbol: '双', tone: 'red', weight: 5, stock: 8, type: 'coupon', enabled: true },
          { id: 'c2', name: '拿铁兑换券', shortName: '拿铁券', symbol: '拿', tone: 'amber', weight: 20, stock: 60, type: 'coupon', enabled: true },
          { id: 'c3', name: '手冲体验券', shortName: '手冲券', symbol: '冲', tone: 'mint', weight: 12, stock: 24, type: 'coupon', enabled: true },
          { id: 'c4', name: '曲奇一份', shortName: '曲奇', symbol: '曲', tone: 'pink', weight: 18, stock: 50, type: 'coupon', enabled: true },
          { id: 'c5', name: '谢谢参与', shortName: '谢谢参与', symbol: '谢', tone: 'gray', weight: 45, stock: null, type: 'none', enabled: true },
          { id: 'c6', name: '美式兑换券', shortName: '美式券', symbol: '美', tone: 'blue', weight: 22, stock: 70, type: 'coupon', enabled: true },
          { id: 'c7', name: '随行杯', shortName: '随行杯', symbol: '杯', tone: 'purple', weight: 8, stock: 15, type: 'physical', enabled: true },
          { id: 'c8', name: '加料券', shortName: '加料券', symbol: '加', tone: 'green', weight: 25, stock: 100, type: 'coupon', enabled: true }
        ]
      },
      {
        id: 'camping_preview',
        title: '秋日露营装备局',
        subtitle: '下一场户外计划，从一份好装备开始',
        category: '兴趣社群',
        coverTone: 'forest',
        coverSymbol: '野',
        coverImage: '/assets/covers/camping.png',
        organizer: '城市户外俱乐部',
        contact: '社群管理员',
        startAt: now + 2 * DAY,
        endAt: now + 16 * DAY,
        status: 'upcoming',
        dailyLimit: 1,
        participantCount: 0,
        createdByMe: false,
        rules: ['活动开始后可免费参与，每位用户每天 1 次。'],
        prizes: [
          { id: 'o1', name: '折叠露营椅', shortName: '露营椅', symbol: '椅', tone: 'green', weight: 5, stock: 6, type: 'physical', enabled: true },
          { id: 'o2', name: '户外水杯', shortName: '户外水杯', symbol: '杯', tone: 'blue', weight: 10, stock: 20, type: 'physical', enabled: true },
          { id: 'o3', name: '贴纸套装', shortName: '贴纸套装', symbol: '贴', tone: 'amber', weight: 25, stock: 80, type: 'physical', enabled: true },
          { id: 'o4', name: '谢谢参与', shortName: '谢谢参与', symbol: '谢', tone: 'gray', weight: 60, stock: null, type: 'none', enabled: true },
          { id: 'o5', name: '营地体验券', shortName: '体验券', symbol: '营', tone: 'red', weight: 8, stock: 12, type: 'coupon', enabled: true },
          { id: 'o6', name: '户外餐具', shortName: '户外餐具', symbol: '餐', tone: 'mint', weight: 15, stock: 24, type: 'physical', enabled: true },
          { id: 'o7', name: '防晒帽', shortName: '防晒帽', symbol: '帽', tone: 'pink', weight: 12, stock: 18, type: 'physical', enabled: true },
          { id: 'o8', name: '手电筒', shortName: '手电筒', symbol: '灯', tone: 'purple', weight: 10, stock: 14, type: 'physical', enabled: true }
        ]
      }
    ],
    records: [],
    pendingDraw: null,
    updatedAt: now
  }
}

module.exports = { createDefaultState }
