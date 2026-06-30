<template>
  <view class="list-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999999"  />
        <input v-model="keyword" class="search-input" placeholder="搜索付款单号/采购单号/供应商" type="text" confirm-type="search" @confirm="onSearch" />
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
            :title="item.payment_no || '-'"
            :tag-text="statusMap[item.status] || '未知'"
            :tag-type="getStatusType(item.status)"
            :expanded="!!expandedIds[item.id]"
            :show-toggle="true"
            @toggle="toggleCard(item.id)"
          >
            <template #summary>
              <view class="summary-grid">
                <view class="summary-item wide"><text class="summary-label">供应商</text><text class="summary-value strong">{{ item.supplier_name || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">关联采购单</text><text class="summary-value">{{ item.order_no || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">已付金额</text><text class="summary-value amount">¥{{ formatPrice(item.amount) }}</text></view>
                <view class="summary-item"><text class="summary-label">应付总额</text><text class="summary-value">¥{{ formatPrice(item.receivable_total_amount ?? item.should_amount) }}</text></view>
                <view class="summary-item"><text class="summary-label">付款方式</text><text class="summary-value">{{ item.pay_method || '-' }}</text></view>
              </view>
            </template>
            <template #detail>
              <view class="detail-section">
                <text class="detail-title">付款信息</text>
                <view class="detail-grid">
                  <view class="detail-row"><text class="detail-label">付款单号</text><text class="detail-value">{{ item.payment_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">状态</text><text class="detail-value">{{ statusMap[item.status] || '未知' }}</text></view>
                  <view class="detail-row"><text class="detail-label">关联采购单</text><text class="detail-value">{{ item.order_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">供应商</text><text class="detail-value">{{ item.supplier_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">已付金额</text><text class="detail-value amount">¥{{ formatPrice(item.amount) }}</text></view>
                  <view class="detail-row"><text class="detail-label">应付总额</text><text class="detail-value">¥{{ formatPrice(item.receivable_total_amount ?? item.should_amount) }}</text></view>
                  <view class="detail-row"><text class="detail-label">付款方式</text><text class="detail-value">{{ item.pay_method || '-' }}</text></view>
                  <view v-if="item.remark" class="detail-row"><text class="detail-label">备注</text><text class="detail-value multiline">{{ item.remark }}</text></view>
                </view>
              </view>
            </template>
            <template #actions><view class="action-btn primary" @click="goDetail(item.id)">详情</view></template>
          </BusinessListItem>
        </view>
        <view v-else-if="!loading" class="empty-state"><u-icon name="rmb-circle" size="60" color="#DCDFE6"  /><text class="empty-text">暂无采购付款单</text></view>
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
import { financeApi } from '@/api/finance'
import BusinessListItem from '@/components/BusinessListItem.vue'
const keyword = ref(''), activeTab = ref(''), list = ref([]), page = ref(1), pageSize = 10, total = ref(0), loading = ref(false), refreshing = ref(false), noMore = ref(false)
const expandedIds = reactive({})
const tabs = [{ label: '全部', value: '' }, { label: '待付款', value: '0' }, { label: '付款中', value: '1' }, { label: '已付款', value: '2' }, { label: '已关闭', value: '3' }]
const statusMap = { 0: '待付款', 1: '付款中', 2: '已付款', 3: '已关闭' }
const getStatusType = (s) => ({ 0: 'warning', 1: 'primary', 2: 'success', 3: 'info' }[s] || 'info')
const formatPrice = (v) => (v === null || v === undefined || v === '' ? '0.00' : Number(v).toFixed(2))
const formatDate = (v) => { if (!v) return ''; const d = new Date(v); if (isNaN(d.getTime())) return v; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
const toggleCard = (id) => { if (expandedIds[id]) delete expandedIds[id]; else expandedIds[id] = true }
const switchTab = (v) => { activeTab.value = v; page.value = 1; noMore.value = false; list.value = []; fetchList(true) }
const onSearch = () => { page.value = 1; noMore.value = false; list.value = []; fetchList(true) }
const fetchList = async (r = false) => { if (loading.value) return; loading.value = true; try { const params = { page: r ? 1 : page.value, pageSize, keyword: keyword.value.trim() }; if (activeTab.value !== '') params.status = Number(activeTab.value); const res = await financeApi.getPayments(params); if (res.code === 0) { const data = res.data?.list || res.data || []; total.value = res.data?.total || data.length; if (r) { list.value = data; page.value = 2 } else { list.value = [...list.value, ...data]; page.value += 1 } noMore.value = list.value.length >= total.value } } finally { loading.value = false; refreshing.value = false } }
const onRefresh = () => { refreshing.value = true; page.value = 1; noMore.value = false; fetchList(true) }
const loadMore = () => { if (!noMore.value && !loading.value) fetchList() }
const goDetail = (id) => uni.navigateTo({ url: `/pages/finance/payment-detail?id=${id}` })
const goCreate = () => uni.navigateTo({ url: '/pages/finance/payment-edit' })
onShow(() => { uni.hideTabBar(); fetchList(true) })
</script>

<style scoped lang="scss">
@import '../purchase/shared-list.scss';
</style>
