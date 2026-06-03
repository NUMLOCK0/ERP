<template>
  <view class="log-page">
    <scroll-view
      class="list-scroll"
      scroll-y
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length > 0" class="timeline">
        <view class="log-item" v-for="item in list" :key="item.id">
          <view class="timeline-dot" :class="getTypeClass(item.change_type)"></view>
          <view class="log-card">
            <view class="log-header">
              <text class="log-type">{{ item.change_type || '-' }}</text>
              <text class="log-time">{{ item.created_at || item.createdAt }}</text>
            </view>
            <view class="log-body">
              <text class="log-product">{{ item.product_name || item.productName || '-' }}</text>
              <view class="log-change">
                <text class="change-before">{{ item.before_quantity ?? 0 }}</text>
                <uni-icons type="arrow-right" size="14" color="#C0C4CC"></uni-icons>
                <text class="change-after" :class="getQtyClass(item.after_quantity, item.before_quantity)">
                  {{ item.after_quantity ?? 0 }}
                </text>
                <text class="change-delta" :class="getDeltaClass(item.change_quantity)">
                  {{ formatDelta(item.change_quantity) }}
                </text>
              </view>
            </view>
            <view class="log-footer" v-if="item.ref_no || item.warehouse_name">
              <text v-if="item.warehouse_name" class="footer-tag">{{ item.warehouse_name }}</text>
              <text v-if="item.ref_no" class="footer-tag">{{ item.ref_no }}</text>
              <text v-if="item.remark" class="footer-remark">{{ item.remark }}</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else-if="!loading" class="empty-state">
        <uni-icons type="list" size="60" color="#DCDFE6"></uni-icons>
        <text class="empty-text">暂无库存日志</text>
      </view>
      <view v-if="loading" class="loading-more"><uni-load-more status="loading"></uni-load-more></view>
      <view v-if="noMore && list.length > 0" class="loading-more"><uni-load-more status="noMore"></uni-load-more></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { inventoryApi } from '@/api/inventory'

const list = ref([])
const page = ref(1)
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)

const getTypeClass = (t) => {
  const m = { inbound: 'dot-success', outbound: 'dot-danger', transfer_in: 'dot-primary', transfer_out: 'dot-warning', check_plus: 'dot-success', check_minus: 'dot-danger' }
  return m[t] || 'dot-primary'
}

const getQtyClass = (after, before) => {
  if (after === before) return ''
  return after > before ? 'text-success' : 'text-danger'
}

const getDeltaClass = (qty) => {
  if (!qty) return ''
  return Number(qty) > 0 ? 'text-success' : 'text-danger'
}

const formatDelta = (qty) => {
  if (!qty) return ''
  const n = Number(qty)
  return n > 0 ? `+${n}` : `${n}`
}

const fetchList = async (isRefresh = false) => {
  if (loading.value) return
  loading.value = true
  try {
    const res = await inventoryApi.getLogs({ page: isRefresh ? 1 : page.value, pageSize: 20 })
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      const total = res.data?.total || data.length
      if (isRefresh) { list.value = data; page.value = 2 }
      else { list.value = [...list.value, ...data]; page.value++ }
      noMore.value = list.value.length >= total
    }
  } catch (e) { /* ignore */ }
  finally { loading.value = false; refreshing.value = false }
}

const onRefresh = () => { refreshing.value = true; page.value = 1; noMore.value = false; fetchList(true) }
const loadMore = () => { if (!noMore.value && !loading.value) fetchList() }

onMounted(() => fetchList(true))
</script>

<style lang="scss" scoped>
.log-page { height: 100vh; display: flex; flex-direction: column; background: #F5F7FA; }
.list-scroll { flex: 1; padding: 10rpx 20rpx; }
.timeline { padding-left: 40rpx; }
.log-item { display: flex; position: relative; padding-bottom: 24rpx; }
.timeline-dot {
  position: absolute; left: -32rpx; top: 20rpx; width: 16rpx; height: 16rpx; border-radius: 50%; background: #DCDFE6;
  &.dot-success { background: #67C23A; }
  &.dot-danger { background: #F56C6C; }
  &.dot-primary { background: #409EFF; }
  &.dot-warning { background: #E6A23C; }
}
.log-card {
  flex: 1; background: #FFFFFF; border-radius: 12rpx; padding: 16rpx 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);
  .log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; .log-type { font-size: 24rpx; font-weight: 600; color: #409EFF; } .log-time { font-size: 20rpx; color: #C0C4CC; } }
  .log-body { .log-product { font-size: 26rpx; color: #303133; display: block; margin-bottom: 8rpx; } }
  .log-change { display: flex; align-items: center; gap: 8rpx; .change-before, .change-after { font-size: 24rpx; color: #606266; } .change-delta { font-size: 22rpx; font-weight: 600; margin-left: 8rpx; } }
  .log-footer { margin-top: 10rpx; display: flex; flex-wrap: wrap; gap: 8rpx; .footer-tag { font-size: 20rpx; color: #409EFF; background: #ECF5FF; padding: 2rpx 12rpx; border-radius: 4rpx; } .footer-remark { font-size: 20rpx; color: #909399; } }
}
.empty-state { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; .empty-text { font-size: 28rpx; color: #C0C4CC; margin-top: 20rpx; } }
.loading-more { padding: 20rpx 0; }
</style>
