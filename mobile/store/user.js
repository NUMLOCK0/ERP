import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(uni.getStorageSync('token') || '')
  const userInfo = ref(JSON.parse(uni.getStorageSync('userInfo') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const userName = computed(() => userInfo.value?.real_name || userInfo.value?.username || '管理员')

  const login = async (data) => {
    try {
      const res = await authApi.login(data)
      if (res.code === 0) {
        token.value = res.data.token
        userInfo.value = res.data.user || { username: data.username }
        uni.setStorageSync('token', token.value)
        uni.setStorageSync('userInfo', JSON.stringify(userInfo.value))
        return { success: true }
      }
      return { success: false, message: res.message || '登录失败' }
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, message: error.message || '网络异常，请重试' }
    }
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
    uni.reLaunch({ url: '/pages/login/index' })
  }

  const checkLogin = () => {
    if (!token.value) {
      const currentPages = getCurrentPages()
      const currentPage = currentPages.length > 0 ? currentPages[currentPages.length - 1].route : ''
      if (currentPage !== 'pages/login/index') {
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }
  }

  const fetchUserInfo = async () => {
    try {
      const res = await authApi.getUserInfo()
      if (res.code === 0) {
        userInfo.value = res.data
        uni.setStorageSync('userInfo', JSON.stringify(userInfo.value))
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    userName,
    login,
    logout,
    checkLogin,
    fetchUserInfo
  }
})
