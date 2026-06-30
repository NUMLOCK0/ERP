<template>
  <view class="list-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999999"  />
        <input v-model="keyword" class="search-input" placeholder="搜索盘点单号/盘点人" type="text" confirm-type="search" @confirm="reload" />
      </view>
      <view class="search-btn" @click="reload">搜索</view>
    </view>

    <view class="tab-bar">
      <view v-for="tab in tabs" :key="tab.value" class="tab-item" :class="{ active: activeTab === tab.value }" @click="switchTab(tab.value)">
        <text>{{ tab.label }}</text>
        <view v-if="activeTab === tab.value" class="tab-line" />
      </view>
    </view>

    <scroll-view class="list-scroll" scroll-y refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scrolltolower="loadMore">
      <view class="scroll-inner">
        <view v-if="list.length > 0" class="card-list">
          <BusinessListItem
            v-for="item in list"
            :key="item.id"
            :meta="'创建: ' + formatTime(item.created_at)"
            :title="item.check_no || '-'"
            :tag-text="statusText(item.status)"
            :tag-type="statusType(item.status)"
            :expanded="!!expandedIds[item.id]"
            :show-toggle="true"
            @toggle="toggleCard(item.id)"
          >
            <template #summary>
              <view class="summary-grid">
                <view class="summary-item"><text class="summary-label">仓库</text><text class="summary-value">{{ item.warehouse_name || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">盘点人</text><text class="summary-value">{{ item.checker_name || item.creator_name || '-' }}</text></view>
                <view class="summary-item wide"><text class="summary-label">盘点时间</text><text class="summary-value">{{ formatTime(item.check_time || item.checked_at) }}</text></view>
              </view>
            </template>
            <template #detail>
              <view class="detail-section">
                <text class="detail-title">盘点信息</text>
                <view class="detail-grid">
                  <view class="detail-row"><text class="detail-label">盘点单号</text><text class="detail-value">{{ item.check_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">状态</text><text class="detail-value">{{ statusText(item.status) }}</text></view>
                  <view class="detail-row"><text class="detail-label">仓库</text><text class="detail-value">{{ item.warehouse_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">盘点人</text><text class="detail-value">{{ item.checker_name || item.creator_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">盘点时间</text><text class="detail-value">{{ formatTime(item.check_time || item.checked_at) }}</text></view>
                  <view class="detail-row"><text class="detail-label">创建时间</text><text class="detail-value">{{ formatTime(item.created_at) }}</text></view>
                </view>
              </view>
            </template>
            <template #actions><view class="action-btn primary" @click="detail(item)">详情</view></template>
          </BusinessListItem>
        </view>
        <view v-else-if="!loading" class="empty-state"><u-icon name="edit-pen" size="60" color="#DCDFE6"  /><text class="empty-text">暂无盘点单</text></view>
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
import { inventoryApi } from '@/api/inventory'
import BusinessListItem from '@/components/BusinessListItem.vue'
const keyword = ref(''), activeTab = ref(''), list = ref([]), page = ref(1), pageSize = 10, loading = ref(false), refreshing = ref(false), noMore = ref(false)
const expandedIds = reactive({})
const tabs = [{ label: '全部', value: '' }, { label: '待盘点', value: '0' }, { label: '审核中', value: '4' }, { label: '已完成', value: '1' }]
async function fetchList(reset = false) { if (loading.value) return; loading.value = true; try { const params = { page: reset ? 1 : page.value, pageSize, keyword: keyword.value.trim() }; if (activeTab.value !== '') params.status = Number(activeTab.value); const res = await inventoryApi.getCheckList(params); const data = res.data?.list || res.data || []; const total = res.data?.total ?? data.length; list.value = reset ? data : [...list.value, ...data]; page.value = reset ? 2 : page.value + 1; noMore.value = list.value.length >= total } finally { loading.value = false; refreshing.value = false } }
function reload() { page.value = 1; noMore.value = false; fetchList(true) }
function onRefresh() { refreshing.value = true; reload() }
function loadMore() { if (!loading.value && !noMore.value) fetchList() }
function switchTab(value) { activeTab.value = value; reload() }
function statusText(status) { return ({ 0: '待盘点', 1: '已完成', 2: '已取消', 3: '已关闭', 4: '审核中' })[Number(status)] || '未知' }
function statusType(status) { return ({ 0: 'warning', 1: 'success', 2: 'error', 3: 'info', 4: 'primary' })[Number(status)] || 'info' }
function formatTime(value) { if (!value) return '-'; const text = String(value); return text.includes('T') ? text.replace('T', ' ').slice(0, 19) : text.slice(0, 19) }
function toggleCard(id) { if (expandedIds[id]) delete expandedIds[id]; else expandedIds[id] = true }
function detail(item) { if (!item?.id) return; uni.navigateTo({ url: `/pages/inventory/check-edit?id=${item.id}` }) }
function goCreate() { uni.navigateTo({ url: '/pages/inventory/check-edit' }) }
onShow(() => { uni.hideTabBar(); fetchList(true) })
</script>

<style scoped lang="scss">
@import '../purchase/shared-list.scss';
</style>
