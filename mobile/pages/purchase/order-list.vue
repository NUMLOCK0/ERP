<template>
  <view class="list-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999999"  />
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
                  <text class="summary-value amount">￥{{ formatPrice(item.total_amount) }}</text>
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
                  <view class="detail-row"><text class="detail-label">订单编号</text><text class="detail-value">{{ item.order_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">订单状态</text><text class="detail-value">{{ statusMap[item.status] || '未知' }}</text></view>
                  <view class="detail-row"><text class="detail-label">供应商</text><text class="detail-value">{{ item.supplier_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">收货仓库</text><text class="detail-value">{{ item.warehouse_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">付款方式</text><text class="detail-value">{{ item.payment_method || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">商品条数</text><text class="detail-value">{{ getItemCount(item) }}</text></view>
                  <view class="detail-row"><text class="detail-label">总数量</text><text class="detail-value">{{ getQuantity(item) }}</text></view>
                  <view class="detail-row"><text class="detail-label">总金额</text><text class="detail-value amount">￥{{ formatPrice(item.total_amount) }}</text></view>
                  <view class="detail-row"><text class="detail-label">创建时间</text><text class="detail-value">{{ formatDate(item.created_at || item.createdAt) || '--' }}</text></view>
                  <view class="detail-row"><text class="detail-label">审核时间</text><text class="detail-value">{{ formatDate(item.audit_time || item.auditTime) || '--' }}</text></view>
                  <view v-if="item.creator_name || item.creator || item.created_by_name" class="detail-row">
                    <text class="detail-label">制单人</text>
                    <text class="detail-value">{{ item.creator_name || item.creator || item.created_by_name }}</text>
                  </view>
                  <view v-if="item.admin_remark" class="detail-row"><text class="detail-label">管理备注</text><text class="detail-value multiline">{{ item.admin_remark }}</text></view>
                  <view v-if="item.purchase_remark" class="detail-row"><text class="detail-label">采购备注</text><text class="detail-value multiline">{{ item.purchase_remark }}</text></view>
                  <view v-if="item.remark" class="detail-row"><text class="detail-label">备注</text><text class="detail-value multiline">{{ item.remark }}</text></view>
                </view>
              </view>
            </template>

            <template #actions>
              <view class="action-btn primary" @click="goDetail(item.id)">详情</view>
              <view v-if="Number(item.status) === 0" class="action-btn outline-primary" @click="goEdit(item.id)">编辑</view>
              <view class="action-btn outline" @click="showMore(item)">更多</view>
            </template>
          </BusinessListItem>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <u-icon name="shopping-cart" size="60" color="#DCDFE6"  />
          <text class="empty-text">暂无采购订单</text>
        </view>

        <view v-if="loading" class="loading-more"><uni-load-more status="loading" /></view>
        <view v-if="noMore && list.length > 0" class="loading-more"><uni-load-more status="noMore" /></view>
      </view>
    </scroll-view>

    <view class="floating-btn" @click="goCreate">
      <u-icon name="plus" size="24" color="#FFFFFF"  />
    </view>
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
  if (Number.isNaN(d.getTime())) return val
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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
  if (!noMore.value && !loading.value) fetchList()
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

const refreshAfterAction = () => {
  page.value = 1
  noMore.value = false
  fetchList(true)
}

const submitOrder = (item) => {
  uni.showModal({
    title: '确认提交',
    content: `确认提交采购订单 ${item.order_no || ''} 吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const submitRes = await purchaseApi.submitOrder(item.id)
        if (submitRes.code === 0) {
          uni.showToast({ title: '提交成功', icon: 'success' })
          refreshAfterAction()
        }
      } catch (error) { /* handled */ }
    }
  })
}

const cancelOrder = (item) => {
  uni.showModal({
    title: '确认取消',
    content: `确认取消采购订单 ${item.order_no || ''} 吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const cancelRes = await purchaseApi.cancelOrder(item.id)
        if (cancelRes.code === 0) {
          uni.showToast({ title: '已取消', icon: 'success' })
          refreshAfterAction()
        }
      } catch (error) { /* handled */ }
    }
  })
}

const closeOrder = (item) => {
  uni.showModal({
    title: '确认关闭',
    content: `确认关闭采购订单 ${item.order_no || ''} 吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const closeRes = await purchaseApi.closeOrder(item.id)
        if (closeRes.code === 0) {
          uni.showToast({ title: '已关闭', icon: 'success' })
          refreshAfterAction()
        }
      } catch (error) { /* handled */ }
    }
  })
}

const deleteOrder = (item) => {
  uni.showModal({
    title: '确认删除',
    content: `确认删除采购订单 ${item.order_no || ''} 吗？此操作不可恢复。`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const deleteRes = await purchaseApi.deleteOrder(item.id)
        if (deleteRes.code === 0) {
          uni.showToast({ title: '已删除', icon: 'success' })
          refreshAfterAction()
        }
      } catch (error) { /* handled */ }
    }
  })
}

const auditOrder = (item) => {
  uni.showModal({
    title: '确认审核通过',
    content: `确认审核通过采购订单 ${item.order_no || ''} 吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const auditRes = await purchaseApi.auditOrder(item.id, { approved: true })
        if (auditRes.code === 0) {
          uni.showToast({ title: '已通过', icon: 'success' })
          refreshAfterAction()
        }
      } catch (error) { /* handled */ }
    }
  })
}

const rejectOrder = (item) => {
  uni.showModal({
    title: '确认拒绝',
    content: `确认拒绝采购订单 ${item.order_no || ''} 吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const rejectRes = await purchaseApi.rejectOrder(item.id)
        if (rejectRes.code === 0) {
          uni.showToast({ title: '已拒绝', icon: 'success' })
          refreshAfterAction()
        }
      } catch (error) { /* handled */ }
    }
  })
}

const startPurchase = (item) => {
  uni.showModal({
    title: '确认开始采购',
    content: `确认开始采购订单 ${item.order_no || ''} 吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const startRes = await purchaseApi.startPurchase(item.id)
        if (startRes.code === 0) {
          uni.showToast({ title: '已开始采购', icon: 'success' })
          refreshAfterAction()
        }
      } catch (error) { /* handled */ }
    }
  })
}

