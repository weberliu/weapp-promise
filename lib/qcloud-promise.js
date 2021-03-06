
import qcloud from '../../wafer-client-sdk/index'

var constants = require('../../wafer-client-sdk/lib/constants')
var utils = require('../../wafer-client-sdk/lib/utils')
var Session = require('../../wafer-client-sdk/lib/session')
var loginLib = require('../../wafer-client-sdk/lib/login')
var request = require('../../wafer-client-sdk/lib/request')

var noop = function noop () {}
var RequestError = request.RequestError
var buildSessionHeader = request.buildSessionHeader

function uploadFile (options) {
  if (typeof options !== 'object') {
    var message = '请求传参应为 object 类型，但实际传了 ' + (typeof options) + ' 类型'
    throw new RequestError(constants.ERR_INVALID_PARAMS, message)
  }

  var requireLogin = options.login
  var originHeader = options.header || {}

  // 是否已经进行过重试
  var hasRetried = false

  return new Promise((resolve, reject) => {
    if (requireLogin) {
      doRequestWithLogin()
    } else {
      doUploadFile()
    }

    // 登录后再请求
    function doRequestWithLogin () {
      loginLib.login({ success: doUploadFile, fail: noop })
    }

    // 实际进行请求的方法
    function doUploadFile () {
      var authHeader = buildSessionHeader()

      wx.uploadFile(utils.extend({}, options, {
        header: utils.extend({}, originHeader, authHeader),

        success: function (response) {
          var data = response.data

          // 如果响应的数据里面包含 SDK Magic ID，表示被服务端 SDK 处理过，此时一定包含登录态失败的信息
          if (data && data[constants.WX_SESSION_MAGIC_ID]) {
              // 清除登录态
            Session.clear()

            var error, message
            if (data.error === constants.ERR_INVALID_SESSION) {
                // 如果是登录态无效，并且还没重试过，会尝试登录后刷新凭据重新请求
              if (!hasRetried) {
                hasRetried = true
                doRequestWithLogin()
                return
              }

              message = '登录态已过期'
              error = new RequestError(data.error, message)
            } else {
              message = '鉴权服务器检查登录态发生错误(' + (data.error || 'OTHER') + ')：' + (data.message || '未知错误')
              error = new RequestError(constants.ERR_CHECK_LOGIN_FAILED, message)
            }

            reject(error)
            return
          }

          resolve(response)
        },

        fail: function (response) {
          reject(new Error(response))
        },
        complete: noop
      }))
    }
  })
}

function downloadFile (options) {
  if (typeof options !== 'object') {
    var message = '请求传参应为 object 类型，但实际传了 ' + (typeof options) + ' 类型'
    throw new RequestError(constants.ERR_INVALID_PARAMS, message)
  }

  var requireLogin = options.login
  var originHeader = options.header || {}

  // 是否已经进行过重试
  var hasRetried = false

  return new Promise((resolve, reject) => {
    if (requireLogin) {
      doRequestWithLogin()
    } else {
      doDownloadFile()
    }

    // 登录后再请求
    function doRequestWithLogin () {
      loginLib.login({ success: doDownloadFile, fail: noop })
    }

    // 实际进行请求的方法
    function doDownloadFile () {
      var authHeader = buildSessionHeader()

      wx.downloadFile(utils.extend({}, options, {
        header: utils.extend({}, originHeader, authHeader),

        success: function (response) {
          if (response.statusCode >= 400) {
            reject(new RestError(response.statusCode, response.data))
            return
          }

          var data = response.data

          // 如果响应的数据里面包含 SDK Magic ID，表示被服务端 SDK 处理过，此时一定包含登录态失败的信息
          if (data && data[constants.WX_SESSION_MAGIC_ID]) {
              // 清除登录态
            Session.clear()

            var error, message
            if (data.error === constants.ERR_INVALID_SESSION) {
                // 如果是登录态无效，并且还没重试过，会尝试登录后刷新凭据重新请求
              if (!hasRetried) {
                hasRetried = true
                doRequestWithLogin()
                return
              }

              message = '登录态已过期'
              error = new RequestError(data.error, message)
            } else {
              message = '鉴权服务器检查登录态发生错误(' + (data.error || 'OTHER') + ')：' + (data.message || '未知错误')
              error = new RequestError(constants.ERR_CHECK_LOGIN_FAILED, message)
            }

            reject(error)
            return
          }

          resolve(response)
        },

        fail: function (response) {
          reject(new Error(response))
        },
        complete: noop
      }))
    }
  })
}

class RestError extends Error {
  constructor (code, data) {
    super(code)
    this.name = 'RestError'
    this.code = code
    this.data = data
  }
}

const promise = module.exports = {
  RestError,
  uploadFile,
  downloadFile
}

const methods = ['login', 'request']

promise.default = promise
Object.keys(qcloud).forEach(key => {
  if (methods.indexOf(key) > -1) {
    promise[key] = (data) => {
      if (data === undefined) data = {}

      return new Promise((resolve, reject) => {
        data.success = (res) => {
          if (res.statusCode >= 400) {
            reject(new RestError(res.statusCode, res.data))
          } else {
            resolve(res)
          }
        }

        data.fail = (res) => {
          if (res && res.errMsg) {
            reject(new Error(res.errMsg))
          } else {
            reject(res)
          }
        }

        qcloud[key](data)
      })
    }
  } else {
    promise[key] = qcloud[key]
  }
})
