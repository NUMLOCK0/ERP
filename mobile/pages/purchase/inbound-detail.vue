<template>
  <view class="inbound-detail">
    <view v-if="inbound.id" class="detail-content">
      <!-- 入库基本信息 -->
      <view class="card">
        <view class="card-title">基本信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">入库单ID</text>
            <text class="info-value">{{ inbound.id }}</text>
          </view>
          
          <view class="info-item order-no-item">
            <text class="info-label">入库单号</text>
            <view class="info-value-copy">
              <text class="info-value">{{ inbound.inbound_no }}</text>
              <u-icon name="file-text" size="14" color="#1890FF" class="copy-icon" @click="copyInboundNo"  />
            </view>
          </view>
          
          <view class="info-item order-no-item">
            <text class="info-label">采购单号</text>
            <view class="info-value-copy">
              <text class="info-value">{{ inbound.order_no || '-' }}</text>
              <u-icon v-if="inbound.order_no" name="file-text" size="14" color="#1890FF" class="copy-icon" @click="copyOrderNo"  />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">入库状态</text>
            <view class="info-value">
              <uni-tag :text="statusMap[inbound.status] || '未知'" size="small" :type="getStatusType(inbound.status)" />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">收货仓库</text>
            <text class="info-value">{{ inbound.warehouse_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">供应商</text>
            <text class="info-value">{{ inbound.supplier_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">单价</text>
            <text class="info-value">¥{{ formatPrice(inbound.unit_price) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">税金</text>
            <text class="info-value">¥{{ formatPrice(inbound.tax_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">总价</text>
            <text class="info-value text-danger font-bold">¥{{ formatPrice(inbound.total_price || inbound.total_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">入库总数量</text>
            <text class="info-value">{{ inbound.inbound_total_quantity || inbound.total_quantity || 0 }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">联系人</text>
            <text class="info-value">{{ inbound.contact || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">联系手机</text>
            <text class="info-value">{{ inbound.mobile_phone || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">联系座机</text>
            <text class="info-value">{{ inbound.telephone || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">联系邮箱</text>
            <text class="info-value">{{ inbound.email || '-' }}</text>
          </view>

          <view class="info-item">
            <text class="info-label">制单人</text>
            <text class="info-value">{{ inbound.creator_name || '-' }}</text>
          </view>

          <view class="info-item" style="width: 100%;">
            <text class="info-label">备注信息</text>
            <text class="info-value remarks-value">{{ inbound.remark || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">完成时间</text>
            <text class="info-value date-text">{{ formatDate(inbound.completed_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">取消时间</text>
            <text class="info-value date-text">{{ formatDate(inbound.cancel_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value date-text">{{ formatDate(inbound.created_at || inbound.createdAt) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">更新时间</text>
            <text class="info-value date-text">{{ formatDate(inbound.updated_at || inbound.updatedAt) }}</text>
          </view>
        </view>
        <view v-if="normalizeImageUrls(inbound.image_urls).length" class="detail-image-grid">
          <image
            v-for="(url, idx) in normalizeImageUrls(inbound.image_urls)"
            :key="idx"
            :src="url"
            mode="aspectFill"
            class="detail-image"
            @click="previewImages(idx)"
          />
        </view>
      </view>

      <!-- 入库明细 -->
      <view class="card">
        <view class="card-title">入库明细 ({{ inbound.items?.length || 0 }} 项)</view>
        <view class="product-item-list">
          <view class="product-item-card" v-for="(item, index) in inbound.items" :key="index">
            <!-- 头部：商品名称与规格 -->
            <view class="prod-header">
              <text class="prod-title">#{{ index + 1 }} {{ item.product_name || '-' }}</text>
              <text class="prod-spec" v-if="item.spec">{{ item.spec }}</text>
            </view>
            
            <!-- 编码 -->
            <view class="prod-code-row" v-if="item.code">
              <text class="prod-code-label">编码：</text>
              <text class="prod-code-val">{{ item.code }}</text>
            </view>
            
            <!-- 紧凑网格详情 -->
            <view class="prod-details-grid">
              <!-- 第一行：单位、入库单价 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">单位：</text><text class="cell-val">{{ item.unit_name || '-' }}</text></view>
                <view class="grid-cell"><text class="cell-lbl">入库单价：</text><text class="cell-val">¥{{ formatPrice(item.price) }}</text></view>
              </view>
              <!-- 第二行：采购数量、本次入库 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">采购数量：</text><text class="cell-val">{{ item.purchase_quantity || '-' }}</text></view>
                <view class="grid-cell"><text class="cell-lbl">本次入库：</text><text class="cell-val success">{{ item.quantity }}</text></view>
              </view>
              <!-- 第三行：入库金额、估算税金 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">入库金额：</text><text class="cell-val danger-text">¥{{ formatPrice(item.amount) }}</text></view>
                <view class="grid-cell"><text class="cell-lbl">入库税金：</text><text class="cell-val">¥{{ formatPrice(item.tax_total) }}</text></view>
              </view>
              <!-- 第四行：入库货位、备注 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">入库货位：</text><text class="cell-val primary">{{ item.location || '-' }}</text></view>
                <view class="grid-cell" v-if="item.remark"><text class="cell-lbl">备注：</text><text class="cell-val remark-text">{{ item.remark }}</text></view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">入库单不存在</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="inbound.id" class="bottom-bar safe-bottom">
      <button v-if="Number(inbound.status) === 0" class="btn-primary" @click="handleConfirmInbound">确认入库</button>
      <button class="btn-back" @click="goBack">返回</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { purchaseApi } from '@/api/purchase'
import http from '@/api/request'

const inbound = ref({})
const loading = ref(true)

const statusMap = {
  0: '待入库',
  1: '已入库'
}

const getStatusType = (status) => {
  const map = {
    0: 'warning',
    1: 'success'
  }
  return map[status] || 'info'
}

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const formatDate = (val) => {
  if (!val) return '-'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

const copyInboundNo = () => {
  if (!inbound.value.inbound_no) return
  uni.setClipboardData({
    data: inbound.value.inbound_no,
    success: () => {
      uni.showToast({ title: '复制入库单号成功', icon: 'none' })
    }
  })
}

const copyOrderNo = () => {
  if (!inbound.value.order_no) return
  uni.setClipboardData({
    data: inbound.value.order_no,
    success: () => {
      uni.showToast({ title: '复制采购单号成功', icon: 'none' })
    }
  })
}

const loadDetail = async () => {
  const pages = getCurrentPages()
  const id = pages[pages.length - 1].$page?.options?.id
  if (!id) { loading.value = false; return }

  loading.value = true
  try {
    const res = await purchaseApi.getInboundDetail(id)
    if (res.code === 0) {
      inbound.value = res.data || {}
    }
  } catch (e) {
    // Interceptor auto toasts
  } finally {
    loading.value = false
  }
}

const handleConfirmInbound = () => {
  uni.showModal({
    title: '确认入库',
    content: '点击确认后，系统将自动增加对应仓库中的商品库存，且此入库单将不可修改。确定要确认入库吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '正在入库...' })
        try {
          const imageUrls = await chooseUploadImages()
          const confirmRes = await purchaseApi.confirmInbound(inbound.value.id, { image_urls: imageUrls })
          if (confirmRes.code === 0) {
            uni.showToast({ title: '入库成功', icon: 'success' })
            loadDetail()
          }
        } catch (e) { /* handled */ }
        finally {
          uni.hideLoading()
        }
      }
    }
  })
}

const normalizeImageUrls = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [value]
    } catch (error) {
      return [value]
    }
  }
  return []
}

const previewImages = (idx) => {
  const urls = normalizeImageUrls(inbound.value.image_urls)
  if (!urls.length) return
  uni.previewImage({ urls, current: urls[idx] })
}

const chooseUploadImages = () => {
  return new Promise((resolve) => {
    uni.showModal({
      title: '上传入库图片',
      content: '是否上传入库确认图片？',
      confirmText: '上传',
      cancelText: '跳过',
      success: (modalRes) => {
        if (!modalRes.confirm) {
          resolve([])
          return
        }
        uni.chooseImage({
          count: 10,
          success: async (chooseRes) => {
            const urls = []
            uni.showLoading({ title: '上传中...' })
            try {
              for (const filePath of chooseRes.tempFilePaths || []) {
                const uploadRes = await http.upload('/upload/file', filePath)
                if (uploadRes.code === 0 && uploadRes.data?.url) urls.push(uploadRes.data.url)
              }
              resolve(urls)
            } catch (error) {
              uni.showToast({ title: error.message || '上传失败', icon: 'none' })
              resolve([])
            } finally {
              uni.hideLoading()
            }
          },
          fail: () => resolve([])
        })
      },
      fail: () => resolve([])
    })
  })
}

const goBack = () => {
  uni.navigateBack()
}

onShow(() => {
  uni.hideTabBar()
  loadDetail()
})
</script>

<style lang="scss" scoped>
.inbound-detail {
  min-height: 100vh;
  background: #F5F7FA;
  box-sizing: border-box;
  padding-bottom: calc(140rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
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

.detail-image-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
  margin-top: 22rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F2F6FC;
}

.detail-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10rpx;
  background: #F5F7FA;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  .info-item {
    width: 50%;
    padding: 12rpx 8rpx;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    
    .info-label { font-size: 22rpx; color: #909399; display: block; margin-bottom: 6rpx; }
    .info-value { font-size: 26rpx; color: #303133; display: block; font-weight: 600; word-break: break-all; }
    .date-text { color: #909399; font-size: 24rpx; }
    
    &.order-no-item {
      .info-value-copy {
        display: flex;
        align-items: center;
        gap: 8rpx;
      }
      .copy-icon {
        flex-shrink: 0;
        cursor: pointer;
        
        &:active {
          opacity: 0.6;
        }
      }
    }
  }
}

.remarks-value {
  white-space: pre-wrap;
  line-height: 1.45;
}

.product-item-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.product-item-card {
  background: #F8FAFC;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  border: 1rpx solid #EEF2F6;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.prod-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  border-bottom: 1rpx solid #EEF2F6;
  padding-bottom: 8rpx;
}

.prod-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #303133;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.prod-spec {
  font-size: 20rpx;
  background: #E8F4FF;
  color: #1890FF;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  max-width: 180rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.prod-code-row {
  display: flex;
  align-items: center;
  font-size: 20rpx;
  color: #909399;
}

.prod-code-val {
  font-family: monospace;
}

.prod-details-grid {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.grid-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.grid-cell {
  flex: 1;
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: #606266;
  min-width: 0;
}

.cell-lbl {
  color: #909399;
  flex-shrink: 0;
}

.cell-val {
  font-weight: 600;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  
  &.primary {
    color: #1890FF;
  }
  
  &.success {
    color: #67C23A;
  }
  
  &.warning {
    color: #E6A23C;
  }
  
  &.danger-text {
    color: #F56C6C;
  }
}

.remark-text {
  font-size: 20rpx;
  color: #909399;
  font-weight: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
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

    &.primary {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
    }
    
    &.btn-primary {
      background: #67C23A;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(103, 194, 58, 0.2);
    }
    
    &.btn-back {
      background: #F4F4F5;
      color: #909399;
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