const confirmPurchased = async (item) => {
  uni.showLoading({ title: '加载中...' })
  try {
    const detailRes = await purchaseApi.getOrderDetail(item.id)
    uni.hideLoading()
    if (detailRes.code !== 0) return
    const detail = detailRes.data || {}
    uni.showModal({
      title: '已采确认',
      content: `确认已采购订单 ${detail.order_no || ''} 吗？将使用原采购数量与单价。`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          const purchaseImageUrls = await chooseUploadImages()
          const items = (detail.items || []).map(it => ({
            id: it.id,
            final_quantity: Number(it.quantity || 0),
            final_price: Number(it.price || 0),
            final_tax: Number(it.tax || 0),
            final_amount: Number(it.amount || 0),
            final_remark: it.remark || ''
          }))
          const confirmRes = await purchaseApi.confirmPurchased(detail.id, {
            payment_method: detail.payment_method || '',
            admin_remark: detail.admin_remark || '',
            purchase_remark: detail.purchase_remark || '',
            purchase_image_urls: purchaseImageUrls,
            items
          })
          if (confirmRes.code === 0) {
            uni.showToast({ title: '已采确认成功', icon: 'success' })
            refreshAfterAction()
          }
        } catch (error) { /* handled */ }
      }
    })
  } catch (err) {
    uni.hideLoading()
  }
}

const chooseUploadImages = () => {
  return new Promise((resolve) => {
    uni.showModal({
      title: '上传已采图片',
      content: '是否上传已采确认图片？',
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

const inboundOrder = (item) => {
  uni.navigateTo({
    url: `/pages/purchase/inbound-edit?order_id=${item.id}`
  })
}

const returnOrder = (item) => {
  uni.navigateTo({
    url: `/pages/purchase/return-edit?order_id=${item.id}`
  })
}

const showMore = (item) => {
  const status = Number(item.status)
  const hasRemaining = Number(item.remaining_quantity || 0) > 0
  
  const menu = ['查看详情']
  const actions = []
  if (status === 0) actions.push({ command: 'edit', label: '编辑' }, { command: 'submit', label: '提交审核' }, { command: 'cancel', label: '取消' })
  if (status === 2) actions.push({ command: 'audit', label: '审核通过' }, { command: 'reject', label: '拒绝' }, { command: 'cancel', label: '取消' })
  if (status === 5) actions.push({ command: 'startPurchase', label: '开始采购' }, { command: 'cancel', label: '取消' }, { command: 'close', label: '关闭' })
  if (status === 1) actions.push({ command: 'confirmPurchased', label: '已采确认' }, { command: 'cancel', label: '取消' })
  if ([6, 7, 8].includes(status) && hasRemaining) actions.push({ command: 'inbound', label: '入库' }, { command: 'returnOrder', label: '退单' })
  if ([6, 7, 8].includes(status)) actions.push({ command: 'close', label: '关闭' })
  if ([3, 4].includes(status)) actions.push({ command: 'delete', label: '删除' })

  actions.forEach(act => {
    menu.push(act.label)
  })
  menu.push('复制单号')

  uni.showActionSheet({
    itemList: menu,
    success: ({ tapIndex }) => {
      const actionLabel = menu[tapIndex]
      if (actionLabel === '查看详情') {
        goDetail(item.id)
      } else if (actionLabel === '复制单号') {
        uni.setClipboardData({
          data: item.order_no || '',
          success: () => uni.showToast({ title: '复制成功', icon: 'none' })
        })
      } else {
        const clickedAction = actions.find(act => act.label === actionLabel)
        if (clickedAction) {
          const cmd = clickedAction.command
          if (cmd === 'edit') goEdit(item.id)
          else if (cmd === 'submit') submitOrder(item)
          else if (cmd === 'cancel') cancelOrder(item)
          else if (cmd === 'audit') auditOrder(item)
          else if (cmd === 'reject') rejectOrder(item)
          else if (cmd === 'startPurchase') startPurchase(item)
          else if (cmd === 'confirmPurchased') confirmPurchased(item)
          else if (cmd === 'inbound') inboundOrder(item)
          else if (cmd === 'returnOrder') returnOrder(item)
          else if (cmd === 'close') closeOrder(item)
          else if (cmd === 'delete') deleteOrder(item)
        }
      }
    }
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
