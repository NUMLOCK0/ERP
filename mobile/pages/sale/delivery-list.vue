<template>
  <view class="list-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999999"  />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索发货单号/销售单号/客户"
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

    <scroll-view class="list-scroll" scroll-y :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scrolltolower="loadMore">
      <view class="scroll-inner">
        <view v-if="list.length > 0" class="card-list">
          <BusinessListItem
            v-for="item in list"
            :key="item.id"
            :meta="formatDate(item.created_at || item.createdAt) || '--'"
            :title="item.delivery_no || '-'"
            :tag-text="statusMap[item.status] || '未知'"
            :tag-type="getStatusType(item.status)"
            :expanded="!!expandedIds[item.id]"
            :show-toggle="true"
            @toggle="toggleCard(item.id)"
          >
            <template #summary>
              <view class="summary-grid">
                <view class="summary-item wide"><text class="summary-label">客户</text><text class="summary-value strong">{{ item.customer_name || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">关联销售单</text><text class="summary-value">{{ item.order_no || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">金额</text><text class="summary-value amount">￥{{ formatPrice(item.total_amount) }}</text></view>
                <view class="summary-item wide"><text class="summary-label">物流信息</text><text class="summary-value">{{ logisticsText(item) }}</text></view>
              </view>
            </template>

            <template #detail>
              <view class="detail-section">
                <text class="detail-title">发货信息</text>
                <view class="detail-grid">
                  <view class="detail-row"><text class="detail-label">发货单号</text><text class="detail-value">{{ item.delivery_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">状态</text><text class="detail-value">{{ statusMap[item.status] || '未知' }}</text></view>
                  <view class="detail-row"><text class="detail-label">销售单号</text><text class="detail-value">{{ item.order_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">客户</text><text class="detail-value">{{ item.customer_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">金额</text><text class="detail-value amount">￥{{ formatPrice(item.total_amount) }}</text></view>
                  <view class="detail-row"><text class="detail-label">物流信息</text><text class="detail-value multiline">{{ logisticsText(item) }}</text></view>
                </view>
              </view>
            </template>

            <template #actions>
              <view class="action-btn primary" @click="goDetail(item.id)">详情</view>
              <view v-if="Number(item.status) === 0" class="action-btn outline-primary" @click="goDetail(item.id)">发货</view>
              <view v-if="Number(item.status) === 1" class="action-btn outline-primary" @click="receiveDelivery(item)">收货</view>
              <view v-if="[0, 1, 2].includes(Number(item.status))" class="action-btn outline" @click="showMore(item)">更多</view>
            </template>
          </BusinessListItem>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <u-icon name="car" size="60" color="#DCDFE6"  />
          <text class="empty-text">暂无销售发货单</text>
        </view>

        <view v-if="loading" class="loading-more"><uni-load-more status="loading" /></view>
        <view v-if="noMore && list.length > 0" class="loading-more"><uni-load-more status="noMore" /></view>
      </view>
    </scroll-view>
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
  { label: '待发货', value: '0' },
  { label: '已发货', value: '1' },
  { label: '已签收', value: '2' },
  { label: '已取消', value: '3' }
]

const statusMap = { 0: '待发货', 1: '已发货', 2: '已签收', 3: '已取消' }
const getStatusType = (status) => ({ 0: 'warning', 1: 'primary', 2: 'success', 3: 'error' }[status] || 'info')
const formatPrice = (val) => (val === null || val === undefined || val === '' ? '0.00' : Number(val).toFixed(2))
const formatDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return val
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const logisticsText = (item) => (item.logistics_company ? `${item.logistics_company} ${item.logistics_no || ''}` : '-')

const toggleCard = (id) => {
  if (expandedIds[id]) delete expandedIds[id]
  else expandedIds[id] = true
}

const resetAndFetch = () => {
  page.value = 1
  noMore.value = false
  list.value = []
  fetchList(true)
}

const switchTab = (value) => {
  activeTab.value = value
  resetAndFetch()
}

const onSearch = () => resetAndFetch()

const fetchList = async (isRefresh = false) => {
  if (loading.value) return
  loading.value = true
  try {
    const params = { page: isRefresh ? 1 : page.value, pageSize, keyword: keyword.value.trim(), status: activeTab.value }
    const res = await saleApi.getDeliveries(params)
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
  if (!noMore.value && !loading.value) fetchList()
}

const goDetail = (id) => uni.navigateTo({ url: `/pages/sale/delivery-detail?id=${id}` })

const receiveDelivery = (item) => {
  uni.showModal({
    title: '确认收货',
    content: `确认完成发货单 ${item.delivery_no || ''} 的收货吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const ret = await saleApi.receiveDelivery(item.id)
        if (ret.code === 0) {
          uni.showToast({ title: '收货成功', icon: 'success' })
          resetAndFetch()
        }
      } catch (error) {
        // request interceptor handles toast
      }
    }
  })
}

const cancelDelivery = (item) => {
  uni.showModal({
    title: '确认取消',
    content: `确认取消发货单 ${item.delivery_no || ''} 吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const ret = await saleApi.cancelDelivery(item.id)
        if (ret.code === 0) {
          uni.showToast({ title: '已取消', icon: 'success' })
          resetAndFetch()
        }
      } catch (error) {
        // request interceptor handles toast
      }
    }
  })
}

const goReturnCreate = () => {
  uni.navigateTo({ url: '/pages/sale/return-edit' })
}

const showMore = (item) => {
  const status = Number(item.status)
  const menu = ['查看详情']
  if (status === 0) menu.push('取消发货单')
  if (status === 1) menu.push('退货')
  if (status === 2) menu.push('退货')
  menu.push('复制单号')

  uni.showActionSheet({
    itemList: menu,
    success: ({ tapIndex }) => {
      const action = menu[tapIndex]
      if (action === '查看详情') goDetail(item.id)
      else if (action === '取消发货单') cancelDelivery(item)
      else if (action === '退货') goReturnCreate()
      else if (action === '复制单号') uni.setClipboardData({ data: item.delivery_no || '' })
    }
  })
}

onShow(() => {
  uni.hideTabBar()
  resetAndFetch()
})
</script>

<style scoped lang="scss">
@import '../purchase/shared-list.scss';
</style>
