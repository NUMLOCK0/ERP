<template>
  <view class="report-page">
    <view class="header-bar">
      <text class="report-title">产品库存报表</text>
    </view>
    <scroll-view class="list-scroll" scroll-y @scrolltolower="loadMore">
      <view class="report-card" v-for="item in list" :key="item.product_id || item.id">
        <view class="card-row">
          <view class="product-info">
            <text class="product-name">{{ item.product_name || item.name || '-' }}</text>
            <text class="product-code">{{ item.product_code || item.code || '-' }}</text>
          </view>
          <view class="stock-section">
            <text class="stock-qty" :class="getStockClass(item.total_quantity || item.quantity || 0)">
              {{ item.total_quantity || item.quantity || 0 }}
            </text>
            <text class="stock-unit">{{ item.unit_name || '' }}</text>
          </view>
        </view>
        <view class="card-footer">
          <text class="footer-item">成本价: ¥{{ formatPrice(item.cost_price) }}</text>
          <text class="footer-item">销售价: ¥{{ formatPrice(item.sale_price) }}</text>
          <text class="footer-item">库存金额: ¥{{ formatPrice(item.stock_amount) }}</text>
        </view>
      </view>
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <uni-icons type="bars" size="60" color="#DCDFE6"></uni-icons>
        <text class="empty-text">暂无报表数据</text>
      </view>
      <view v-if="loading" class="loading-more"><uni-load-more status="loading"></uni-load-more></view>
      <view v-if="noMore && list.length > 0" class="loading-more"><uni-load-more status="noMore"></uni-load-more></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { reportApi } from '@/api/report'

const list = ref([])
const page = ref(1)
const loading = ref(false)
const noMore = ref(false)

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const getStockClass = (qty) => {
  if (qty <= 0) return 'text-danger'
  if (qty < 10) return 'text-warning'
  return 'text-success'
}

const fetchList = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const res = await reportApi.getProductStock({ page: page.value, pageSize: 20 })
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      const total = res.data?.total || data.length
      list.value = page.value === 1 ? data : [...list.value, ...data]
      page.value++
      noMore.value = list.value.length >= total
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

const loadMore = () => { if (!noMore.value && !loading.value) fetchList() }

onMounted(() => fetchList())
</script>

<style lang="scss" scoped>
.report-page { height: 100vh; display: flex; flex-direction: column; background: #F5F7FA; }
.header-bar { background: #FFFFFF; padding: 20rpx 24rpx; .report-title { font-size: 34rpx; font-weight: 700; color: #303133; } }
.list-scroll { flex: 1; padding: 10rpx 20rpx; }
.report-card {
  background: #FFFFFF; border-radius: 16rpx; margin-bottom: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  .card-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
  .product-info { flex: 1; .product-name { font-size: 28rpx; font-weight: 600; color: #303133; display: block; } .product-code { font-size: 22rpx; color: #909399; margin-top: 4rpx; display: block; } }
  .stock-section { text-align: right; .stock-qty { font-size: 40rpx; font-weight: 700; display: block; } .stock-unit { font-size: 20rpx; color: #C0C4CC; } }
  .card-footer { display: flex; justify-content: space-between; padding-top: 16rpx; border-top: 1rpx solid #F2F6FC; .footer-item { font-size: 22rpx; color: #909399; } }
}
.empty-state { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; .empty-text { font-size: 28rpx; color: #C0C4CC; margin-top: 20rpx; } }
.loading-more { padding: 20rpx 0; }
</style>
