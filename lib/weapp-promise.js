const promise = module.exports = {}
promise.default = promise

/**
 * promise.app ==> getApp()
 */

if (!wx.showLoading) {
  wx.showLoading = (obj) => {
    obj.icon = 'loading'
    wx.showToast(obj)
  }

  wx.hideBusy = wx.hideToast
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

Object.defineProperty(promise, 'app', {
  get: function () {
    return getApp()
  }
})

promise.showBusy = function (title = '正在载入...', mask = true) {
  return promise.showLoading({ title, mask })
}

promise.hideBusy = promise.hideLoading

promise.showMessage = (content) => {
  return promise.showModal({ showCancel: false, content })
}

promise.page = function () {
  let args = Array.from(arguments).reverse()
  let data = {}

  args.forEach(item => {
    if (item.data) {
      data = Object.assign({}, data, item.data)
    }
  })

  args.unshift({})

  let configs = Object.assign.apply(Object, args)
  configs.data = data

  Page(configs)
}
