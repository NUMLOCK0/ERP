<template>
  <view class="order-list-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="20" color="#999999" />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索订单号/供应商/备注"
          type="text"
          confirm-type="search"
          @confirm="onSearch"
        />
      </view>
      <view class="search-btn" @click="onSearch">搜索</view>
    </view>

    <view class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
        <view v-if="activeTab === tab.value" class="tab-line" />
      </view>
    </view>

    <scroll-view
      class="list-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
    >
      <view class="scroll-inner">
        <view v-if="list.length > 0" class="card-list">
          <BusinessListItem
            v-for="item in list"
            :key="item.id"
            :meta="formatDate(item.created_at || item.createdAt) || '--'"
            :title="item.order_no || '-'"
            :tag-text="statusMap[item.status] || '未知'"
            :tag-type="getStatusType(item.status)"
            :expanded="!!expandedIds[item.id]"
            :show-toggle="true"
            @toggle="toggleCard(item.id)"
          >
            <template #summary>
              <view class="summary-grid">
                <view class="summary-item wide">
                  <text class="summary-label">供应商</text>
                  <text class="summary-value strong">{{ item.supplier_name || '-' }}</text>
                </view>
                <view class="summary-item">
                  <text class="summary-label">总金额</text>
                  <text class="summary-value amount">¥{{ formatPrice(item.total_amount) }}</text>
                </view>
                <view class="summary-item">
                  <text class="summary-label">收货仓库</text>
                  <text class="summary-value">{{ item.warehouse_name || '-' }}</text>
                </view>
                <view class="summary-item">
                  <text class="summary-label">付款方式</text>
                  <text class="summary-value">{{ item.payment_method || '-' }}</text>
                </view>
              </view>
            </template>

            <template #detail>
              <view class="detail-section">
                <text class="detail-title">订单信息</text>
                <view class="detail-grid">
                  <view class="detail-row">
                    <text class="detail-label">订单编号</text>
                    <text class="detail-value">{{ item.order_no || '-' }}</text>
                  </view>
                  <view class="detail-row">
                    <text class="detail-label">订单状态</text>
                    <text class="detail-value">{{ statusMap[item.status] || '未知' }}</text>
                  </view>
                  <view class="detail-row">
                    <text class="detail-label">供应商</text>
                    <text class="detail-value">{{ item.supplier_name || '-' }}</text>
                  </view>
                  <view class="detail-row">
                    <text class="detail-label">收货仓库</text>
                    <text class="detail-value">{{ item.warehouse_name || '-' }}</text>
                  </view>
                  <view class="detail-row">
                    <text class="detail-label">付款方式</text>
                    <text class="detail-value">{{ item.payment_method || '-' }}</text>
                  </view>
                  <view class="detail-row">
                    <text class="detail-label">商品条数</text>
                    <text class="detail-value">{{ getItemCount(item) }}</text>
                  </view>
                  <view class="detail-row">
                    <text class="detail-label">总数量</text>
                    <text class="detail-value">{{ getQuantity(item) }}</text>
                  </view>
                  <view class="detail-row">
                    <text class="detail-label">总金额</text>
                    <text class="detail-value amount">¥{{ formatPrice(item.total_amount) }}</text>
                  </view>
                  <view class="detail-row">
                    <text class="detail-label">创建时间</text>
                    <text class="detail-value">{{ formatDate(item.created_at || item.createdAt) || '--' }}</text>
                  </view>
                  <view class="detail-row">
                    <text class="detail-label">审核时间</text>
                    <text class="detail-value">{{ formatDate(item.audit_time || item.auditTime) || '--' }}</text>
                  </view>
                  <view class="detail-row" v-if="item.creator_name || item.creator || item.created_by_name">
                    <text class="detail-label">制单人</text>
                    <text class="detail-value">{{ item.creator_name || item.creator || item.created_by_name }}</text>
                  </view>
                  <view class="detail-row" v-if="item.admin_remark">
                    <text class="detail-label">管理备注</text>
                    <text class="detail-value multiline">{{ item.admin_remark }}</text>
                  </view>
                  <view class="detail-row" v-if="item.purchase_remark">
                    <text class="detail-label">采购备注</text>
                    <text class="detail-value multiline">{{ item.purchase_remark }}</text>
                  </view>
                  <view class="detail-row" v-if="item.remark">
                    <text class="detail-label">备注</text>
                    <text class="detail-value multiline">{{ item.remark }}</text>
                  </view>
                </view>
              </view>
            </template>

            <template #actions>
              <view class="action-btn primary" @click="goDetail(item.id)">详情</view>
              <view class="action-btn outline-primary" @click="goEdit(item.id)">编辑</view>
              <view class="action-btn outline" @click="showMore(item)">更多</view>
            </template>
          </BusinessListItem>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <uni-icons type="cart" size="60" color="#DCDFE6" />
          <text class="empty-text">暂无采购订单</text>
        </view>

        <view v-if="loading" class="loading-more">
          <uni-load-more status="loading" />
        </view>
        <view v-if="noMore && list.length > 0" class="loading-more">
          <uni-load-more status="noMore" />
        </view>
      </view>
    </scroll-view>

    <view class="floating-btn" @click="goCreate">
      <uni-icons type="plus" size="24" color="#FFFFFF" />
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { purchaseApi } from '@/api/purchase'
import BusinessListItem from '@/components/BusinessListItem.vue'

