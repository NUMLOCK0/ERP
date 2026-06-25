<template>
  <view class="list-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="20" color="#999999" />
        <input v-model="keyword" class="search-input" placeholder="搜索订单号/客户" type="text" confirm-type="search" @confirm="onSearch" />
      </view>
      <view class="search-btn" @click="onSearch">搜索</view>
    </view>

    <view class="tab-bar">
      <view v-for="tab in tabs" :key="tab.value" class="tab-item" :class="{ active: activeTab === tab.value }" @click="switchTab(tab.value)">
        <text>{{ tab.label }}</text>
        <view v-if="activeTab === tab.value" class="tab-line" />
      </view>
    </view>

    <scroll-view class="list-scroll" scroll-y :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scrolltolower="loadMore">
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
                <view class="summary-item wide"><text class="summary-label">客户</text><text class="summary-value strong">{{ item.customer_name || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">金额</text><text class="summary-value amount">¥{{ formatPrice(item.total_amount) }}</text></view>
                <view class="summary-item"><text class="summary-label">下单时间</text><text class="summary-value">{{ formatDate(item.created_at || item.createdAt) || '--' }}</text></view>
              </view>
            </template>
            <template #detail>
              <view class="detail-section">
                <text class="detail-title">订单信息</text>
                <view class="detail-grid">
                  <view class="detail-row"><text class="detail-label">订单编号</text><text class="detail-value">{{ item.order_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">状态</text><text class="detail-value">{{ statusMap[item.status] || '未知' }}</text></view>
                  <view class="detail-row"><text class="detail-label">客户</text><text class="detail-value">{{ item.customer_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">金额</text><text class="detail-value amount">¥{{ formatPrice(item.total_amount) }}</text></view>
                  <view class="detail-row"><text class="detail-label">下单时间</text><text class="detail-value">{{ formatDate(item.created_at || item.createdAt) || '--' }}</text></view>
                  <view v-if="item.remark" class="detail-row"><text class="detail-label">备注</text><text class="detail-value multiline">{{ item.remark }}</text></view>
                </view>
              </view>
            </template>
            <template #actions>
              <view class="action-btn primary" @click="goDetail(item.id)">详情</view>
            </template>
          </BusinessListItem>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <uni-icons type="wallet" size="60" color="#DCDFE6" />
          <text class="empty-text">暂无销售订单</text>
        </view>

        <view v-if="loading" class="loading-more"><uni-load-more status="loading" /></view>
        <view v-if="noMore && list.length > 0" class="loading-more"><uni-load-more status="noMore" /></view>
      </view>
    </scroll-view>

    <view class="floating-btn" @click="goCreate"><uni-icons type="plus" size="24" color="#FFFFFF" /></view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { saleApi } from '@/api/sale'
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
  { label: '进行中', value: '1' },
  { label: '已关闭', value: '4' },
  { label: '已取消', value: '3' }
]

const statusMap = { 0: '草稿', 1: '进行中', 2: '待审核', 3: '已取消', 4: '已关闭' }
const getStatusType = (status) => ({ 0: 'info', 1: 'success', 2: 'warning', 3: 'error', 4: 'default' }[status] || 'info')
const formatPrice = (val) => (val === null || val === undefined || val === '' ? '0.00' : Number(val).toFixed(2))
const formatDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const toggleCard = (id) => { if (expandedIds[id]) delete expandedIds[id]; else expandedIds[id] = true }
const switchTab = (value) => { activeTab.value = value; onSearch() }
const onSearch = () => { page.value = 1; noMore.value = false; list.value = []; fetchList(true) }
const fetchList = async (isRefresh = false) => {
  if (loading.value) return
  loading.value = true
  try {
    const params = { page: isRefresh ? 1 : page.value, pageSize, keyword: keyword.value.trim(), status: activeTab.value }
    const res = await saleApi.getOrders(params)
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      total.value = res.data?.total || data.length
      if (isRefresh) { list.value = data; page.value = 2 } else { list.value = [...list.value, ...data]; page.value += 1 }
      noMore.value = list.value.length >= total.value
    }
  } finally {
    loading.value = false
    refreshing.value = false
  }
}
const onRefresh = () => { refreshing.value = true; page.value = 1; noMore.value = false; fetchList(true) }
const loadMore = () => { if (!noMore.value && !loading.value) fetchList() }
const goDetail = (id) => uni.navigateTo({ url: `/pages/sale/order-detail?id=${id}` })
const goCreate = () => uni.navigateTo({ url: '/pages/sale/order-edit' })
onShow(() => { uni.hideTabBar(); fetchList(true) })
</script>

<style scoped lang="scss">
@import '../purchase/shared-list.scss';
</style>
