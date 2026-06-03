<template>
  <view class="login-page">
    <view class="login-header">
      <view class="logo-area">
        <uni-icons type="shop" size="70" color="#FFFFFF"></uni-icons>
      </view>
      <text class="system-name">进销存管理</text>
      <text class="system-desc">企业进销存管理系统</text>
    </view>

    <view class="login-form">
      <view class="form-item">
        <uni-icons type="person" size="20" color="#909399" class="form-icon"></uni-icons>
        <input
          class="form-input"
          v-model="form.username"
          placeholder="请输入用户名"
          placeholder-style="color:#C0C4CC"
        />
      </view>
      <view class="form-item">
        <uni-icons type="locked" size="20" color="#909399" class="form-icon"></uni-icons>
        <input
          class="form-input"
          v-model="form.password"
          type="password"
          placeholder="请输入密码"
          placeholder-style="color:#C0C4CC"
        />
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
import { ref, reactive } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const loading = ref(false)

const form = reactive({
  username: 'admin',
  password: ''
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

  loading.value = true
  try {
    const success = await userStore.login(form.username.trim(), form.password)
    if (success) {
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/index/index' })
      }, 300)
    } else {
      uni.showToast({ title: '用户名或密码错误', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '登录失败，请检查网络', icon: 'none' })
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
    height: 90rpx;
    border-bottom: 2rpx solid #F2F6FC;
    margin-bottom: 30rpx;

    .form-icon {
      margin-right: 16rpx;
      flex-shrink: 0;
    }

    .form-input {
      flex: 1;
      height: 100%;
      font-size: 30rpx;
      color: #303133;
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
    margin-top: 50rpx;
    border: none;
    box-shadow: 0 6rpx 20rpx rgba(64, 158, 255, 0.3);

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
