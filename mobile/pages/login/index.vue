<template>
  <view class="login-page">
    <view class="login-header">
      <view class="logo-area">
        <text class="logo-icon">&#9749;</text>
      </view>
      <text class="system-name">进销存管理</text>
      <text class="system-desc">企业进销存管理系统</text>
    </view>

    <view class="login-form">
      <view class="form-item">
        <text class="form-icon">&#128100;</text>
        <input
          class="form-input"
          v-model="form.username"
          placeholder="请输入用户名"
          placeholder-style="color:#C0C4CC;font-size:30rpx"
        />
      </view>
      <view class="form-item">
        <text class="form-icon">&#128274;</text>
        <input
          class="form-input"
          v-model="form.password"
          password
          placeholder="请输入密码"
          placeholder-style="color:#C0C4CC;font-size:30rpx"
        />
      </view>
      <view class="form-item captcha-row">
        <text class="form-icon">&#128247;</text>
        <input
          class="form-input captcha-input"
          v-model="form.captcha_code"
          placeholder="请输入验证码"
          placeholder-style="color:#C0C4CC;font-size:30rpx"
          maxlength="4"
        />
        <image
          class="captcha-img"
          :src="captchaImage"
          mode="aspectFit"
          @click="fetchCaptcha"
        />
      </view>

      <view class="remember-row" @click="rememberPwd = !rememberPwd">
        <view class="remember-checkbox" :class="{ checked: rememberPwd }">
          <text v-if="rememberPwd" class="check-mark">&#10003;</text>
        </view>
        <text class="remember-text">记住密码</text>
      </view>

      <button class="login-btn" :loading="loading" @click="handleLogin">
        {{ loading ? '登录中...' : '登 录' }}
      </button>
    </view>

    <view class="login-footer">
      <text class="footer-text">进销存管理系统 v1.0.0</text>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { authApi } from '@/api/auth'

const userStore = useUserStore()
const loading = ref(false)
const rememberPwd = ref(false)
const captchaImage = ref('')
const captchaId = ref('')

const form = reactive({
  username: '',
  password: '',
  captcha_code: ''
})

const fetchCaptcha = async () => {
  try {
    const res = await authApi.getCaptcha()
    if (res.code === 0) {
      captchaImage.value = res.data.image
      captchaId.value = res.data.captcha_id
    }
  } catch (e) {
    // request.js 已处理错误提示
  }
}

onMounted(() => {
  fetchCaptcha()
  const saved = uni.getStorageSync('rememberedCredentials')
  if (saved) {
    form.username = saved.username || ''
    form.password = saved.password || ''
    rememberPwd.value = true
  }
})

const handleLogin = async () => {
  if (!form.username.trim()) {
    uni.showToast({ title: '请输入用户名', icon: 'none' })
    return
  }
  if (!form.password.trim()) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }
  if (!form.captcha_code.trim()) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const result = await userStore.login({
      username: form.username.trim(),
      password: form.password,
      captcha_id: captchaId.value,
      captcha_code: form.captcha_code.trim().toUpperCase()
    })

    if (result.success) {
      if (rememberPwd.value) {
        uni.setStorageSync('rememberedCredentials', {
          username: form.username.trim(),
          password: form.password
        })
      } else {
        uni.removeStorageSync('rememberedCredentials')
      }

      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/index/index' })
      }, 300)
    } else {
      form.captcha_code = ''
      fetchCaptcha()
    }
  } catch (e) {
    form.captcha_code = ''
    fetchCaptcha()
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, #409EFF 0%, #66B1FF 60%, #F5F7FA 60%);
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
  padding-bottom: 60rpx;

  .logo-area {
    width: 140rpx;
    height: 140rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 30rpx;
  }

  .logo-icon {
    font-size: 70rpx;
    color: #FFFFFF;
  }

  .system-name {
    font-size: 44rpx;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: 4rpx;
  }

  .system-desc {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.75);
    margin-top: 12rpx;
  }
}

.login-form {
  width: 650rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 60rpx 40rpx 40rpx;
  box-shadow: 0 8rpx 40rpx rgba(64, 158, 255, 0.15);

  .form-item {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: 90rpx;
    border-bottom: 2rpx solid #F2F6FC;
    margin-bottom: 30rpx;

    .form-icon {
      width: 44rpx;
      font-size: 36rpx;
      text-align: center;
      margin-right: 16rpx;
      flex-shrink: 0;
      line-height: 90rpx;
    }

    .form-input {
      flex: 1;
      box-sizing: border-box;
      height: 90rpx;
      line-height: 90rpx;
      font-size: 30rpx;
      color: #303133;
      background: transparent;
      border: none;
      padding: 0;
    }
  }

  .captcha-row {
    .captcha-input {
      flex: 1;
    }

    .captcha-img {
      width: 180rpx;
      height: 64rpx;
      border-radius: 8rpx;
      border: 2rpx solid #E4E7ED;
      flex-shrink: 0;
    }
  }

  .remember-row {
    display: flex;
    align-items: center;
    margin-bottom: 30rpx;
    padding: 0 8rpx;

    .remember-checkbox {
      width: 36rpx;
      height: 36rpx;
      border: 2rpx solid #C0C4CC;
      border-radius: 6rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12rpx;
      transition: all 0.2s;
      box-sizing: border-box;

      &.checked {
        background: #409EFF;
        border-color: #409EFF;
      }

      .check-mark {
        color: #FFFFFF;
        font-size: 24rpx;
        font-weight: 700;
        line-height: 1;
      }
    }

    .remember-text {
      font-size: 26rpx;
      color: #606266;
    }
  }

  .login-btn {
    width: 100%;
    height: 90rpx;
    background: linear-gradient(135deg, #409EFF, #66B1FF);
    color: #FFFFFF;
    font-size: 32rpx;
    font-weight: 600;
    border-radius: 45rpx;
    margin-top: 20rpx;
    border: none;
    box-shadow: 0 6rpx 20rpx rgba(64, 158, 255, 0.3);
    box-sizing: border-box;

    &::after {
      border: none;
    }
  }
}

.login-footer {
  position: fixed;
  bottom: 80rpx;

  .footer-text {
    font-size: 22rpx;
    color: #C0C4CC;
  }
}
</style>
