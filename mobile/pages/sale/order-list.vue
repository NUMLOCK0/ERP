<template>
  <view class="order-list">
    <view class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
        <view v-if="activeTab === tab.value" class="tab-line"></view>
      </view>
    </view>

    <scroll-view
      class="list-scroll"
      scroll-y
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length > 0">
        <view class="order-card" v-for="item in list" :key="item.id" @click="goDetail(item.id)">
          <view class="card-header">
            <text class="order-no">{{ item.order_no }}</text>
            <uni-tag :text="statusMap[item.status] || item.status" size="small" :type="getStatusType(item.status)" />
          </view>
          <view class="card-body">
            <view class="body-item">
              <text class="body-label">客户</text>
              <text class="body-value">{{ item.customer_name || '-' }}</text>
            </view>
            <view class="body-item">
              <text class="body-label">金额</text>
              <text class="body-value text-danger">¥{{ formatPrice(item.total_amount) }}</text>
            </view>
          </view>
          <view class="card-footer">
            <text class="footer-time">{{ item.created_at || item.createdAt }}</text>
          </view>
        </view>
      </view>
      <view v-else-if="!loading" class="empty-state">
        <uni-icons type="wallet" size="60" color="#DCDFE6"></uni-icons>
        <text class="empty-text">暂无销售订单</text>
      </view>
      <view v-if="loading" class="loading-more"><uni-load-more status="loading"></uni-load-more></view>
      <view v-if="noMore && list.length > 0" class="loading-more"><uni-load-more status="noMore"></uni-load-more></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { saleApi } from '@/api/sale'

const tabs = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'submitted' },
  { label: '已审核', value: 'approved' },
  { label: '已完成', value: 'completed' }
]

const statusMap = { draft: '草稿', submitted: '待审核', approved: '已审核', completed: '已完成', cancelled: '已取消' }
const activeTab = ref('')
const list = ref([])
const page = ref(1)
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const getStatusType = (status) => {
  const map = { draft: 'info', submitted: 'warning', approved: 'success', completed: '', cancelled: 'error' }
  return map[status] || 'info'
}

const switchTab = (value) => { activeTab.value = value; page.value = 1; noMore.value = false; list.value = []; fetchList(true) }

const fetchList = async (isRefresh = false) => {
  if (loading.value) return
  loading.value = true
  try {
    const res = await saleApi.getOrders({ page: isRefresh ? 1 : page.value, pageSize: 10, status: activeTab.value })
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      const total = res.data?.total || data.length
      if (isRefresh) { list.value = data; page.value = 2 }
      else { list.value = [...list.value, ...data]; page.value++ }
      noMore.value = list.value.length >= total
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false; refreshing.value = false }
}

const onRefresh = () => { refreshing.value = true; page.value = 1; noMore.value = false; fetchList(true) }
const loadMore = () => { if (!noMore.value && !loading.value) fetchList() }
const goDetail = (id) => { uni.navigateTo({ url: `/pages/sale/order-detail?id=${id}` }) }

onMounted(() => fetchList(true))
</script>

<style lang="scss" scoped>
.order-list { height: 100vh; display: flex; flex-direction: column; background: #F5F7FA; }
.tab-bar { display: flex; background: #FFFFFF; padding: 0 20rpx; }
.tab-item { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #606266; position: relative;
  &.active { color: #409EFF; font-weight: 600; }
  .tab-line { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40rpx; height: 4rpx; background: #409EFF; border-radius: 2rpx; }
}
.list-scroll { flex: 1; padding: 10rpx 20rpx; }
.order-card {
  background: #FFFFFF; border-radius: 16rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); overflow: hidden;
  .card-header { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; border-bottom: 1rpx solid #F2F6FC; .order-no { font-size: 28rpx; font-weight: 600; color: #303133; } }
  .card-body { padding: 16rpx 24rpx; .body-item { display: flex; justify-content: space-between; padding: 8rpx 0; .body-label { font-size: 24rpx; color: #909399; } .body-value { font-size: 24rpx; color: #303133; font-weight: 500; } } }
  .card-footer { padding: 12rpx 24rpx; border-top: 1rpx solid #F2F6FC; .footer-time { font-size: 22rpx; color: #C0C4CC; } }
}
.empty-state { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; .empty-text { font-size: 28rpx; color: #C0C4CC; margin-top: 20rpx; } }
.loading-more { padding: 20rpx 0; }
</style>
