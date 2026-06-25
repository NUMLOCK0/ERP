<template>
  <view class="company-list">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="20" color="#999"></uni-icons>
        <input class="search-input" v-model="keyword" placeholder="企业名称/联系人/电话" type="text" @confirm="onSearch" />
      </view>
      <view class="search-btn" @click="onSearch">搜索</view>
    </view>

    <!-- Tab 切换 (企业类型) -->
    <view class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
        <view v-if="activeTab === tab.value" class="tab-line"></view>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="scroll-inner">
        <view v-if="list.length > 0">
          <view
            class="company-card"
            v-for="item in list"
            :key="item.id"
            @click="goDetail(item.id)"
          >
            <view class="card-header">
              <text class="company-name">{{ item.name }}</text>
              <view class="header-tags">
                <uni-tag :text="typeMap[item.type] || item.type" size="small" :type="getTypeTagColor(item.type)" style="margin-right: 8rpx;" />
                <uni-tag :text="item.status === 1 ? '启用' : '禁用'" size="small" :type="item.status === 1 ? 'success' : 'info'" />
              </view>
            </view>
            <view class="card-body">
              <view class="body-item">
                <text class="body-label">联系人</text>
                <text class="body-value">{{ item.contact || '-' }}</text>
              </view>
              <view class="body-item">
                <text class="body-label">电话</text>
                <text class="body-value">{{ item.phone || '-' }}</text>
              </view>
              <view class="body-item" v-if="item.email">
                <text class="body-label">邮箱</text>
                <text class="body-value">{{ item.email }}</text>
              </view>
              <view class="body-item address-item" v-if="item.address">
                <text class="body-label">地址</text>
                <text class="body-value text-ellipsis">{{ item.address }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else-if="!loading" class="empty-state">
          <uni-icons type="shop" size="60" color="#DCDFE6"></uni-icons>
          <text class="empty-text">暂无企业数据</text>
        </view>

        <view v-if="loading" class="loading-more">
          <uni-load-more status="loading"></uni-load-more>
        </view>
        <view v-if="noMore && list.length > 0" class="loading-more">
          <uni-load-more status="noMore"></uni-load-more>
        </view>
      </view>
    </scroll-view>

    <!-- 浮动新增按钮 -->
    <view class="floating-btn" @click="goCreate">
      <uni-icons type="plus" size="24" color="#FFFFFF"></uni-icons>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { supplierApi } from '@/api/supplier'

const keyword = ref('')
const activeTab = ref('')
const list = ref([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)

const tabs = [
  { label: '全部', value: '' },
  { label: '供应商', value: 'supplier' },
  { label: '客户', value: 'customer' },
  { label: '双重', value: 'both' }
]

const typeMap = {
  supplier: '供应商',
  customer: '客户',
  both: '双重'
}

const getTypeTagColor = (type) => {
  const map = {
    supplier: 'success',
    customer: 'warning',
    both: 'primary'
  }
  return map[type] || 'info'
}

const switchTab = (val) => {
  activeTab.value = val
  onSearch()
}

const onSearch = () => {
  page.value = 1
  noMore.value = false
  list.value = []
  fetchList(true)
}

const fetchList = async (isRefresh = false) => {
  if (loading.value) return
  loading.value = true

  try {
    const params = {
      page: isRefresh ? 1 : page.value,
      pageSize,
      keyword: keyword.value.trim(),
      type: activeTab.value
    }
    const res = await supplierApi.getSuppliers(params)
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      total.value = res.data?.total || data.length
      if (isRefresh) {
        list.value = data
        page.value = 2
      } else {
        list.value = [...list.value, ...data]
        page.value++
      }
      noMore.value = list.value.length >= total.value
    }
  } catch (e) {
    // handled
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
  if (!noMore.value && !loading.value) {
    fetchList()
  }
}

const goDetail = (id) => {
  uni.navigateTo({ url: `/pages/supplier/company-detail?id=${id}` })
}

const goCreate = () => {
  uni.navigateTo({ url: `/pages/supplier/company-edit` })
}

onShow(() => {
  uni.hideTabBar()
  fetchList(true)
})
</script>

<style lang="scss" scoped>
.company-list {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
}

/* 搜索栏 */
.search-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #FFFFFF;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #F2F4F6;
  border-radius: 12rpx;
  padding: 0 16rpx;
  height: 72rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  margin-left: 10rpx;
}

.search-btn {
  flex-shrink: 0;
  background: #1890FF;
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 600;
  padding: 0 24rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 12rpx;
  white-space: nowrap;

  &:active {
    opacity: 0.85;
  }
}

/* Tab 栏 */
.tab-bar {
  flex-shrink: 0;
  display: flex;
  background: #FFFFFF;
  padding: 0 10rpx;
  border-bottom: 1rpx solid #F2F6FC;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 26rpx;
  color: #606266;
  position: relative;
  transition: all 0.2s ease;

  &.active {
    color: #1890FF;
    font-weight: 600;
  }

  .tab-line {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 32rpx;
    height: 4rpx;
    background: #1890FF;
    border-radius: 2rpx;
  }
}

/* 列表滚动 */
.list-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 16rpx 20rpx;
}

.company-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  overflow: hidden;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 24rpx;
    border-bottom: 1rpx solid #F2F6FC;

    .company-name {
      font-size: 28rpx;
      font-weight: 700;
      color: #303133;
    }

    .header-tags {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
  }

  .card-body {
    padding: 16rpx 24rpx;

    .body-item {
      display: flex;
      justify-content: space-between;
      padding: 8rpx 0;

      .body-label {
        font-size: 24rpx;
        color: #909399;
      }
      .body-value {
        font-size: 24rpx;
        color: #303133;
        font-weight: 500;
      }
      
      &.address-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 4rpx;
        
        .body-value {
          text-align: left;
          color: #606266;
        }
      }
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;

  .empty-text {
    font-size: 26rpx;
    color: #C0C4CC;
    margin-top: 16rpx;
  }
}

.loading-more {
  padding: 20rpx 0;
}

/* 浮动按钮 */
.floating-btn {
  position: fixed;
  right: 40rpx;
  bottom: 40rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #1890FF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(24, 144, 255, 0.4);
  z-index: 99;

  &:active {
    opacity: 0.85;
  }
}
</style>
