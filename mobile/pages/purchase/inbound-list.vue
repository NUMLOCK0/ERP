<template>
  <view class="list-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999999"  />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索入库单号/供应商/订单号"
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
            :title="item.inbound_no || '-'"
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
                  <text class="summary-label">关联订单</text>
                  <text class="summary-value">{{ item.order_no || '-' }}</text>
                </view>
                <view class="summary-item">
                  <text class="summary-label">入库仓库</text>
                  <text class="summary-value">{{ item.warehouse_name || '-' }}</text>
                </view>
                <view class="summary-item">
                  <text class="summary-label">入库数量</text>
                  <text class="summary-value">{{ item.inbound_total_quantity || 0 }}</text>
                </view>
                <view class="summary-item">
                  <text class="summary-label">总金额</text>
                  <text class="summary-value amount">￥{{ formatPrice(item.total_amount) }}</text>
                </view>
              </view>
            </template>

            <template #detail>
              <view class="detail-section">
                <text class="detail-title">入库信息</text>
                <view class="detail-grid">
                  <view class="detail-row"><text class="detail-label">入库单号</text><text class="detail-value">{{ item.inbound_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">状态</text><text class="detail-value">{{ statusMap[item.status] || '未知' }}</text></view>
                  <view class="detail-row"><text class="detail-label">关联订单</text><text class="detail-value">{{ item.order_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">供应商</text><text class="detail-value">{{ item.supplier_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">仓库</text><text class="detail-value">{{ item.warehouse_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">入库数量</text><text class="detail-value">{{ item.inbound_total_quantity || 0 }}</text></view>
                  <view class="detail-row"><text class="detail-label">总金额</text><text class="detail-value amount">￥{{ formatPrice(item.total_amount) }}</text></view>
                  <view v-if="item.remark" class="detail-row"><text class="detail-label">备注</text><text class="detail-value multiline">{{ item.remark }}</text></view>
                </view>
              </view>
            </template>

            <template #actions>
              <view class="action-btn primary" @click="goDetail(item.id)">详情</view>
              <view v-if="Number(item.status) === 0" class="action-btn outline-primary" @click="confirmInbound(item)">入库</view>
            </template>
          </BusinessListItem>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <u-icon name="shopping-cart" size="60" color="#DCDFE6"  />
          <text class="empty-text">暂无采购入库单</text>
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
import { purchaseApi } from '@/api/purchase'
import http from '@/api/request'
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
  { label: '待入库', value: '0' },
  { label: '已入库', value: '1' }
]

const statusMap = { 0: '待入库', 1: '已入库' }
const getStatusType = (status) => ({ 0: 'warning', 1: 'success' }[status] || 'info')

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
    if (activeTab.value !== '') params.status = Number(activeTab.value)
    const res = await purchaseApi.getInbounds(params)
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

const goDetail = (id) => uni.navigateTo({ url: `/pages/purchase/inbound-detail?id=${id}` })

const confirmInbound = (item) => {
  uni.showModal({
    title: '确认入库',
    content: `确认完成入库单 ${item.inbound_no || ''} 吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const imageUrls = await chooseUploadImages()
        const ret = await purchaseApi.confirmInbound(item.id, { image_urls: imageUrls })
        if (ret.code === 0) {
          uni.showToast({ title: '入库完成', icon: 'success' })
          resetAndFetch()
        }
      } catch (error) {
        // request interceptor handles toast
      }
    }
  })
}

const chooseUploadImages = () => {
  return new Promise((resolve) => {
    uni.showModal({
      title: '上传入库图片',
      content: '是否上传入库确认图片？',
      confirmText: '上传',
      cancelText: '跳过',
      success: (modalRes) => {
        if (!modalRes.confirm) {
          resolve([])
          return
        }
        uni.chooseImage({
          count: 10,
          success: async (chooseRes) => {
            const urls = []
            uni.showLoading({ title: '上传中...' })
            try {
              for (const filePath of chooseRes.tempFilePaths || []) {
                const uploadRes = await http.upload('/upload/file', filePath)
                if (uploadRes.code === 0 && uploadRes.data?.url) urls.push(uploadRes.data.url)
              }
              resolve(urls)
            } catch (error) {
              uni.showToast({ title: error.message || '上传失败', icon: 'none' })
              resolve([])
            } finally {
              uni.hideLoading()
            }
          },
          fail: () => resolve([])
        })
      },
      fail: () => resolve([])
    })
  })
}

onShow(() => {
  uni.hideTabBar()
  resetAndFetch()
})
</script>

<style scoped lang="scss">
@import './shared-list.scss';
</style>