const keyword = ref('')
const activeTab = ref('')
const list = ref([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const expandedIds = reactive({})

const tabs = [
  { label: '全部', value: '' },
  { label: '草稿', value: '0' },
  { label: '待审核', value: '2' },
  { label: '已审核', value: '5' },
  { label: '已完成', value: '8' }
]

const statusMap = {
  0: '草稿',
  1: '采购中',
  2: '待审核',
  3: '已取消',
  4: '已关闭',
  5: '已审核',
  6: '已采购',
  7: '入库中',
  8: '已完成',
  9: '已拒绝'
}

const getStatusType = (status) => {
  const map = {
    0: 'info',
    1: 'primary',
    2: 'warning',
    3: 'error',
    4: 'info',
    5: 'success',
    6: 'primary',
    7: 'warning',
    8: 'success',
    9: 'error'
  }
  return map[status] || 'info'
}

const formatPrice = (val) => {
  if (val === null || val === undefined || val === '') return '0.00'
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

const getItemCount = (item) => {
  if (Array.isArray(item.items)) return item.items.length
  const candidates = [item.item_count, item.product_count, item.total_items]
  const value = candidates.find((it) => it !== undefined && it !== null && it !== '')
  return value ?? '-'
}

const getQuantity = (item) => {
  const candidates = [item.total_quantity, item.quantity, item.total_qty]
  const value = candidates.find((it) => it !== undefined && it !== null && it !== '')
  if (value !== undefined) return value
  if (Array.isArray(item.items)) {
    return item.items.reduce((sum, current) => sum + Number(current.quantity || 0), 0)
  }
  return '-'
}

const toggleCard = (id) => {
  if (expandedIds[id]) {
    delete expandedIds[id]
    return
  }
  expandedIds[id] = true
}

const switchTab = (value) => {
  activeTab.value = value
  page.value = 1
  noMore.value = false
  list.value = []
  fetchList(true)
}

const onSearch = () => {
  page.value = 1
  noMore.value = false
  list.value = []
  fetchList(true)
}

const fetchList = async (isRefresh = false) => {
  if (loading.value) return
  loading.value = true

  try {
    const params = {
      page: isRefresh ? 1 : page.value,
      pageSize,
      keyword: keyword.value.trim()
    }
    if (activeTab.value !== '') {
      params.status = Number(activeTab.value)
    }

    const res = await purchaseApi.getOrders(params)
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      total.value = res.data?.total || data.length
      if (isRefresh) {
        list.value = data
        page.value = 2
      } else {
        list.value = [...list.value, ...data]
        page.value += 1
      }
      noMore.value = list.value.length >= total.value
    }
  } catch (error) {
    // request interceptor handles toast
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onRefresh = () => {
  refreshing.value = true
  page.value = 1
  noMore.value = false
  fetchList(true)
}

const loadMore = () => {
  if (!noMore.value && !loading.value) {
    fetchList()
  }
}

const goDetail = (id) => {
  uni.navigateTo({ url: `/pages/purchase/order-detail?id=${id}` })
}

const goEdit = (id) => {
  uni.navigateTo({ url: `/pages/purchase/order-edit?id=${id}` })
}

const goCreate = () => {
  uni.navigateTo({ url: '/pages/purchase/order-edit' })
}

const submitOrder = (item) => {
  uni.showModal({
    title: '确认提审',
    content: `确定提交订单 ${item.order_no || ''} 吗？提交后将进入审核流程。`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const submitRes = await purchaseApi.submitOrder(item.id)
        if (submitRes.code === 0) {
          uni.showToast({ title: '提审成功', icon: 'success' })
          page.value = 1
          noMore.value = false
          fetchList(true)
        }
      } catch (error) {
        // request interceptor handles toast
      }
    }
  })
}

const cancelOrder = (item) => {
  uni.showModal({
    title: '确认取消',
    content: `确定取消并删除订单 ${item.order_no || ''} 吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const deleteRes = await purchaseApi.deleteOrder(item.id)
        if (deleteRes.code === 0) {
          uni.showToast({ title: '已取消', icon: 'success' })
          list.value = list.value.filter((current) => current.id !== item.id)
        }
      } catch (error) {
        // request interceptor handles toast
      }
    }
  })
}

const showMore = (item) => {
  const menu = ['查看详情']
  if (Number(item.status) === 0) {
    menu.push('编辑订单', '提交审核', '取消订单')
  } else {
    menu.push('复制单号')
  }

  uni.showActionSheet({
    itemList: menu,
    success: ({ tapIndex }) => {
      const action = menu[tapIndex]
      if (action === '查看详情') {
        goDetail(item.id)
      } else if (action === '编辑订单') {
        goEdit(item.id)
      } else if (action === '提交审核') {
        submitOrder(item)
      } else if (action === '取消订单') {
        cancelOrder(item)
      } else if (action === '复制单号') {
        uni.setClipboardData({ data: item.order_no || '' })
      }
    }
  })
}

onShow(() => {
  uni.hideTabBar()
  page.value = 1
  noMore.value = false
  fetchList(true)
})
</script>

<style scoped lang="scss">
.order-list-page {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

.search-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #ffffff;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  height: 72rpx;
  padding: 0 16rpx;
  background: #f2f4f6;
  border-radius: 12rpx;
}

.search-input {
  flex: 1;
  margin-left: 10rpx;
  font-size: 28rpx;
  color: #303133;
}

.search-btn {
  flex-shrink: 0;
  min-width: 108rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  background: #1890ff;
  border-radius: 12rpx;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 600;
}

.tab-bar {
  flex-shrink: 0;
  display: flex;
  padding: 0 20rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.02);
}

.tab-item {
  position: relative;
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #606266;

  &.active {
    color: #1890ff;
    font-weight: 600;
  }
}

.tab-line {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 40rpx;
  height: 4rpx;
  border-radius: 2rpx;
  transform: translateX(-50%);
  background: #1890ff;
}

.list-scroll {
  flex: 1;
  height: 0;
}

.scroll-inner {
  padding: 16rpx 20rpx 140rpx;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.order-card {
  overflow: hidden;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding: 20rpx 24rpx 18rpx;
  border-bottom: 1rpx solid #f2f6fc;
}

.header-main {
  flex: 1;
  min-width: 0;
}

.card-date {
  display: block;
  font-size: 22rpx;
  color: #909399;
}

.order-no {
  display: block;
  margin-top: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #303133;
  word-break: break-all;
}

.card-body {
  padding: 20rpx 24rpx 24rpx;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.summary-item {
  padding: 18rpx 20rpx;
  background: #f8fafc;
  border-radius: 12rpx;

  &.wide {
    grid-column: 1 / -1;
  }
}

.summary-label {
  display: block;
  font-size: 22rpx;
  color: #909399;
}

.summary-value {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #303133;
  font-weight: 500;
  word-break: break-all;

  &.strong {
    font-size: 28rpx;
    font-weight: 600;
  }

  &.amount {
    color: #f56c6c;
    font-weight: 700;
  }
}

.expanded {
  padding-top: 18rpx;
}

.detail-section {
  padding: 18rpx 20rpx;
  background: #f8fafc;
  border-radius: 12rpx;
}

.detail-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #303133;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.detail-label {
  flex-shrink: 0;
  width: 120rpx;
  font-size: 24rpx;
  color: #909399;
  line-height: 1.5;
}

.detail-value {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 24rpx;
  color: #303133;
  line-height: 1.5;
  word-break: break-all;

  &.amount {
    color: #f56c6c;
    font-weight: 700;
  }

  &.multiline {
    text-align: left;
  }
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 18rpx;
  padding: 12rpx 0;
}

.toggle-text {
  font-size: 24rpx;
  color: #1890ff;
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}

.action-btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border-radius: 12rpx;
  font-size: 26rpx;
  font-weight: 600;

  &.primary {
    background: #1890ff;
    color: #ffffff;
  }

  &.outline-primary {
    background: #e8f4ff;
    color: #1890ff;
  }

  &.outline {
    background: #f2f6fc;
    color: #606266;
  }
}

.floating-btn {
  position: fixed;
  right: 40rpx;
  bottom: 40rpx;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100rpx;
  height: 100rpx;
  background: #1890ff;
  border-radius: 50%;
  box-shadow: 0 4rpx 16rpx rgba(24, 144, 255, 0.4);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
}

.empty-text {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #c0c4cc;
}

.loading-more {
  padding: 20rpx 0;
}
</style>
