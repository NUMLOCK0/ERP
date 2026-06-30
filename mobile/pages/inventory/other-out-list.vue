<template>
  <view class="list-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999999"  />
        <input v-model="keyword" class="search-input" placeholder="搜索其他出库单号/备注" type="text" confirm-type="search" @confirm="reload" />
      </view>
      <view class="search-btn" @click="reload">搜索</view>
    </view>
    <scroll-view class="list-scroll" scroll-y refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scrolltolower="loadMore">
      <view class="scroll-inner">
        <view v-if="list.length > 0" class="card-list">
          <BusinessListItem
            v-for="item in list"
            :key="item.id"
            :meta="formatTime(item.created_at)"
            :title="item.other_out_no || item.outbound_no || item.out_no || '-'"
            tag-text="出库"
            tag-type="error"
            :expanded="!!expandedIds[item.id]"
            :show-toggle="true"
            @toggle="toggleCard(item.id)"
          >
            <template #summary>
              <view class="summary-grid">
                <view class="summary-item"><text class="summary-label">仓库</text><text class="summary-value">{{ item.warehouse_name || '-' }}</text></view>
                <view class="summary-item"><text class="summary-label">金额</text><text class="summary-value amount">¥{{ formatMoney(item.total_amount) }}</text></view>
                <view class="summary-item wide"><text class="summary-label">备注</text><text class="summary-value">{{ item.remark || '-' }}</text></view>
              </view>
            </template>
            <template #detail>
              <view class="detail-section">
                <text class="detail-title">其他出库信息</text>
                <view class="detail-grid">
                  <view class="detail-row"><text class="detail-label">单号</text><text class="detail-value">{{ item.other_out_no || item.outbound_no || item.out_no || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">仓库</text><text class="detail-value">{{ item.warehouse_name || '-' }}</text></view>
                  <view class="detail-row"><text class="detail-label">金额</text><text class="detail-value amount">¥{{ formatMoney(item.total_amount) }}</text></view>
                  <view class="detail-row"><text class="detail-label">创建时间</text><text class="detail-value">{{ formatTime(item.created_at) }}</text></view>
                  <view class="detail-row"><text class="detail-label">备注</text><text class="detail-value multiline">{{ item.remark || '-' }}</text></view>
                </view>
              </view>
            </template>
            <template #actions><view class="action-btn primary" @click="goEdit(item.id)">编辑</view></template>
          </BusinessListItem>
        </view>
        <view v-else-if="!loading" class="empty-state"><u-icon name="grid" size="60" color="#DCDFE6"  /><text class="empty-text">暂无其他出库单</text></view>
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
const keyword = ref(''), list = ref([]), page = ref(1), pageSize = 15, loading = ref(false), refreshing = ref(false), noMore = ref(false)
const expandedIds = reactive({})
async function fetchList(reset = false) { if (loading.value) return; loading.value = true; try { const res = await inventoryApi.getOtherOutList({ page: reset ? 1 : page.value, pageSize, keyword: keyword.value.trim() }); const data = res.data?.list || res.data || []; const total = res.data?.total ?? data.length; list.value = reset ? data : [...list.value, ...data]; page.value = reset ? 2 : page.value + 1; noMore.value = list.value.length >= total } finally { loading.value = false; refreshing.value = false } }
function reload() { page.value = 1; noMore.value = false; fetchList(true) }
function onRefresh() { refreshing.value = true; reload() }
function loadMore() { if (!loading.value && !noMore.value) fetchList() }
function formatMoney(value) { return Number(value || 0).toFixed(2) }
function formatTime(value) { if (!value) return '-'; const text = String(value); return text.includes('T') ? text.replace('T', ' ').slice(0, 19) : text.slice(0, 19) }
function toggleCard(id) { if (expandedIds[id]) delete expandedIds[id]; else expandedIds[id] = true }
function goCreate() { uni.navigateTo({ url: '/pages/inventory/other-out-edit' }) }
function goEdit(id) { uni.navigateTo({ url: `/pages/inventory/other-out-edit?id=${id}` }) }
onShow(() => { uni.hideTabBar(); fetchList(true) })
</script>

<style scoped lang="scss">
@import '../purchase/shared-list.scss';
</style>
