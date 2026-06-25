<template>
  <view class="invoice-list">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="20" color="#999"></uni-icons>
        <input class="search-input" v-model="keyword" placeholder="登记单号/发票号/订单/客户" type="text" @confirm="onSearch" />
      </view>
      <view class="search-btn" @click="onSearch">搜索</view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item">
        <text class="filter-label">客户：</text>
        <picker class="filter-picker" @change="onCustomerFilterChange" :value="customerIndex" :range="customers" range-key="name">
          <view class="picker-inner">
            <text class="picker-value" :class="{ placeholder: customerIndex === -1 }">
              {{ customers[customerIndex]?.name || '全部客户' }}
            </text>
            <uni-icons type="arrowdown" size="12" color="#909399"></uni-icons>
          </view>
        </picker>
        <view class="clear-filter" v-if="customerIndex !== -1" @click.stop="clearCustomerFilter">
          <uni-icons type="clear" size="16" color="#C0C4CC"></uni-icons>
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="scroll-inner">
        <view v-if="list.length > 0">
          <view
            class="invoice-card"
            v-for="item in list"
            :key="item.id"
            @click="goDetail(item.id)"
          >
            <view class="card-header">
              <text class="invoice-no">{{ item.invoice_no }}</text>
              <view class="header-tags">
                <uni-tag text="已登记" size="small" type="success" style="margin-right: 8rpx;" />
                <uni-tag :text="getReceiptStatusText(item)" size="small" :type="getReceiptStatusType(item)" />
              </view>
            </view>
            <view class="card-body">
              <view class="body-item">
                <text class="body-label">发票号码</text>
                <text class="body-value">{{ item.external_invoice_no || '-' }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">关联销售单</text>
                <text class="body-value">{{ item.order_no || '-' }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">客户</text>
                <text class="body-value">{{ item.customer_name || '-' }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">价税合计</text>
                <text class="body-value text-danger font-bold">¥{{ formatPrice(item.total_amount) }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">已收金额</text>
                <text class="body-value text-success font-bold">¥{{ formatPrice(item.paid_amount || item.received_amount) }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">不含税金额</text>
                <text class="body-value">¥{{ formatPrice(item.amount) }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">税率 / 税金</text>
                <text class="body-value">{{ formatPrice(item.tax_rate) }}% / ¥{{ formatPrice(item.tax_amount) }}</text>
              </view>
            </view>
            <view class="card-footer" v-if="item.created_at || item.createdAt">
              <text class="footer-time">{{ formatDate(item.created_at || item.createdAt) }}</text>
            </view>
          </view>
        </view>
        <view v-else-if="!loading" class="empty-state">
          <uni-icons type="wallet" size="60" color="#DCDFE6"></uni-icons>
          <text class="empty-text">暂无发票登记记录</text>
        </view>

        <view v-if="loading" class="loading-more">
          <uni-load-more status="loading"></uni-load-more>
        </view>
        <view v-if="noMore && list.length > 0" class="loading-more">
          <uni-load-more status="noMore"></uni-load-more>
        </view>
      </view>
    </scroll-view>

    <!-- 浮动新增按钮 -->
    <view class="floating-btn" @click="goCreate">
      <uni-icons type="plus" size="24" color="#FFFFFF"></uni-icons>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { saleApi } from '@/api/sale'
import { commonApi } from '@/api/common'

const keyword = ref('')
const list = ref([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)

// 客户筛选
const customers = ref([])
const customerIndex = ref(-1)
const selectedCustomerId = ref(null)

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

const getReceiptStatusText = (item) => {
  const totalVal = Number(item.total_amount || 0)
  const paidVal = Number(item.paid_amount || item.received_amount || 0)
  if (paidVal <= 0) return '未收款'
  if (paidVal >= totalVal) return '已收清'
  return '部分收款'
}

const getReceiptStatusType = (item) => {
  const totalVal = Number(item.total_amount || 0)
  const paidVal = Number(item.paid_amount || item.received_amount || 0)
  if (paidVal <= 0) return 'error'
  if (paidVal >= totalVal) return 'success'
  return 'warning'
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
      keyword: keyword.value.trim(),
      customer_id: selectedCustomerId.value || ''
    }
    const res = await saleApi.getInvoices(params)
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      total.value = res.data?.total || data.length
      if (isRefresh) {
        list.value = data
        page.value = 2
      } else {
        list.value = [...list.value, ...data]
        page.value++
      }
      noMore.value = list.value.length >= total.value
    }
  } catch (e) {
    // handled
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const loadCustomers = async () => {
  try {
    const res = await commonApi.getSuppliers({ page: 1, pageSize: 1000, type: 'customer', status: 1 })
    if (res.code === 0) {
      customers.value = res.data?.list || res.data || []
    }
  } catch (e) {
    // handled
  }
}

const onCustomerFilterChange = (e) => {
  const index = e.detail.value
  customerIndex.value = index
  selectedCustomerId.value = customers.value[index]?.id || null
  onSearch()
}

const clearCustomerFilter = () => {
  customerIndex.value = -1
  selectedCustomerId.value = null
  onSearch()
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
  uni.navigateTo({ url: `/pages/sale/invoice-detail?id=${id}` })
}

const goCreate = () => {
  uni.navigateTo({ url: `/pages/sale/invoice-edit` })
}

onShow(() => {
  uni.hideTabBar()
  loadCustomers()
  fetchList(true)
})
</script>

<style lang="scss" scoped>
.invoice-list {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
}

/* 搜索栏 */
.search-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx 8rpx 20rpx;
  background: #FFFFFF;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #F2F4F6;
  border-radius: 12rpx;
  padding: 0 16rpx;
  height: 72rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  margin-left: 10rpx;
}

.search-btn {
  flex-shrink: 0;
  background: #1890FF;
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 600;
  padding: 0 24rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 12rpx;
  white-space: nowrap;

  &:active {
    opacity: 0.85;
  }
}

/* 筛选栏 */
.filter-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx 16rpx 20rpx;
  background: #FFFFFF;
  border-bottom: 1rpx solid #F2F6FC;
}

.filter-item {
  display: flex;
  align-items: center;
  background: #F5F7FA;
  padding: 0 20rpx;
  border-radius: 12rpx;
  height: 64rpx;
  width: 100%;
  box-sizing: border-box;
}

.filter-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #909399;
  flex-shrink: 0;
}

.filter-picker {
  flex: 1;
  height: 100%;
}

.picker-inner {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  height: 64rpx;
}

.picker-value {
  font-size: 26rpx;
  color: #303133;
  font-weight: 600;
  
  &.placeholder {
    color: #909399;
    font-weight: 400;
  }
}

.clear-filter {
  margin-left: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* 列表滚动 */
.list-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 16rpx 20rpx;
}

.invoice-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  overflow: hidden;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 24rpx;
    border-bottom: 1rpx solid #F2F6FC;

    .invoice-no {
      font-size: 26rpx;
      font-weight: 600;
      color: #303133;
    }

    .header-tags {
      display: flex;
      align-items: center;
    }
  }

  .card-body {
    padding: 16rpx 24rpx;

    .body-item {
      display: flex;
      justify-content: space-between;
      padding: 8rpx 0;

      .body-label {
        font-size: 24rpx;
        color: #909399;
      }
      .body-value {
        font-size: 24rpx;
        color: #303133;
        font-weight: 500;
      }
      .font-bold {
        font-weight: 700;
      }
      .text-danger {
        color: #F56C6C;
      }
      .text-success {
        color: #67C23A;
      }
    }
  }

  .card-footer {
    padding: 12rpx 24rpx;
    border-top: 1rpx solid #F2F6FC;
    background: #FAFAFA;

    .footer-time {
      font-size: 22rpx;
      color: #909399;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;

  .empty-text {
    font-size: 26rpx;
    color: #C0C4CC;
    margin-top: 16rpx;
  }
}

.loading-more {
  padding: 20rpx 0;
}

/* 浮动按钮 */
.floating-btn {
  position: fixed;
  right: 40rpx;
  bottom: 40rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #1890FF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(24, 144, 255, 0.4);
  z-index: 99;

  &:active {
    opacity: 0.85;
  }
}
</style>
