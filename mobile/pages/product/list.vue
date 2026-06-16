<template>
  <view class="product-list-page" @touchmove.stop.prevent="() => {}">
    <!-- 搜索 & 筛选栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="20" color="#999"></uni-icons>
        <input class="search-input" v-model="keyword" placeholder="请输入" type="text" @confirm="onSearch" />
      </view>
      <view class="category-picker" @click="showCategoryPicker = true">
        <text class="category-text">{{ categoryLabel }}</text>
        <uni-icons type="arrowdown" size="12" color="#999"></uni-icons>
      </view>
      <view class="search-btn" @click="onSearch">搜索</view>
    </view>

    <!-- 分类选择器弹窗 -->
    <view v-if="showCategoryPicker" class="picker-overlay" @click="showCategoryPicker = false">
      <view class="picker-sheet" @click.stop>
        <view class="picker-header">
          <text class="picker-title">请选择分类</text>
          <text class="picker-close" @click="showCategoryPicker = false">×</text>
        </view>
        <view class="picker-list">
          <view
            class="picker-item"
            :class="{ active: selectedCategory === '' }"
            @click="selectCategory('')"
          >全部</view>
          <view
            class="picker-item"
            v-for="cat in categories"
            :key="cat"
            :class="{ active: selectedCategory === cat }"
            @click="selectCategory(cat)"
          >{{ cat }}</view>
        </view>
      </view>
    </view>

    <!-- 产品列表 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      :style="{ paddingBottom: bottomPadding + 'px' }"
    >
      <view class="scroll-inner">
        <view v-if="list.length > 0" class="card-list">
          <view class="product-card" v-for="item in list" :key="item.id">
          <!-- 卡片头部 -->
          <view class="card-header">
            <text class="card-date">{{ formatDate(item.created_at) }}</text>
            <text class="card-status" :class="item.status === 1 ? 'normal' : 'disabled'">
              {{ item.status === 1 ? '正常' : '停用' }}
            </text>
          </view>

          <!-- 折叠模式 -->
          <view class="card-body" v-if="!expandedIds[item.id]">
            <view class="card-row">
              <view class="product-img" :style="{ backgroundColor: getImgBg(item.id) }">
                <image v-if="item.image" class="img" :src="item.image" mode="aspectFill" />
                <text v-else class="img-placeholder">{{ getNameInit(item.name) }}</text>
              </view>
              <view class="product-info">
                <view class="info-id-row">
                  <text class="info-label">ID: {{ item.id }}</text>
                  <uni-icons type="copy" size="14" color="#409EFF" @click.stop="copyId(item.id)"></uni-icons>
                </view>
                <text class="info-name">{{ item.name }}</text>
              </view>
            </view>
            <view class="toggle-btn" @click="toggleCard(item.id)">
              <text class="toggle-text">展开</text>
              <uni-icons type="arrowdown" size="16" color="#409EFF"></uni-icons>
            </view>
            <view class="card-actions">
              <view class="action-btn outline" @click="goDetail(item.id)">详情</view>
              <view class="action-btn outline" @click="goEdit(item.id)">编辑</view>
              <view class="action-btn outline" @click="showMore(item)">更多</view>
            </view>
          </view>

          <!-- 展开模式 -->
          <view class="card-body expanded" v-else>
            <view class="card-row">
              <view class="product-img" :style="{ backgroundColor: getImgBg(item.id) }">
                <image v-if="item.image" class="img" :src="item.image" mode="aspectFill" />
                <text v-else class="img-placeholder">{{ getNameInit(item.name) }}</text>
              </view>
              <view class="product-info">
                <view class="info-id-row">
                  <text class="info-label">产品ID</text>
                  <view class="id-copy" @click.stop="copyId(item.id)">
                    <text class="info-value">{{ item.id }}</text>
                    <uni-icons type="copy" size="14" color="#409EFF"></uni-icons>
                  </view>
                </view>
                <view class="info-name-row">
                  <text class="info-label">标题</text>
                  <text class="info-name">{{ item.name }}</text>
                </view>
              </view>
            </view>

            <!-- 价格 & 库存 -->
            <view class="detail-section">
              <text class="detail-title">Price &amp; Inventory</text>
              <view class="price-grid">
                <view class="price-item">
                  <text class="price-label">零售价</text>
                  <text class="price-value primary">¥{{ formatPrice(item.sale_price) }}</text>
                </view>
                <view class="price-item">
                  <text class="price-label">成本价</text>
                  <text class="price-value">¥{{ formatPrice(item.cost_price) }}</text>
                </view>
                <view class="price-item">
                  <text class="price-label">库存</text>
                  <text class="price-value">{{ item.stock_quantity || 0 }}</text>
                </view>
              </view>
            </view>

            <!-- 产品详情 -->
            <view class="detail-section">
              <text class="detail-title">Product Details</text>
              <view class="detail-row">
                <text class="detail-label">编码 (SKU)</text>
                <view class="detail-right">
                  <text class="detail-value">{{ item.code || '-' }}</text>
                  <uni-icons v-if="item.code" type="copy" size="14" color="#409EFF" @click.stop="copyCode(item.code)"></uni-icons>
                </view>
              </view>
              <view class="detail-row">
                <text class="detail-label">产品分类</text>
                <text class="detail-value">{{ item.category || '--' }}</text>
              </view>
              <view class="detail-row">
                <text class="detail-label">状态</text>
                <text class="detail-status" :class="item.status === 1 ? 'normal' : 'disabled'">
                  {{ item.status === 1 ? '正常' : '停用' }}
                </text>
              </view>
            </view>

            <view class="toggle-btn" @click="toggleCard(item.id)">
              <text class="toggle-text">收起</text>
              <uni-icons type="arrowup" size="16" color="#409EFF"></uni-icons>
            </view>

            <view class="card-actions">
              <view class="action-btn primary" @click="goDetail(item.id)">详情</view>
              <view class="action-btn outline-primary" @click="goEdit(item.id)">编辑</view>
              <view class="action-btn outline" @click="showMore(item)">更多</view>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="!loading" class="empty-state">
        <uni-icons type="box" size="60" color="#DCDFE6"></uni-icons>
        <text class="empty-text">暂无产品数据</text>
      </view>

      <view v-if="loading" class="loading-more">
        <uni-load-more status="loading"></uni-load-more>
      </view>
      <view v-if="noMore && list.length > 0" class="loading-more">
        <uni-load-more status="noMore"></uni-load-more>
      </view>
    </view>
    </scroll-view>

    <!-- 底部新增按钮（固定） -->
    <view class="bottom-bar">
      <view class="add-btn" @click="goCreate">
        <uni-icons type="plus-filled" size="24" color="#FFFFFF"></uni-icons>
        <text class="add-text">新增产品</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { productApi } from '@/api/product'

