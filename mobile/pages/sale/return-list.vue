<template>
  <view class="list-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999999"  />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索退货单号/发货单号/客户"
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
            :title="item.return_no || '-'"
            :tag-text="statusMap[item.status] || '未知'"
            :tag-type="getStatusType(item.status)"
            :expanded="!!expandedIds[item.id]"
            :show-toggle="true"
            @toggle="toggleCard(item.id)"
          >
            <template #summary>
              <view class="summary-grid">
                <view class="summary-item wide"><text class="summary-label">客户</text><text class="summary-value strong">{{ item.customer_name || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">关联发货单</text><text class="summary-value">{{ item.delivery_no || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">退款金额</text><text class="summary-value amount">￥{{ formatPrice(item.total_amount || item.refund_total_amount) }}</text></view>
                <view class="summary-item wide"><text class="summary-label">退货原因</text><text class="summary-value">{{ item.reason || '-' }}</text></view>
              </view>
            </template>

            <template #detail>
              <view class="detail-section">
                <text class="detail-title">退货信息</text>
                <view class="detail-grid">
                  <view class="detail-row"><text class="detail-label">退货单号</text><text class="detail-value">{{ item.return_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">状态</text><text class="detail-value">{{ statusMap[item.status] || '未知' }}</text></view>
                  <view class="detail-row"><text class="detail-label">关联发货单</text><text class="detail-value">{{ item.delivery_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">关联销售单</text><text class="detail-value">{{ item.order_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">客户</text><text class="detail-value">{{ item.customer_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">退款金额</text><text class="detail-value amount">￥{{ formatPrice(item.total_amount || item.refund_total_amount) }}</text></view>
                  <view class="detail-row"><text class="detail-label">退货原因</text><text class="detail-value multiline">{{ item.reason || '-' }}</text></view>
                </view>
              </view>
            </template>

            <template #actions>
              <view class="action-btn primary" @click="goDetail(item.id)">详情</view>
              <view v-if="Number(item.status) === 0" class="action-btn outline-primary" @click="goDetail(item.id)">退货</view>
              <view v-if="[0, 1, 2].includes(Number(item.status))" class="action-btn outline" @click="showMore(item)">更多</view>
            </template>
          </BusinessListItem>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <u-icon name="rewind-left" size="60" color="#DCDFE6"  />
          <text class="empty-text">暂无销售退货单</text>
        </view>

        <view v-if="loading" class="loading-more"><uni-load-more status="loading" /></view>
        <view v-if="noMore && list.length > 0" class="loading-more"><uni-load-more status="noMore" /></view>
      </view>
    </scroll-view>

    <view class="floating-btn" @click="goCreate"><u-icon name="plus" size="24" color="#FFFFFF"  /></view>
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
  { label: '待退货', value: '0' },
  { label: '已退货', value: '1' },
  { label: '已取消', value: '2' },
  { label: '已删除', value: '3' }
]

const statusMap = {
  0: '待退货',
  1: '已退货',
  2: '已取消',
  3: '已删除'
}

const getStatusType = (status) => ({ 0: 'warning', 1: 'success', 2: 'error', 3: 'default' }[status] || 'info')

const formatPrice = (val) => (val === null || val === undefined || val === '' ? '0.00' : Number(val).toFixed(2))
const formatDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return val
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

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
    const params = {
      page: isRefresh ? 1 : page.value,
      pageSize,
      keyword: keyword.value.trim()
    }
    if (activeTab.value !== '') params.status = activeTab.value
    const res = await saleApi.getReturns(params)
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

const goDetail = (id) => uni.navigateTo({ url: `/pages/sale/return-detail?id=${id}` })
const goCreate = () => uni.navigateTo({ url: '/pages/sale/return-edit' })

const cancelReturn = (item) => {
  uni.showModal({
    title: '确认取消',
    content: `确认取消退货单 ${item.return_no || ''} 吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const ret = await saleApi.cancelReturn(item.id)
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

const deleteReturn = (item) => {
  uni.showModal({
    title: '确认删除',
    content: `确认删除退货单 ${item.return_no || ''} 吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const ret = await saleApi.deleteReturn(item.id)
        if (ret.code === 0) {
          uni.showToast({ title: '删除成功', icon: 'success' })
          resetAndFetch()
        }
      } catch (error) {
        // request interceptor handles toast
      }
    }
  })
}

const showMore = (item) => {
  const status = Number(item.status)
  const menu = ['查看详情']
  if (status === 0) menu.push('取消退货单')
  if (status === 1) menu.push('退款功能待补充')
  if (status === 2) menu.push('删除退货单')
  menu.push('复制单号')

  uni.showActionSheet({
    itemList: menu,
    success: ({ tapIndex }) => {
      const action = menu[tapIndex]
      if (action === '查看详情') goDetail(item.id)
      else if (action === '取消退货单') cancelReturn(item)
      else if (action === '删除退货单') deleteReturn(item)
      else if (action === '退款功能待补充') uni.showToast({ title: '移动端退款接口暂未接入', icon: 'none' })
      else if (action === '复制单号') uni.setClipboardData({ data: item.return_no || '' })
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
