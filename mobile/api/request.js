/**
 * API 请求封装
 * 基于 uni.request + 拦截器 + Token 管理
 */
import { useUserStore } from '@/store/user'

let BASE_URL = '';
// #ifdef H5
// H5 环境直接使用相对路径，让 Nginx 代理
//BASE_URL = '/api';
BASE_URL = 'http://localhost:3000/api';
// #endif
// #ifndef H5
// 非 H5 环境（App、小程序）必须使用绝对路径
BASE_URL = 'http://erp.msfdcloud.com/api'; 
// #endif
const REQUEST_TIMEOUT = 30000

// 请求拦截
const requestInterceptor = (options) => {
  const userStore = useUserStore()
  if (userStore.token) {
    options.header = {
      ...options.header,
      'Authorization': `Bearer ${userStore.token}`
    }
  }
  options.header = {
    ...options.header,
    'Content-Type': 'application/json'
  }
  return options
}

// 响应拦截
const responseInterceptor = (response, resolve, reject) => {
  const { statusCode, data } = response

  if (statusCode === 401) {
    const userStore = useUserStore()
    userStore.logout()
    uni.reLaunch({ url: '/pages/login/index' })
    reject(new Error('登录已过期，请重新登录'))
    return
  }

  if (statusCode >= 200 && statusCode < 300) {
    if (data && data.code === 0) {
      resolve(data)
    } else {
      uni.showToast({
        title: data?.message || '请求失败',
        icon: 'none',
        duration: 2000
      })
      reject(new Error(data?.message || '请求失败'))
    }
  } else {
    uni.showToast({
      title: `请求错误 ${statusCode}`,
      icon: 'none',
      duration: 2000
    })
    reject(new Error(`HTTP Error: ${statusCode}`))
  }
}

// 核心请求函数
const request = (options) => {
  return new Promise((resolve, reject) => {
    const config = requestInterceptor({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: options.header || {},
      timeout: options.timeout || REQUEST_TIMEOUT
    })

    uni.request({
      ...config,
      success: (res) => responseInterceptor(res, resolve, reject),
      fail: (err) => {
        uni.showToast({
          title: '网络请求失败，请检查网络',
          icon: 'none',
          duration: 2000
        })
        reject(err)
      }
    })
  })
}

// HTTP 方法快捷调用
const http = {
  get: (url, params = {}) => {
    const queryString = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
    return request({
      url: queryString ? `${url}?${queryString}` : url,
      method: 'GET'
    })
  },

  post: (url, data = {}) => {
    return request({ url, method: 'POST', data })
  },

  put: (url, data = {}) => {
    return request({ url, method: 'PUT', data })
  },

  delete: (url, params = {}) => {
    const queryString = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
    return request({
      url: queryString ? `${url}?${queryString}` : url,
      method: 'DELETE'
    })
  },

  upload: (url, filePath, name = 'file', formData = {}) => {
    const userStore = useUserStore()
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: BASE_URL + url,
        filePath,
        name,
        formData,
        header: {
          'Authorization': `Bearer ${userStore.token}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            if (data.code === 0) {
              resolve(data)
            } else {
              uni.showToast({ title: data.message || '上传失败', icon: 'none' })
              reject(new Error(data.message))
            }
          } catch (e) {
            reject(new Error('解析响应失败'))
          }
        },
        fail: (err) => {
          uni.showToast({ title: '上传失败', icon: 'none' })
          reject(err)
        }
      })
    })
  }
}

export default http
