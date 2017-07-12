const promise = module.exports = {}
promise.default = promise

/**
 * promise.app ==> getApp()
 */
Object.defineProperty(promise, 'app', {
  get: function () {
    return getApp()
  }
})

if (!wx.showLoading) {
  wx.showLoading = (obj) => {
    obj.icon = 'loading'
    wx.showToast(obj)
  }

  wx.hideLoading = wx.hideToast
}

/**
 * 没有 success fail 回调
 */
var noPromiseMethods = {
  stopRecord: false,
  pauseVoice: true,
  stopVoice: true,
  pauseBackgroundAudio: true,
  stopBackgroundAudio: true,
  showNavigationBarLoading: true,
  hideNavigationBarLoading: true,
  createAnimation: true,
  createContext: true,
  hideKeyboard: true,
  stopPullDownRefresh: true,
  createAudioContext: true,
  showMessage: true
}

function forEach (key) {
  if (noPromiseMethods[key] || key.substr(0, 2) === 'on' || /\w+Sync$/.test(key)) { // 没有 success fail 回调，以 on 开头，或以 Sync 结尾的用原始的方法
    promise[key] = function () {
      return wx[key].apply(wx, arguments)
    }
    return
  }

  // 转成 promise
  promise[key] = function (obj) {
    obj = obj || {}
    return new Promise(function (resolve, reject) {
      obj.success = resolve
      obj.fail = function (res) {
        if (res && res.errMsg) {
          reject(new Error(res.errMsg))
        } else {
          reject(res)
        }
      }
      wx[key](obj)
    })
  }
}

Object.keys(wx).forEach(forEach)

promise.showMessage = (title, content) => {
  return wx.showModal({ showCancel: false, title, content })
}
