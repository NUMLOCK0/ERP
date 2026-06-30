<template>
  <view class="report-page">
    <scroll-view class="list-scroll" scroll-y @scrolltolower="loadMore">
      <view class="scroll-inner with-summary">
        <view v-if="list.length" class="card-list">
          <BusinessListItem
            v-for="item in list"
            :key="item.id"
            :meta="formatDate(item.created_at)"
            :title="item.inbound_no || '-'"
            :subtitle="item.product_name || '-'"
            tag-text="其他入库"
            tag-type="primary"
            :expanded="!!expandedIds[item.id]"
            :show-toggle="true"
            @toggle="toggleCard(item.id)"
          >
            <template #summary>
              <view class="summary-grid">
                <view class="summary-item wide"><text class="summary-label">供应商</text><text class="summary-value strong">{{ item.supplier_name || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">仓库</text><text class="summary-value">{{ item.warehouse_name || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">入库金额</text><text class="summary-value amount">￥{{ formatPrice(item.inbound_total_amount) }}</text></view>
              </view>
            </template>
            <template #detail>
              <view class="detail-section">
                <text class="detail-title">其他入库明细</text>
                <view class="detail-grid">
                  <view class="detail-row"><text class="detail-label">其他入库单号</text><text class="detail-value">{{ item.inbound_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">供应商</text><text class="detail-value">{{ item.supplier_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">入库仓库</text><text class="detail-value">{{ item.warehouse_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">产品名称</text><text class="detail-value">{{ item.product_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">产品编码</text><text class="detail-value">{{ item.product_code || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">产品规格</text><text class="detail-value">{{ item.product_spec || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">入库价格</text><text class="detail-value">￥{{ formatPrice(item.inbound_price) }}</text></view>
                  <view class="detail-row"><text class="detail-label">入库数量</text><text class="detail-value">{{ formatQuantity(item.inbound_quantity) }} {{ item.unit_name || '' }}</text></view>
                  <view class="detail-row"><text class="detail-label">入库总额</text><text class="detail-value amount">￥{{ formatPrice(item.inbound_total_amount) }}</text></view>
                  <view class="detail-row"><text class="detail-label">税额单价</text><text class="detail-value">￥{{ formatPrice(item.tax) }}</text></view>
                  <view class="detail-row"><text class="detail-label">税金总额</text><text class="detail-value">￥{{ formatPrice(item.tax_total) }}</text></view>
                  <view class="detail-row"><text class="detail-label">创建时间</text><text class="detail-value">{{ formatDate(item.created_at) }}</text></view>
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

    <ReportSummaryBar title="仓库入库汇总" :items="summaryItems" />
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

const toggleCard = (id) => {
  if (expandedIds[id]) delete expandedIds[id]
  else expandedIds[id] = true
}

const mapSummaryItems = (rows) => rows.map((item, index) => ({
  key: item.id || index,
  title: item.warehouse_name || `仓库 ${index + 1}`,
  stats: [
    { label: '产品总数', value: formatQuantity(item.product_total) },
    { label: '入库总数', value: formatQuantity(item.inbound_total) },
    { label: '入库总额', value: `￥${formatPrice(item.inbound_amount)}` },
    { label: '税金总额', value: `￥${formatPrice(item.tax_total)}` }
  ]
}))

const fetchSummary = async () => {
  try {
    const res = await reportApi.getOtherInboundWarehouseSummary()
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      summaryItems.value = mapSummaryItems(data)
    }
  } catch (error) {
    console.error(error)
  }
}

const fetchList = async (reset = false) => {
  if (loading.value) return
  loading.value = true
  try {
    const currentPage = reset ? 1 : page.value
    const res = await reportApi.getOtherInboundReport({ page: currentPage, pageSize: 20 })
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      const total = res.data?.total || data.length
      list.value = reset ? data : [...list.value, ...data]
      page.value = currentPage + 1
      noMore.value = list.value.length >= total
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
  fetchSummary()
})
</script>

<style scoped lang="scss">
@import './shared-report.scss';
</style>