const bottomPadding = ref(50) // 底部栏高度补偿

const keyword = ref('')
const selectedCategory = ref('')
const categoryLabel = ref('请选择')
const showCategoryPicker = ref(false)
const categories = ['女装', '男装', '童装', '配饰', '鞋类']

const list = ref([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const expandedIds = reactive({})

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const formatDate = (val) => {
  if (!val) return '--'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

const getNameInit = (name) => {
  return (name || '?').slice(0, 2)
}

const getImgBg = (id) => {
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#8E44AD', '#17A2B8', '#FF9800', '#00BCD4']
  return colors[(id || 0) % colors.length]
}

const toggleCard = (id) => {
  if (expandedIds[id]) {
    delete expandedIds[id]
  } else {
    expandedIds[id] = true
  }
}

const selectCategory = (cat) => {
  selectedCategory.value = cat
  categoryLabel.value = cat || '请选择'
  showCategoryPicker.value = false
  page.value = 1
  noMore.value = false
  fetchList(true)
}

const copyId = (id) => {
  uni.setClipboardData({ data: String(id) })
  uni.showToast({ title: '已复制', icon: 'none' })
}

const copyCode = (code) => {
  uni.setClipboardData({ data: code })
  uni.showToast({ title: '已复制', icon: 'none' })
}

const fetchList = async (isRefresh = false) => {
  if (loading.value) return
  loading.value = true
  try {
    const params = {
      page: isRefresh ? 1 : page.value,
      pageSize,
      keyword: keyword.value.trim(),
      category: selectedCategory.value
    }
    const res = await productApi.getList(params)
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
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onSearch = () => {
  page.value = 1
  noMore.value = false
  fetchList(true)
}

const onRefresh = () => {
  refreshing.value = true
  fetchList(true)
}

const loadMore = () => {
  if (!noMore.value && !loading.value) {
    fetchList()
  }
}

const goDetail = (id) => {
  uni.navigateTo({ url: `/pages/product/detail?id=${id}` })
}

const goEdit = (id) => {
  uni.navigateTo({ url: `/pages/product/detail?id=${id}&edit=1` })
}

const goCreate = () => {
  uni.navigateTo({ url: '/pages/product/detail' })
}

const showMore = (item) => {
  uni.showActionSheet({
    itemList: ['设为停用', '打印标签', '删除产品'],
    success: (res) => {
      if (res.tapIndex === 0) {
        // 切换状态
        uni.showToast({ title: '操作成功', icon: 'none' })
      } else if (res.tapIndex === 2) {
        uni.showModal({
          title: '确认删除',
          content: `确定要删除「${item.name}」吗？`,
          success: (r) => {
            if (r.confirm) {
              // TODO: call delete API
              uni.showToast({ title: '已删除', icon: 'none' })
            }
          }
        })
      }
    }
  })
}

onMounted(() => {
  fetchList(true)
})
</script>

<style lang="scss" scoped>
.product-list-page {
  height: 100vh;
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

.category-picker {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: #F2F4F6;
  padding: 0 16rpx;
  height: 72rpx;
  border-radius: 12rpx;
  white-space: nowrap;
}

.category-text {
  font-size: 24rpx;
  color: #606266;
}

.search-btn {
  flex-shrink: 0;
  background: #0062ff;
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

/* 分类选择弹窗 */
.picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 500;
  display: flex;
  align-items: flex-end;
}

.picker-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
}

.picker-close {
  font-size: 40rpx;
  color: #999;
}

.picker-list {
  padding: 20rpx;
  max-height: 400rpx;
  overflow-y: auto;
}

.picker-item {
  padding: 24rpx 20rpx;
  font-size: 28rpx;
  color: #303133;
  border-radius: 12rpx;

  &.active {
    background: #ECF5FF;
    color: #409EFF;
    font-weight: 600;
  }
}

/* 列表 */
.list-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 12rpx 24rpx;
}

.card-list {
  padding-bottom: 20rpx;
}

/* 产品卡片 */
.product-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #F8FAFB;
  border-bottom: 1rpx solid #F0F0F0;
}

.card-date {
  font-size: 22rpx;
  color: #909399;
}

.card-status {
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;

  &.normal {
    background: #E8F5E9;
    color: #67C23A;
  }

  &.disabled {
    background: #FFF3E0;
    color: #E6A23C;
  }
}

.card-body {
  padding: 24rpx;
}

.card-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.product-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .img {
    width: 100%;
    height: 100%;
  }

  .img-placeholder {
    font-size: 40rpx;
    font-weight: 700;
    color: #FFFFFF;
  }
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.info-id-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.info-label {
  font-size: 22rpx;
  color: #909399;
}

.info-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
}

.id-copy {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.info-name-row {
  margin-top: 8rpx;
}

.info-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #303133;
  margin-top: 4rpx;
  display: block;
}

/* 展开区域 */
.expanded {
  .card-row {
    margin-bottom: 12rpx;
  }
}

.detail-section {
  padding: 16rpx 0;
  border-top: 1rpx solid #F0F0F0;
}

.detail-title {
  font-size: 22rpx;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 2rpx;
  margin-bottom: 14rpx;
  display: block;
}

.price-grid {
  display: flex;
  gap: 16rpx;
}

.price-item {
  flex: 1;
  text-align: center;
  background: #F8FAFB;
  border-radius: 12rpx;
  padding: 18rpx 10rpx;
}

.price-label {
  font-size: 22rpx;
  color: #909399;
  display: block;
  margin-bottom: 6rpx;
}

.price-value {
  font-size: 26rpx;
  font-weight: 700;
  color: #303133;

  &.primary {
    color: #409EFF;
  }
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14rpx 16rpx;
  background: #F8FAFB;
  border-radius: 8rpx;
  margin-bottom: 8rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.detail-label {
  font-size: 24rpx;
  color: #909399;
}

.detail-right {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.detail-value {
  font-size: 26rpx;
  font-weight: 500;
  color: #303133;
}

.detail-status {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;

  &.normal {
    background: #E8F5E9;
    color: #67C23A;
  }

  &.disabled {
    background: #FFF3E0;
    color: #E6A23C;
  }
}

/* 展开/收起 */
.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 12rpx 0;
  cursor: pointer;
}

.toggle-text {
  font-size: 24rpx;
  color: #409EFF;
}

/* 操作按钮 */
.card-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  border-radius: 10rpx;
  font-size: 24rpx;
  font-weight: 600;

  &.primary {
    background: #004cca;
    color: #FFFFFF;
  }

  &.outline-primary {
    border: 2rpx solid #004cca;
    color: #004cca;
  }

  &.outline {
    border: 2rpx solid #E0E3E5;
    color: #606266;
  }

  &:active {
    opacity: 0.8;
  }
}

/* 底部栏（固定） */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10rpx);
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.add-btn {
  width: 100%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: #0062ff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 98, 255, 0.3);

  &:active {
    opacity: 0.85;
  }
}

.add-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #C0C4CC;
  margin-top: 20rpx;
}

.loading-more {
  padding: 20rpx 0;
}
</style>
