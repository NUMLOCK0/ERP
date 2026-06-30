<template>
  <view class="member-list">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999"></u-icon>
        <input class="search-input" v-model="keyword" placeholder="会员等级名称/描述" type="text" @confirm="onSearch" />
      </view>
      <view class="search-btn" @click="onSearch">搜索</view>
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
            class="member-card"
            v-for="item in list"
            :key="item.id"
            @click="goDetail(item.id)"
          >
            <view class="card-left">
              <image v-if="item.icon_url" :src="getAssetUrl(item.icon_url)" mode="aspectFill" class="level-icon" />
              <view v-else class="level-icon-placeholder">
                <u-icon name="integral" size="24" color="#E6A23C"></u-icon>
              </view>
              <view class="level-info">
                <text class="level-name">{{ item.name }}</text>
                <text class="level-desc" v-if="item.description">{{ item.description }}</text>
              </view>
            </view>
            <view class="card-right">
              <view class="status-tags">
                <uni-tag :text="'排序: ' + (item.sort_order ?? 0)" size="small" type="primary" style="margin-right: 8rpx;" />
                <uni-tag :text="item.status === 1 ? '启用' : '禁用'" size="small" :type="item.status === 1 ? 'success' : 'info'" />
              </view>
              <u-icon name="arrow-right" size="14" color="#C0C4CC"></u-icon>
            </view>
          </view>
        </view>
        <view v-else-if="!loading" class="empty-state">
          <u-icon name="account-fill" size="60" color="#DCDFE6"></u-icon>
          <text class="empty-text">暂无会员登记等级</text>
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
      <u-icon name="plus" size="24" color="#FFFFFF"></u-icon>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { supplierApi } from '@/api/supplier'

const keyword = ref('')
const list = ref([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)

const getAssetUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `http://localhost:3000${url}`
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
      name: keyword.value.trim() // Backend searches name
    }
    const res = await supplierApi.getMemberLevels(params)
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
  uni.navigateTo({ url: `/pages/supplier/member-detail?id=${id}` })
}

const goCreate = () => {
  uni.navigateTo({ url: `/pages/supplier/member-edit` })
}

onShow(() => {
  uni.hideTabBar()
  fetchList(true)
})
</script>

<style lang="scss" scoped>
.member-list {
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

/* 列表滚动 */
.list-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 16rpx 20rpx;
}

.member-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  padding: 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20rpx;

  .card-left {
    display: flex;
    align-items: center;
    gap: 20rpx;
    flex: 1;
    overflow: hidden;

    .level-icon {
      width: 80rpx;
      height: 80rpx;
      border-radius: 40rpx;
      background: #F5F7FA;
      flex-shrink: 0;
    }

    .level-icon-placeholder {
      width: 80rpx;
      height: 80rpx;
      border-radius: 40rpx;
      background: #FFF8E6;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .level-info {
      display: flex;
      flex-direction: column;
      gap: 6rpx;
      overflow: hidden;

      .level-name {
        font-size: 28rpx;
        font-weight: 700;
        color: #303133;
      }
      .level-desc {
        font-size: 22rpx;
        color: #909399;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .card-right {
    display: flex;
    align-items: center;
    gap: 12rpx;
    flex-shrink: 0;

    .status-tags {
      display: flex;
      align-items: center;
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
