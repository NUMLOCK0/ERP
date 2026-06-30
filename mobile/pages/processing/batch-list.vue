<template>
  <view class="list-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999999"  />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索批次号/原包货/供应商/备注"
          type="text"
          confirm-type="search"
          @confirm="onSearch"
        />
      </view>
      <view class="search-btn" @click="onSearch">搜索</view>
    </view>

    <!-- Tab Bar for stages/status -->
    <view class="tab-bar">
      <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
        <view class="tab-scroll-inner">
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
      </scroll-view>
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
            :meta="formatDate(item.created_at) || '--'"
            :title="item.batch_no || '-'"
            :tag-text="statusMap[item.status] || '未知'"
            :tag-type="getStatusType(item.status)"
            :expanded="!!expandedIds[item.id]"
            :show-toggle="true"
            @toggle="toggleCard(item.id)"
          >
            <template #summary>
              <view class="summary-grid">
                <view class="summary-item wide">
                  <text class="summary-label">采购原包货</text>
                  <text class="summary-value strong">{{ item.source_product_name || '-' }}</text>
                </view>
                <view class="summary-item">
                  <text class="summary-label">投入数量</text>
                  <text class="summary-value">{{ formatQuantity(item.source_quantity) }} {{ item.source_unit_name || '' }}</text>
                </view>
                <view class="summary-item">
                  <text class="summary-label">生成产品</text>
                  <text class="summary-value">{{ formatQuantity(item.generated_quantity) }}</text>
                </view>
                <view class="summary-item">
                  <text class="summary-label">产出金额</text>
                  <text class="summary-value amount">￥{{ formatPrice(item.generated_amount) }}</text>
                </view>
              </view>
            </template>

            <template #detail>
              <view class="detail-section">
                <text class="detail-title">批次信息</text>
                <view class="detail-grid">
                  <view class="detail-row"><text class="detail-label">加工批次</text><text class="detail-value">{{ item.batch_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">状态</text><text class="detail-value">{{ statusMap[item.status] || '未知' }}</text></view>
                  <view class="detail-row"><text class="detail-label">当前环节</text><text class="detail-value">{{ currentStageText(item) }}</text></view>
                  <view class="detail-row"><text class="detail-label">原料仓</text><text class="detail-value">{{ item.source_warehouse_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">产品入库仓</text><text class="detail-value">{{ item.target_warehouse_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">采购单价</text><text class="detail-value">￥{{ formatPrice(item.source_unit_price) }}</text></view>
                  <view class="detail-row"><text class="detail-label">创建时间</text><text class="detail-value">{{ formatDate(item.created_at) || '--' }}</text></view>
                  <view v-if="item.supplier_name" class="detail-row"><text class="detail-label">供应商</text><text class="detail-value">{{ item.supplier_name }}</text></view>
                  <view v-if="item.remark" class="detail-row"><text class="detail-label">加工备注</text><text class="detail-value multiline">{{ item.remark }}</text></view>
                </view>
              </view>
            </template>

            <template #actions>
              <view class="action-btn primary" @click="goDetail(item.id)">详情</view>
              <view class="action-btn outline" @click="showMore(item)">更多</view>
            </template>
          </BusinessListItem>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <u-icon name="reload" size="60" color="#DCDFE6"  />
          <text class="empty-text">暂无加工批次</text>
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
import { processingApi } from '@/api/processing'
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
  { label: '待开工', value: '0' },
  { label: '加工中', value: '1' },
  { label: '待入库', value: '4' },
  { label: '已入库', value: '2' },
  { label: '已取消', value: '3' },
  { label: '已关闭', value: '5' }
]

const statusMap = {
  0: '待开工',
  1: '加工中',
  2: '已入库',
  3: '已取消',
  4: '待入库',
  5: '已关闭'
}

const getStatusType = (status) => {
  const map = {
    0: 'info',
    1: 'warning',
    2: 'success',
    3: 'error',
    4: 'primary',
    5: 'info'
  }
  return map[status] || 'info'
}

const formatPrice = (val) => {
  if (val === null || val === undefined || val === '') return '0.00'
  return Number(val).toFixed(2)
}

const formatQuantity = (val) => {
  const quantity = Number(val || 0)
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)))
}

const formatDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return val
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function currentStageText(row) {
  const status = Number(row.status)
  if (status === 0) return '待开工'
  if (status === 4) return '产品入库'
  if (status === 2) return '已入库'
  if (status === 3) return '已取消'
  if (status === 5) return '已关闭'
  if (!Number(row.total_stage_count || 0)) return '待添加步骤'
  return row.current_stage_name || '加工完成'
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
    const res = await processingApi.getOrders(params)
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
    console.error(error)
  } finally {
    loading.value = false
  }
}

const onRefresh = async () => {
  refreshing.value = true
  await fetchList(true)
  refreshing.value = false
}

const loadMore = () => {
  if (!noMore.value && !loading.value) {
    fetchList()
  }
}

const goDetail = (id) => {
  uni.navigateTo({
    url: `/pages/processing/batch-detail?id=${id}`
  })
}

const goCreate = () => {
  uni.navigateTo({
    url: '/pages/processing/batch-edit'
  })
}

const handleStart = async (item) => {
  uni.showModal({
    title: '提示',
    content: '开工后将从原料仓扣减原包货库存，确认继续？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.startOrder(item.id)
          if (apiRes.code === 0) {
            uni.showToast({ title: '已开工' })
            resetAndFetch()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const handleInbound = async (item) => {
  uni.showModal({
    title: '提示',
    content: '将所有等级成品和各工序下料按登记数量、价格入库，确认继续？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.inboundOrder(item.id)
          if (apiRes.code === 0) {
            uni.showToast({ title: '已入库' })
            resetAndFetch()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const handleCancel = async (item) => {
  uni.showModal({
    title: '提示',
    content: '确认取消该待开工批次？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.cancelOrder(item.id)
          if (apiRes.code === 0) {
            uni.showToast({ title: '已取消' })
            resetAndFetch()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const handleClose = async (item) => {
  uni.showModal({
    title: '提示',
    content: `确认关闭加工批次 ${item.batch_no}？关闭后将把原包货数量 ${formatQuantity(item.source_quantity)} 退回原料仓，工序数据将锁定。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.closeOrder(item.id)
          if (apiRes.code === 0) {
            uni.showToast({ title: '已关闭' })
            resetAndFetch()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const handleDelete = async (item) => {
  uni.showModal({
    title: '提示',
    content: `删除后无法恢复，确认删除加工批次 ${item.batch_no}？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.deleteOrder(item.id)
          if (apiRes.code === 0) {
            uni.showToast({ title: '已删除' })
            resetAndFetch()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const showMore = (item) => {
  const status = Number(item.status)
  const menu = ['查看详情']
  const actions = []
  
  if (status === 0) {
    actions.push({ command: 'start', label: '开工' })
    actions.push({ command: 'cancel', label: '取消' })
  }
  if (status === 4) {
    actions.push({ command: 'inbound', label: '入库' })
  }
  if (status === 1) {
    actions.push({ command: 'close', label: '关闭' })
  }
  if (status === 3) {
    actions.push({ command: 'delete', label: '删除' })
  }

  actions.forEach(act => {
    menu.push(act.label)
  })
  menu.push('复制批次号')

  uni.showActionSheet({
    itemList: menu,
    success: ({ tapIndex }) => {
      const actionLabel = menu[tapIndex]
      if (actionLabel === '查看详情') {
        goDetail(item.id)
      } else if (actionLabel === '复制批次号') {
        uni.setClipboardData({
          data: item.batch_no || '',
          success: () => uni.showToast({ title: '复制成功', icon: 'none' })
        })
      } else {
        const clickedAction = actions.find(act => act.label === actionLabel)
        if (clickedAction) {
          const cmd = clickedAction.command
          if (cmd === 'start') handleStart(item)
          else if (cmd === 'inbound') handleInbound(item)
          else if (cmd === 'cancel') handleCancel(item)
          else if (cmd === 'close') handleClose(item)
          else if (cmd === 'delete') handleDelete(item)
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
@import '@/pages/purchase/shared-list.scss';

.tab-scroll {
  width: 100%;
  white-space: nowrap;
  
  .tab-scroll-inner {
    display: inline-flex;
    padding: 0 10rpx;
    
    .tab-item {
      min-width: 120rpx;
      padding: 24rpx 15rpx;
    }
  }
}
</style>
