<template>
  <view class="member-detail">
    <view v-if="level.id" class="detail-content">
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">会员等级信息</view>
        <view class="info-grid">
          <view class="info-item" style="width: 100%;">
            <text class="info-label">等级名称</text>
            <text class="info-value font-bold">{{ level.name }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">排序顺序</text>
            <view class="info-value">
              <uni-tag :text="String(level.sort_order ?? 0)" type="primary" size="small" />
            </view>
          </view>
          <view class="info-item">
            <text class="info-label">启用状态</text>
            <view class="info-value">
              <uni-tag :text="level.status === 1 ? '启用' : '禁用'" size="small" :type="level.status === 1 ? 'success' : 'info'" />
            </view>
          </view>
          <view class="info-item" style="width: 100%;" v-if="level.description">
            <text class="info-label">描述说明</text>
            <text class="info-value">{{ level.description }}</text>
          </view>
        </view>
      </view>

      <!-- 等级图标 -->
      <view class="card">
        <view class="card-title">等级专属图标</view>
        <view class="icon-preview-box">
          <image v-if="level.icon_url" :src="getAssetUrl(level.icon_url)" mode="aspectFit" class="level-icon" @click="previewIcon" />
          <view v-else class="icon-empty-placeholder">
            <u-icon name="integral" size="48" color="#C0C4CC"></u-icon>
            <text class="placeholder-text">暂无专属图标</text>
          </view>
        </view>
      </view>

      <!-- 系统记录 -->
      <view class="card">
        <view class="card-title">系统日志</view>
        <view class="info-grid">
          <view class="info-item" style="width: 100%;">
            <text class="info-label">创建时间</text>
            <text class="info-value date-text">{{ formatDate(level.created_at || level.createdAt) }}</text>
          </view>
          <view class="info-item" style="width: 100%;">
            <text class="info-label">最后更新</text>
            <text class="info-value date-text">{{ formatDate(level.updated_at || level.updatedAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">该会员等级不存在</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="level.id" class="bottom-bar safe-bottom">
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

const level = ref({})
const loading = ref(true)

const getAssetUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `http://localhost:3000${url}`
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
    const res = await supplierApi.getMemberLevelDetail(id)
    if (res.code === 0) {
      level.value = res.data || {}
    }
  } catch (e) {
    // handled
  } finally {
    loading.value = false
  }
}

const previewIcon = () => {
  if (level.value.icon_url) {
    uni.previewImage({
      urls: [getAssetUrl(level.value.icon_url)],
      current: getAssetUrl(level.value.icon_url)
    })
  }
}

const goBack = () => {
  uni.navigateBack()
}

const goEdit = () => {
  uni.navigateTo({ url: `/pages/supplier/member-edit?id=${level.value.id}` })
}

const handleDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除会员等级「${level.value.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '正在删除...' })
        try {
          const ret = await supplierApi.deleteMemberLevel(level.value.id)
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
.member-detail {
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

.icon-preview-box {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx 0;
  
  .level-icon {
    width: 160rpx;
    height: 160rpx;
    border-radius: 20rpx;
    background: #F5F7FA;
    border: 1rpx solid #EBEEF5;
  }
  
  .icon-empty-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
    
    .placeholder-text {
      font-size: 24rpx;
      color: #909399;
    }
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
