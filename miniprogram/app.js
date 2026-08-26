const store = require('./utils/store')

App({
  globalData: {
    state: null
  },

  onLaunch() {
    this.globalData.state = store.loadState()
  },

  refreshState() {
    this.globalData.state = store.loadState()
    return this.globalData.state
  }
})
