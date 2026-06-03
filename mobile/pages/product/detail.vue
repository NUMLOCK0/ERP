<template>
  <view class="product-detail">
    <view v-if="product.id" class="detail-content">
      <!-- 基本信息 -->
      <view class="card info-card">
        <view class="card-title">基本信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">产品名称</text>
            <text class="info-value">{{ product.name }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">产品编码</text>
            <text class="info-value">{{ product.code || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">条码</text>
            <text class="info-value">{{ product.barcode || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">规格</text>
            <text class="info-value">{{ product.spec || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">单位</text>
            <text class="info-value">{{ product.unit_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">分类</text>
            <text class="info-value">{{ product.category_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">品牌</text>
            <text class="info-value">{{ product.brand_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">状态</text>
            <text class="info-value">
              <uni-tag :text="product.status === 1 ? '启用' : '停用'" size="small" :type="product.status === 1 ? 'success' : 'error'" />
            </text>
          </view>
        </view>
      </view>

      <!-- 价格信息 -->
      <view class="card price-card">
        <view class="card-title">价格与库存</view>
        <view class="price-row">
          <view class="price-item">
            <text class="price-label">成本价</text>
            <text class="price-value text-muted">¥{{ formatPrice(product.cost_price) }}</text>
          </view>
          <view class="price-item">
            <text class="price-label">销售价</text>
            <text class="price-value text-primary">¥{{ formatPrice(product.sale_price) }}</text>
          </view>
          <view class="price-item">
            <text class="price-label">当前库存</text>
            <text class="price-value" :class="getStockClass(product.stock_quantity || 0)">
              {{ product.stock_quantity || 0 }}
            </text>
          </view>
        </view>
      </view>

      <!-- 描述 -->
      <view class="card" v-if="product.description">
        <view class="card-title">产品描述</view>
        <text class="desc-text">{{ product.description }}</text>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <uni-icons type="box" size="60" color="#DCDFE6"></uni-icons>
      <text class="empty-text">产品不存在</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { productApi } from '@/api/product'

const product = ref({})
const loading = ref(true)

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const getStockClass = (qty) => {
  if (qty <= 0) return 'text-danger'
  if (qty < 10) return 'text-warning'
  return 'text-success'
}

const loadDetail = async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const id = currentPage.$page?.options?.id

  if (!id) {
    loading.value = false
    return
  }

  try {
    const res = await productApi.getDetail(id)
    if (res.code === 0) {
      product.value = res.data || {}
    }
  } catch (e) {
    uni.showToast({ title: '加载详情失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<style lang="scss" scoped>
.product-detail {
  min-height: 100vh;
  background: #F5F7FA;
  padding: 20rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);

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

    .info-label {
      font-size: 22rpx;
      color: #909399;
      display: block;
      margin-bottom: 6rpx;
    }
    .info-value {
      font-size: 26rpx;
      color: #303133;
      display: block;
    }
  }
}

.price-row {
  display: flex;

  .price-item {
    flex: 1;
    text-align: center;

    .price-label {
      font-size: 22rpx;
      color: #909399;
      display: block;
      margin-bottom: 8rpx;
    }
    .price-value {
      font-size: 32rpx;
      font-weight: 700;
      display: block;
    }
  }
}

.desc-text {
  font-size: 26rpx;
  color: #606266;
  line-height: 1.6;
}

.empty-state, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;

  .empty-text {
    font-size: 28rpx;
    color: #C0C4CC;
    margin-top: 20rpx;
  }
}
</style>
