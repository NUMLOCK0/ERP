<template>
  <view class="detail-page">
    <scroll-view class="detail-scroll" scroll-y>
      <view class="scroll-inner">
        <!-- ===== 基础信息 ===== -->
        <view class="section">
          <view class="section-header" @click="toggleBasicExpanded">
            <text class="section-title">基础信息</text>
            <uni-icons :type="basicExpanded ? 'arrowup' : 'arrowdown'" size="16" color="#999"></uni-icons>
          </view>
          <view class="info-grid" v-if="basicExpanded">
            <view class="info-row">
              <text class="info-label">产品ID</text>
              <view class="info-right">
                <text class="info-value">{{ product.id }}</text>
                <uni-icons type="copy" size="14" color="#409EFF" @click="copyText(String(product.id))"></uni-icons>
              </view>
            </view>
            <view class="info-row">
              <text class="info-label">主图</text>
              <view class="info-right">
                <view v-if="product.image" class="main-img" @click="previewImage(product.image)">
                  <image :src="product.image" mode="aspectFill" class="img" />
                </view>
                <text v-else class="info-empty">--</text>
              </view>
            </view>
            <view class="info-row">
              <text class="info-label">名称</text>
              <text class="info-value">{{ product.name || '--' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">规格</text>
              <text class="info-value">{{ product.spec || '--' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">简介</text>
              <text class="info-value">{{ product.intro || product.description || '--' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">编码</text>
              <view class="info-right">
                <text class="info-value">{{ product.code || '--' }}</text>
                <uni-icons v-if="product.code" type="copy" size="14" color="#409EFF" @click="copyText(product.code)"></uni-icons>
              </view>
            </view>
            <view class="info-row">
              <text class="info-label">状态</text>
              <text class="info-value">
                <text class="status-tag" :class="product.status === 1 ? 'normal' : 'disabled'">
                  {{ product.status === 1 ? '正常' : (product.status === 0 ? '下架' : (product.status === 2 ? '停售' : '停产')) }}
                </text>
              </text>
            </view>
            <view class="info-row">
              <text class="info-label">产品分类</text>
              <text class="info-value">{{ product.category_name || product.category || '--' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">品牌</text>
              <text class="info-value">{{ product.brand_name || product.brand || '--' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">零售价</text>
              <text class="info-value">{{ formatPrice(product.sale_price) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">成本价</text>
              <text class="info-value">{{ formatPrice(product.cost_price) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">库存总量</text>
              <text class="info-value">{{ product.stock_quantity || 0 }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">默认供应商</text>
              <text class="info-value">{{ product.supplier_name || product.supplier || '--' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">是否多规格</text>
              <text class="info-value">{{ product.units && product.units.length > 1 ? '是' : '否' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">是否多单位</text>
              <text class="info-value">{{ product.units && product.units.length > 1 ? '是' : '否' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">创建时间</text>
              <text class="info-value">{{ formatDate(product.created_at) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">更新时间</text>
              <text class="info-value">{{ formatDate(product.updated_at) }}</text>
            </view>
          </view>
          <!-- 收起 -->
          <view v-if="basicExpanded" class="collapse-btn" @click="basicExpanded = false">
            <text class="collapse-text">收起</text>
            <uni-icons type="arrowup" size="14" color="#999"></uni-icons>
          </view>
        </view>

        <!-- ===== 规格/计量单位 ===== -->
        <view class="section">
          <view class="section-header" @click="toggleSpecExpanded">
            <text class="section-title">规格/计量单位</text>
            <uni-icons :type="specExpanded ? 'arrowup' : 'arrowdown'" size="16" color="#999"></uni-icons>
          </view>
          <view v-if="specExpanded">
            <scroll-view class="spec-scroll-wrap" scroll-x="true" v-if="units.length > 0">
              <view class="spec-table">
                <view class="spec-header">
                  <text class="spec-th col-unit">单位</text>
                  <text class="spec-th col-base">基准数</text>
                  <text class="spec-th col-code">编码</text>
                  <text class="spec-th col-spec">规格</text>
                  <text class="spec-th col-price">零售价</text>
                  <text class="spec-th col-price">成本价</text>
                </view>
                <view class="spec-row" v-for="u in units" :key="u.id">
                  <text class="spec-td col-unit">{{ u.unit_name || u.name || '--' }}</text>
                  <text class="spec-td col-base">{{ u.base_quantity || 1 }}</text>
                  <text class="spec-td col-code">{{ u.code || '--' }}</text>
                  <text class="spec-td col-spec">{{ u.spec || '--' }}</text>
                  <text class="spec-td col-price">¥{{ formatPrice(u.sale_price) }}</text>
                  <text class="spec-td col-price">¥{{ formatPrice(u.cost_price) }}</text>
                </view>
              </view>
            </scroll-view>
            <view v-else class="spec-empty">
              <text class="empty-text">暂无规格数据</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goEdit">编辑</view>
      <view class="bottom-btn primary" @click="goBack">返回</view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { productApi } from '@/api/product'

const product = ref({})
const units = ref([])
const basicExpanded = ref(true)
const specExpanded = ref(true)

const refreshHandler = () => {
  if (product.value.id) {
    fetchDetail(product.value.id)
  }
}

onShow(() => {
  uni.hideTabBar()
  uni.$on('refreshProductDetail', refreshHandler)
})

onUnmounted(() => {
  uni.$off('refreshProductDetail', refreshHandler)
})

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

const copyText = (text) => {
  uni.setClipboardData({ data: text })
  uni.showToast({ title: '已复制', icon: 'none' })
}

const previewImage = (url) => {
  uni.previewImage({ urls: [url] })
}

const toggleBasicExpanded = () => {
  basicExpanded.value = !basicExpanded.value
}

const toggleSpecExpanded = () => {
  specExpanded.value = !specExpanded.value
}

const fetchDetail = async (id) => {
  try {
    const res = await productApi.getDetail(id)
    if (res.code === 0) {
      const data = res.data || {}
      product.value = data
      units.value = data.units || []
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

const goBack = () => {
  uni.navigateBack()
}

const goEdit = () => {
  uni.navigateTo({ url: `/pages/product/edit?id=${product.value.id}` })
}

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const id = current.$page?.options?.id
  
  if (id) {
    fetchDetail(id)
  }
})
</script>

<style lang="scss" scoped>
.detail-page {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  overflow: hidden;
}

/* 滚动区 */
.detail-scroll {
  flex: 1;
  height: 0;
}

.scroll-inner {
  padding: 16rpx 24rpx;
}

/* 卡片区 */
.section {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #909399;
}

/* 信息网格 */
.info-grid {
  padding: 0 24rpx 24rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #F2F6FC;

  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  font-size: 26rpx;
  color: #909399;
  flex-shrink: 0;
  width: 160rpx;
}

.info-value {
  font-size: 26rpx;
  color: #303133;
  text-align: right;
}

.info-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  justify-content: flex-end;
}

.info-empty {
  font-size: 26rpx;
  color: #C0C4CC;
}

.main-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: #F5F7FA;

  .img {
    width: 100%;
    height: 100%;
  }
}

.status-tag {
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

/* 收起 */
.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 16rpx 0;
}

.collapse-text {
  font-size: 24rpx;
  color: #999;
}

/* 规格表格 */
.spec-scroll-wrap {
  width: 100%;
  overflow-x: auto;
}

.spec-table {
  width: 850rpx;
  padding: 0 24rpx 24rpx;
  box-sizing: border-box;
}

.spec-header {
  display: flex;
  background: #F5F7FA;
  border-radius: 10rpx;
  padding: 16rpx 0;
}

.spec-th {
  font-size: 26rpx;
  font-weight: 700;
  color: #303133;
}

.spec-row {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F2F6FC;
}

.spec-td {
  font-size: 26rpx;
  color: #303133;
}

.col-unit {
  width: 120rpx;
  flex-shrink: 0;
  text-align: center;
}

.col-base {
  width: 120rpx;
  flex-shrink: 0;
  text-align: center;
}

.col-code {
  width: 200rpx;
  flex-shrink: 0;
  text-align: center;
}

.col-spec {
  width: 150rpx;
  flex-shrink: 0;
  text-align: center;
}

.col-price {
  width: 130rpx;
  flex-shrink: 0;
  text-align: right;
  padding-right: 10rpx;
  box-sizing: border-box;
}

.spec-empty {
  padding: 40rpx 24rpx;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #C0C4CC;
}

/* 底部操作栏 */
.bottom-bar {
  flex-shrink: 0;
  display: flex;
  gap: 20rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.bottom-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 600;

  &.primary {
    background: #1890FF;
    color: #FFFFFF;
  }

  &.outline {
    border: 2rpx solid #E0E3E5;
    color: #606266;
  }

  &:active {
    opacity: 0.85;
  }
}
</style>
