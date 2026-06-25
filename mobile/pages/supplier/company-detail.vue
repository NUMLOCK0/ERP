<template>
  <view class="company-detail">
    <view v-if="company.id" class="detail-content">
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">基本信息</view>
        <view class="info-grid">
          <view class="info-item" style="width: 100%;">
            <text class="info-label">企业名称</text>
            <text class="info-value font-bold">{{ company.name }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">企业类型</text>
            <view class="info-value">
              <uni-tag :text="typeMap[company.type] || company.type" size="small" :type="getTypeTagColor(company.type)" />
            </view>
          </view>
          <view class="info-item">
            <text class="info-label">使用状态</text>
            <view class="info-value">
              <uni-tag :text="company.status === 1 ? '启用' : '禁用'" size="small" :type="company.status === 1 ? 'success' : 'info'" />
            </view>
          </view>
          <view class="info-item">
            <text class="info-label">联系人</text>
            <text class="info-value">{{ company.contact || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ company.phone || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;">
            <text class="info-label">电子邮箱</text>
            <text class="info-value">{{ company.email || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;">
            <text class="info-label">详细地址</text>
            <text class="info-value">{{ company.address || '-' }}</text>
          </view>
        </view>
      </view>

      <!-- 财务信息 -->
      <view class="card">
        <view class="card-title">财务与税务信息</view>
        <view class="info-grid">
          <view class="info-item" style="width: 100%;">
            <text class="info-label">开户银行</text>
            <text class="info-value">{{ company.bank_name || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;">
            <text class="info-label">银行账号</text>
            <text class="info-value">{{ company.bank_account || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;">
            <text class="info-label">税务登记号 (税号)</text>
            <text class="info-value">{{ company.tax_no || '-' }}</text>
          </view>
        </view>
      </view>

      <!-- 系统信息 -->
      <view class="card">
        <view class="card-title">系统信息</view>
        <view class="info-grid">
          <view class="info-item" style="width: 100%;">
            <text class="info-label">登记时间</text>
            <text class="info-value date-text">{{ formatDate(company.created_at || company.createdAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">该企业不存在或已被删除</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="company.id" class="bottom-bar safe-bottom">
      <view class="action-btn-group">
        <button class="btn-action outline" @click="goBack">返回</button>
        <button class="btn-action danger" @click="handleDelete">删除</button>
        <button class="btn-action primary" @click="goEdit">编辑</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { supplierApi } from '@/api/supplier'

const company = ref({})
const loading = ref(true)

const typeMap = {
  supplier: '供应商',
  customer: '客户',
  both: '双重'
}

const getTypeTagColor = (type) => {
  const map = {
    supplier: 'success',
    customer: 'warning',
    both: 'primary'
  }
  return map[type] || 'info'
}

const formatDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

const loadDetail = async () => {
  const pages = getCurrentPages()
  const id = pages[pages.length - 1].$page?.options?.id
  if (!id) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const res = await supplierApi.getSupplierDetail(id)
    if (res.code === 0) {
      company.value = res.data || {}
    }
  } catch (e) {
    // handled
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  uni.navigateBack()
}

const goEdit = () => {
  uni.navigateTo({ url: `/pages/supplier/company-edit?id=${company.value.id}` })
}

const handleDelete = () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该企业吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '正在删除...' })
        try {
          const ret = await supplierApi.deleteSupplier(company.value.id)
          if (ret.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' })
            setTimeout(() => {
              uni.navigateBack()
            }, 1000)
          }
        } catch (e) {
          // handled
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

onShow(() => {
  uni.hideTabBar()
  loadDetail()
})
</script>

<style lang="scss" scoped>
.company-detail {
  min-height: 100vh;
  background: #F5F7FA;
  box-sizing: border-box;
  padding-bottom: calc(120rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.detail-content {
  padding: 20rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);

  .card-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #303133;
    margin-bottom: 20rpx;
    padding-bottom: 16rpx;
    border-bottom: 1rpx solid #F2F6FC;
  }
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  .info-item {
    width: 50%;
    padding: 12rpx 0;
    box-sizing: border-box;
    .info-label { font-size: 22rpx; color: #909399; display: block; margin-bottom: 4rpx; }
    .info-value { font-size: 26rpx; color: #303133; display: block; font-weight: 500; word-break: break-all; }
    .date-text { color: #909399; font-size: 24rpx; }
    .font-bold { font-weight: 700; }
  }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10rpx);
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 99;

  .action-btn-group {
    display: flex;
    justify-content: flex-end;
    gap: 16rpx;
    width: 100%;
  }

  .btn-action {
    height: 76rpx;
    line-height: 76rpx;
    padding: 0 40rpx;
    font-size: 26rpx;
    font-weight: 600;
    border-radius: 38rpx;
    margin: 0;

    &::after {
      border: none;
    }

    &.outline {
      background: #F4F4F5;
      color: #909399;
    }

    &.danger {
      background: #FF4D4F;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(255, 77, 79, 0.2);
    }

    &.primary {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
    }

    &:active {
      opacity: 0.85;
    }
  }
}

.empty-state, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;

  .empty-text {
    font-size: 28rpx;
    color: #C0C4CC;
  }
}
</style>
