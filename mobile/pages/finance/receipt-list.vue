<template>
  <view class="list-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999999"  />
        <input v-model="keyword" class="search-input" placeholder="搜索收款单号/订单号/客户" type="text" confirm-type="search" @confirm="onSearch" />
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
            :title="item.receipt_no || '-'"
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
                <view class="summary-item"><text class="summary-label">收款金额</text><text class="summary-value amount">¥{{ formatPrice(item.amount) }}</text></view>
                <view class="summary-item"><text class="summary-label">应收金额</text><text class="summary-value">¥{{ formatPrice(item.receivable_amount || item.should_amount) }}</text></view>
                <view class="summary-item"><text class="summary-label">收款方式</text><text class="summary-value">{{ payMethodMap[item.pay_method] || item.pay_method || '-' }}</text></view>
              </view>
            </template>
            <template #detail>
              <view class="detail-section">
                <text class="detail-title">收款信息</text>
                <view class="detail-grid">
                  <view class="detail-row"><text class="detail-label">收款单号</text><text class="detail-value">{{ item.receipt_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">状态</text><text class="detail-value">{{ statusMap[item.status] || '未知' }}</text></view>
                  <view class="detail-row"><text class="detail-label">客户</text><text class="detail-value">{{ item.customer_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">关联销售单</text><text class="detail-value">{{ item.order_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">收款金额</text><text class="detail-value amount">¥{{ formatPrice(item.amount) }}</text></view>
                  <view class="detail-row"><text class="detail-label">应收金额</text><text class="detail-value">¥{{ formatPrice(item.receivable_amount || item.should_amount) }}</text></view>
                  <view class="detail-row"><text class="detail-label">收款方式</text><text class="detail-value">{{ payMethodMap[item.pay_method] || item.pay_method || '-' }}</text></view>
                </view>
              </view>
            </template>
            <template #actions><view class="action-btn primary" @click="goDetail(item.id)">详情</view></template>
          </BusinessListItem>
        </view>
        <view v-else-if="!loading" class="empty-state"><u-icon name="rmb-circle" size="60" color="#DCDFE6"  /><text class="empty-text">暂无销售收款单</text></view>
        <view v-if="loading" class="loading-more"><uni-load-more status="loading" /></view>
        <view v-if="noMore && list.length > 0" class="loading-more"><uni-load-more status="noMore" /></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { financeApi } from '@/api/finance'
import BusinessListItem from '@/components/BusinessListItem.vue'
const keyword = ref(''), activeTab = ref(''), list = ref([]), page = ref(1), pageSize = 10, total = ref(0), loading = ref(false), refreshing = ref(false), noMore = ref(false)
const expandedIds = reactive({})
const tabs = [{ label: '全部', value: '' }, { label: '待收款', value: '0' }, { label: '收款中', value: '1' }, { label: '已收款', value: '2' }, { label: '已关闭', value: '3' }]
const statusMap = { 0: '待收款', 1: '收款中', 2: '已收款', 3: '已关闭' }
const payMethodMap = { cash: '现金', bank: '银行转账', alipay: '支付宝', wechat: '微信支付', bank_transfer: '银行转账' }
const getStatusType = (s) => ({ 0: 'warning', 1: 'primary', 2: 'success', 3: 'error' }[s] || 'info')
const formatPrice = (v) => (v === null || v === undefined || v === '' ? '0.00' : Number(v).toFixed(2))
const formatDate = (v) => { if (!v) return ''; const d = new Date(v); if (isNaN(d.getTime())) return v; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
const toggleCard = (id) => { if (expandedIds[id]) delete expandedIds[id]; else expandedIds[id] = true }
const switchTab = (v) => { activeTab.value = v; onSearch() }
const onSearch = () => { page.value = 1; noMore.value = false; list.value = []; fetchList(true) }
const fetchList = async (r = false) => { if (loading.value) return; loading.value = true; try { const params = { page: r ? 1 : page.value, pageSize, keyword: keyword.value.trim(), status: activeTab.value }; const res = await financeApi.getReceipts(params); if (res.code === 0) { const data = res.data?.list || res.data || []; total.value = res.data?.total || data.length; if (r) { list.value = data; page.value = 2 } else { list.value = [...list.value, ...data]; page.value += 1 } noMore.value = list.value.length >= total.value } } finally { loading.value = false; refreshing.value = false } }
const onRefresh = () => { refreshing.value = true; page.value = 1; noMore.value = false; fetchList(true) }
const loadMore = () => { if (!noMore.value && !loading.value) fetchList() }
const goDetail = (id) => uni.navigateTo({ url: `/pages/finance/receipt-detail?id=${id}` })
onShow(() => { uni.hideTabBar(); fetchList(true) })
</script>

<style scoped lang="scss">
@import '../purchase/shared-list.scss';
</style>
