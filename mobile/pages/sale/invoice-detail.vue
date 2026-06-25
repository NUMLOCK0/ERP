<template>
  <view class="invoice-detail">
    <view v-if="ret.id" class="detail-content">
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">发票登记信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">登记单号</text>
            <text class="info-value">{{ ret.invoice_no }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">发票号码</text>
            <text class="info-value font-bold">{{ ret.external_invoice_no || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">关联销售单</text>
            <text class="info-value text-link" @click="goOrderDetail">{{ ret.order_no || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">销售单金额</text>
            <text class="info-value">¥{{ formatPrice(ret.order_total_amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">客户</text>
            <text class="info-value">{{ ret.customer_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">价税合计</text>
            <text class="info-value text-danger font-bold">¥{{ formatPrice(ret.total_amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">不含税金额</text>
            <text class="info-value font-bold">¥{{ formatPrice(ret.amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">税率</text>
            <text class="info-value">{{ formatPrice(ret.tax_rate) }}%</text>
          </view>
          <view class="info-item">
            <text class="info-label">税金</text>
            <text class="info-value font-bold">¥{{ formatPrice(ret.tax_amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">开票日期</text>
            <text class="info-value date-text">{{ formatDate(ret.invoice_date).split(' ')[0] }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value date-text">{{ formatDate(ret.created_at || ret.createdAt) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">登记人</text>
            <text class="info-value">{{ ret.creator_name || '-' }}</text>
          </view>
          <view class="info-item" v-if="ret.remark" style="width: 100%;">
            <text class="info-label">备注说明</text>
            <text class="info-value">{{ ret.remark }}</text>
          </view>
        </view>
      </view>

      <!-- 附件信息 -->
      <view class="card" v-if="attachments.length > 0">
        <view class="card-title">发票附件</view>
        <view class="attachment-list">
          <view class="attachment-item" v-for="(url, idx) in attachments" :key="idx" @click="previewImage(url)">
            <image v-if="isImageUrl(url)" :src="url" mode="aspectFill" class="attachment-img" />
            <view v-else class="attachment-file-box">
              <uni-icons type="paperclip" size="24" color="#909399"></uni-icons>
              <text class="attachment-file-text">文件附件</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">发票记录不存在</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="ret.id" class="bottom-bar safe-bottom">
      <button class="btn-back" @click="goBack">返回</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { saleApi } from '@/api/sale'

const ret = ref({})
const loading = ref(true)

const attachments = computed(() => {
  const urls = ret.value.attachment_urls
  if (Array.isArray(urls)) return urls.filter(Boolean)
  if (typeof urls === 'string') {
    try {
      const parsed = JSON.parse(urls)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch (e) {
      return urls ? [urls] : []
    }
  }
  return []
})

const isImageUrl = (url) => {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
}

const previewImage = (url) => {
  if (isImageUrl(url)) {
    uni.previewImage({
      urls: attachments.value.filter(isImageUrl),
      current: url
    })
  } else {
    uni.setClipboardData({
      data: url,
      success: () => {
        uni.showToast({ title: '链接已复制，可在浏览器中打开', icon: 'none' })
      }
    })
  }
}

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
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
    const res = await saleApi.getInvoiceDetail(id)
    if (res.code === 0) {
      ret.value = res.data || {}
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

const goOrderDetail = () => {
  if (ret.value.order_id) {
    uni.navigateTo({ url: `/pages/sale/order-detail?id=${ret.value.order_id}` })
  }
}

onShow(() => {
  uni.hideTabBar()
  loadDetail()
})
</script>

<style lang="scss" scoped>
.invoice-detail {
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
    padding: 10rpx 0;
    box-sizing: border-box;
    .info-label { font-size: 22rpx; color: #909399; display: block; margin-bottom: 4rpx; }
    .info-value { font-size: 26rpx; color: #303133; display: block; font-weight: 500; word-break: break-all; }
    .date-text { color: #909399; font-size: 24rpx; }
    .font-bold { font-weight: 700; }
    .text-danger { color: #F56C6C; }
    .text-link { color: #1890FF; font-weight: 600; text-decoration: underline; }
  }
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.attachment-item {
  width: 150rpx;
  height: 150rpx;
  border-radius: 12rpx;
  overflow: hidden;
  border: 1rpx solid #EBEEF5;
  background: #F8FAFC;
  
  .attachment-img {
    width: 100%;
    height: 100%;
  }

  .attachment-file-box {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    
    .attachment-file-text {
      font-size: 18rpx;
      color: #909399;
      margin-top: 6rpx;
    }
  }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 99;

  button {
    height: 76rpx;
    line-height: 76rpx;
    padding: 0 32rpx;
    font-size: 26rpx;
    border-radius: 16rpx;
    font-weight: 600;
    margin: 0;
    
    &::after { border: none; }
    
    &.btn-back {
      background: #F4F4F5;
      color: #909399;
      width: 100%;
    }
  }
}

.empty-state, .loading-state {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
  .empty-text { font-size: 26rpx; color: #C0C4CC; }
}
</style>
