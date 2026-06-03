<template>
  <view class="report-page">
    <view class="header-bar">
      <text class="report-title">采购入库报表</text>
    </view>
    <scroll-view class="list-scroll" scroll-y @scrolltolower="loadMore">
      <view class="report-card" v-for="item in list" :key="item.id">
        <view class="card-header">
          <text class="inbound-no">{{ item.inbound_no || '-' }}</text>
          <uni-tag :text="item.status === 'confirmed' ? '已确认' : '待确认'" size="small" :type="item.status === 'confirmed' ? 'success' : 'warning'" />
        </view>
        <view class="card-body">
          <view class="body-row">
            <text class="body-label">关联订单</text>
            <text class="body-value">{{ item.order_no || '-' }}</text>
          </view>
          <view class="body-row">
            <text class="body-label">供应商</text>
            <text class="body-value">{{ item.supplier_name || '-' }}</text>
          </view>
          <view class="body-row">
            <text class="body-label">仓库</text>
            <text class="body-value">{{ item.warehouse_name || '-' }}</text>
          </view>
          <view class="body-row">
            <text class="body-label">金额</text>
            <text class="body-value text-danger">¥{{ formatPrice(item.total_amount) }}</text>
          </view>
        </view>
        <view class="card-footer">
          <text class="footer-time">{{ item.created_at || item.createdAt }}</text>
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

const fetchList = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const res = await reportApi.getPurchaseInbound({ page: page.value, pageSize: 20 })
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
  background: #FFFFFF; border-radius: 16rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); overflow: hidden;
  .card-header { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; border-bottom: 1rpx solid #F2F6FC; .inbound-no { font-size: 28rpx; font-weight: 600; color: #303133; } }
  .card-body { padding: 16rpx 24rpx; .body-row { display: flex; justify-content: space-between; padding: 8rpx 0; .body-label { font-size: 24rpx; color: #909399; } .body-value { font-size: 24rpx; color: #303133; font-weight: 500; } } }
  .card-footer { padding: 12rpx 24rpx; border-top: 1rpx solid #F2F6FC; .footer-time { font-size: 22rpx; color: #C0C4CC; } }
}
.empty-state { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; .empty-text { font-size: 28rpx; color: #C0C4CC; margin-top: 20rpx; } }
.loading-more { padding: 20rpx 0; }
</style>
