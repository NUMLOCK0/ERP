<template>
  <view class="report-page">
    <scroll-view class="list-scroll" scroll-y @scrolltolower="loadMore">
      <view class="scroll-inner with-summary">
        <view v-if="list.length" class="card-list">
          <BusinessListItem
            v-for="item in list"
            :key="item.id"
            :meta="formatDate(item.updated_at || item.created_at)"
            :title="item.product_name || '-'"
            :subtitle="item.code || '-'"
            :tag-text="stockStatusText(item.quantity || 0)"
            :tag-type="stockStatusType(item.quantity || 0)"
            :expanded="!!expandedIds[item.id]"
            :show-toggle="true"
            @toggle="toggleCard(item.id)"
          >
            <template #summary>
              <view class="summary-grid">
                <view class="summary-item"><text class="summary-label">仓库</text><text class="summary-value">{{ item.warehouse_name || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">库存数量</text><text class="summary-value strong">{{ formatQuantity(item.quantity) }}</text></view>
                <view class="summary-item"><text class="summary-label">规格</text><text class="summary-value">{{ item.spec || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">销售单价</text><text class="summary-value amount">￥{{ formatPrice(item.sale_price) }}</text></view>
              </view>
            </template>
            <template #detail>
              <view class="detail-section">
                <text class="detail-title">库存明细</text>
                <view class="detail-grid">
                  <view class="detail-row"><text class="detail-label">产品名称</text><text class="detail-value">{{ item.product_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">产品编码</text><text class="detail-value">{{ item.code || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">规格</text><text class="detail-value">{{ item.spec || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">仓库</text><text class="detail-value">{{ item.warehouse_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">库存数量</text><text class="detail-value font-bold">{{ formatQuantity(item.quantity) }}</text></view>
                  <view class="detail-row"><text class="detail-label">采购均价</text><text class="detail-value">￥{{ formatPrice(item.cost_price) }}</text></view>
                  <view class="detail-row"><text class="detail-label">销售价格</text><text class="detail-value">￥{{ formatPrice(item.sale_price) }}</text></view>
                  <view class="detail-row"><text class="detail-label">库存估值</text><text class="detail-value amount">￥{{ formatPrice(Number(item.quantity || 0) * Number(item.cost_price || 0)) }}</text></view>
                  <view class="detail-row"><text class="detail-label">更新时间</text><text class="detail-value">{{ formatDate(item.updated_at) }}</text></view>
                </view>
              </view>
            </template>
          </BusinessListItem>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <u-icon name="list" size="60" color="#DCDFE6"  />
          <text class="empty-text">暂无报表数据</text>
        </view>

        <view v-if="loading" class="loading-more"><uni-load-more status="loading" /></view>
        <view v-if="noMore && list.length > 0" class="loading-more"><uni-load-more status="noMore" /></view>
      </view>
    </scroll-view>

    <ReportSummaryBar title="仓库库存汇总" :items="summaryItems" />
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import BusinessListItem from '@/components/BusinessListItem.vue'
import ReportSummaryBar from '@/components/ReportSummaryBar.vue'
import { reportApi } from '@/api/report'

const list = ref([])
const summaryItems = ref([])
const page = ref(1)
const loading = ref(false)
const noMore = ref(false)
const expandedIds = reactive({})

const formatPrice = (val) => (val === null || val === undefined || val === '' ? '0.00' : Number(val).toFixed(2))
const formatQuantity = (val) => (val === null || val === undefined || val === '' ? '0' : Number(val))
const formatDate = (val) => {
  if (!val) return '--'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return val
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const stockStatusText = (qty) => {
  const value = Number(qty || 0)
  if (value <= 0) return '缺货'
  if (value < 10) return '偏低'
  return '充足'
}

const stockStatusType = (qty) => {
  const value = Number(qty || 0)
  if (value <= 0) return 'error'
  if (value < 10) return 'warning'
  return 'success'
}

const toggleCard = (id) => {
  if (expandedIds[id]) delete expandedIds[id]
  else expandedIds[id] = true
}

const computeSummary = (listData) => {
  const warehouseMap = {}
  listData.forEach(item => {
    const wName = item.warehouse_name || '未分配仓库'
    if (!warehouseMap[wName]) {
      warehouseMap[wName] = {
        product_total: 0,
        quantity_total: 0,
        amount_total: 0
      }
    }
    warehouseMap[wName].product_total += 1
    warehouseMap[wName].quantity_total += Number(item.quantity || 0)
    warehouseMap[wName].amount_total += Number(item.quantity || 0) * Number(item.cost_price || 0)
  })
  
  return Object.entries(warehouseMap).map(([name, data], idx) => ({
    key: idx,
    title: name,
    stats: [
      { label: '产品种类', value: formatQuantity(data.product_total) },
      { label: '库存总量', value: formatQuantity(data.quantity_total) },
      { label: '库存估值', value: `￥${formatPrice(data.amount_total)}` }
    ]
  }))
}

const fetchList = async (reset = false) => {
  if (loading.value) return
  loading.value = true
  try {
    const currentPage = reset ? 1 : page.value
    const res = await reportApi.getProductStock({ page: currentPage, pageSize: 20 })
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      const total = res.data?.total || data.length
      list.value = reset ? data : [...list.value, ...data]
      page.value = currentPage + 1
      noMore.value = list.value.length >= total
      summaryItems.value = computeSummary(list.value)
    }
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (!noMore.value && !loading.value) fetchList()
}

onShow(() => {
  page.value = 1
  noMore.value = false
  fetchList(true)
})
</script>

<style scoped lang="scss">
@import './shared-report.scss';
</style>
