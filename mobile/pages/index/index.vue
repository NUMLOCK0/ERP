<template>
  <view class="dashboard">
    <!-- ===== 顶部蓝色 Header ===== -->
    <view class="header">
      <view class="header-top">
        <view class="header-left">
          <view class="avatar">
            <text class="avatar-text">{{ avatarText }}</text>
          </view>
          <text class="shop-name">{{ userStore.userName || '测试商户11' }}</text>
        </view>
      </view>

      <!-- 4 个数字卡片 -->
      <view class="stats-row">
        <view class="stat-card">
          <text class="stat-num">{{ pendingOutbound }}</text>
          <text class="stat-label">待出库</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ pendingInbound }}</text>
          <text class="stat-label">待入库</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ activeProducts }}</text>
          <text class="stat-label">有效产品</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ inactiveProducts }}</text>
          <text class="stat-label">无效产品</text>
        </view>
      </view>
    </view>

    <!-- ===== 基础统计 ===== -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">基础统计</text>
        <view class="section-right">
          <view class="dropdown" @click="showDatePopup = !showDatePopup">
            <text class="dropdown-text">{{ dateRangeLabel }}</text>
            <u-icon :name="showDatePopup ? 'arrow-up' : 'arrow-down'" size="12" color="#606266"></u-icon>
          </view>
          <text class="view-all" @click="viewAllStats">查看全部</text>
        </view>
      </view>

      <scroll-view class="stat-cards-scroll" scroll-x :show-scrollbar="false">
        <view class="stat-card-item" v-for="card in statCards" :key="card.title">
          <text class="card-title">{{ card.title }}</text>
          <text class="card-value">{{ card.total }}</text>
          <view class="card-extra-row">
            <text class="extra-item">
              <text class="extra-label">今日</text>
              <text class="extra-value" :class="{ green: card.today > 0 }">{{ card.today > 0 ? '+' + card.today : card.today }}</text>
            </text>
            <text class="extra-item">
              <text class="extra-label">昨日</text>
              <text class="extra-value">{{ card.yesterday }}</text>
            </text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ===== 基础数据 ===== -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">基础数据</text>
      </view>

      <view class="data-grid">
        <view
          class="data-item"
          v-for="item in dataItems"
          :key="item.label"
          @click="navigateTo(item.url)"
        >
          <view class="data-icon" :style="{ backgroundColor: item.bgColor }">
            <u-icon :name="item.icon" size="22" color="#FFFFFF"></u-icon>
          </view>
          <text class="data-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- ===== 采购管理 ===== -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">采购管理</text>
      </view>

      <view class="data-grid">
        <view
          class="data-item"
          v-for="item in purchaseItems"
          :key="item.label"
          @click="navigateTo(item.url)"
        >
          <view class="data-icon" :style="{ backgroundColor: item.bgColor }">
            <u-icon :name="item.icon" size="22" color="#FFFFFF"></u-icon>
          </view>
          <text class="data-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- ===== 销售管理 ===== -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">销售管理</text>
      </view>

      <view class="data-grid">
        <view
          class="data-item"
          v-for="item in saleItems"
          :key="item.label"
          @click="navigateTo(item.url)"
        >
          <view class="data-icon" :style="{ backgroundColor: item.bgColor }">
            <u-icon :name="item.icon" size="22" color="#FFFFFF"></u-icon>
          </view>
          <text class="data-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- ===== 加工管理 ===== -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">加工管理</text>
      </view>

      <view class="data-grid">
        <view
          class="data-item"
          v-for="item in processingItems"
          :key="item.label"
          @click="navigateTo(item.url)"
        >
          <view class="data-icon" :style="{ backgroundColor: item.bgColor }">
            <u-icon :name="item.icon" size="22" color="#FFFFFF"></u-icon>
          </view>
          <text class="data-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- ===== 库存管理 ===== -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">库存管理</text>
      </view>
      <view class="data-grid">
        <view
          class="data-item"
          v-for="item in inventoryItems"
          :key="item.label"
          @click="navigateTo(item.url)"
        >
          <view class="data-icon" :style="{ backgroundColor: item.bgColor }">
            <u-icon :name="item.icon" size="22" color="#FFFFFF"></u-icon>
          </view>
          <text class="data-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- ===== 数据报表 ===== -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">数据报表</text>
      </view>
      <view class="data-grid">
        <view
          class="data-item"
          v-for="item in reportItems"
          :key="item.label"
          @click="navigateTo(item.url)"
        >
          <view class="data-icon" :style="{ backgroundColor: item.bgColor }">
            <u-icon :name="item.icon" size="22" color="#FFFFFF"></u-icon>
          </view>
          <text class="data-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- ===== 客商管理 ===== -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">客商管理</text>
      </view>
      <view class="data-grid">
        <view
          class="data-item"
          v-for="item in supplierItems"
          :key="item.label"
          @click="navigateTo(item.url)"
        >
          <view class="data-icon" :style="{ backgroundColor: item.bgColor }">
            <u-icon :name="item.icon" size="22" color="#FFFFFF"></u-icon>
          </view>
          <text class="data-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- ===== 系统配置 ===== -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">系统配置</text>
      </view>
      <view class="data-grid">
        <view
          class="data-item"
          v-for="item in systemItems"
          :key="item.label"
          @click="navigateTo(item.url)"
        >
          <view class="data-icon" :style="{ backgroundColor: item.bgColor }">
            <u-icon :name="item.icon" size="22" color="#FFFFFF"></u-icon>
          </view>
          <text class="data-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- Tabbar -->
    <CustomTabbar current="index" @open-kaidan="showKaidenPopup = true" />

    <KaidenPopup v-model:show="showKaidenPopup" />

    <DateRangePopup v-model:show="showDatePopup" @query="onDateQuery" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import CustomTabbar from '@/components/CustomTabbar.vue'
import KaidenPopup from '@/components/KaidenPopup.vue'
import DateRangePopup from '@/components/DateRangePopup.vue'
import { reportApi } from '@/api/report'

const showKaidenPopup = ref(false)
const showDatePopup = ref(false)
const dateRangeLabel = ref('近30天')

const pendingOutbound = ref(0)
const pendingInbound = ref(0)
const activeProducts = ref(0)
const inactiveProducts = ref(0)

const statCards = ref([
  { title: '产品总量', total: 0, today: 0, yesterday: 0 },
  { title: '客商总量', total: 0, today: 0, yesterday: 0 },
  { title: '采购订单', total: 0, today: 0, yesterday: 0 },
  { title: '采购入库', total: 0, today: 0, yesterday: 0 },
  { title: '采购退货', total: 0, today: 0, yesterday: 0 },
  { title: '销售订单', total: 0, today: 0, yesterday: 0 },
  { title: '销售发货', total: 0, today: 0, yesterday: 0 },
  { title: '销售退货', total: 0, today: 0, yesterday: 0 },
  { title: '其他入库', total: 0, today: 0, yesterday: 0 },
  { title: '其他出库', total: 0, today: 0, yesterday: 0 },
  { title: '采购付款', total: 0, today: 0, yesterday: 0 },
  { title: '销售收款', total: 0, today: 0, yesterday: 0 }
])

const loadHomeStats = async () => {
  try {
    const res = await reportApi.getHomeSummary()
    if (res.code === 0) {
      pendingOutbound.value = res.data.pendingOutbound || 0
      pendingInbound.value = res.data.pendingInbound || 0
      activeProducts.value = res.data.activeProducts || 0
      inactiveProducts.value = res.data.inactiveProducts || 0
      if (res.data.statCards && res.data.statCards.length) {
        statCards.value = res.data.statCards
      }
    }
  } catch (error) {
    console.error(error)
  }
}

onShow(() => {
  uni.hideTabBar()
  loadHomeStats()
})

const userStore = useUserStore()

const avatarText = computed(() => {
  const name = userStore.userName || '测试商户11'
  return name.charAt(0)
})

function onDateQuery(result) {
  dateRangeLabel.value = result.presetLabel
  console.log('查询时间范围:', result)
}

const dataItems = [
  { label: '产品管理', icon: 'gift', bgColor: '#FF9800', url: '/pages/product/list' },
  { label: '产品分类', icon: 'list', bgColor: '#FF9800', url: '/pages/product/category' },
  { label: '品牌管理', icon: 'star', bgColor: '#FF9800', url: '/pages/product/brand' },
  { label: '计量单位', icon: 'edit-pen', bgColor: '#FF9800', url: '/pages/product/unit' },
  { label: '职员管理', icon: 'account', bgColor: '#FF9800', url: '/pages/product/employee' },
  { label: '仓库管理', icon: 'home', bgColor: '#FF9800', url: '/pages/inventory/warehouse' },
  { label: '企业管理', icon: 'bag', bgColor: '#FF9800', url: '/pages/supplier/company-list' },
  { label: '企业分类', icon: 'list', bgColor: '#FF9800', url: '/pages/supplier/category-list' },
  { label: '会员登记', icon: 'integral', bgColor: '#FF9800', url: '/pages/supplier/member-list' }
]

const purchaseItems = [
  { label: '采购订单', icon: 'shopping-cart', bgColor: '#67C23A', url: '/pages/purchase/order-list' },
  { label: '采购入库单', icon: 'download', bgColor: '#67C23A', url: '/pages/purchase/inbound-list' },
  { label: '采购退货单', icon: 'rewind-left', bgColor: '#67C23A', url: '/pages/purchase/return-list' },
  { label: '采购付款单', icon: 'rmb-circle', bgColor: '#67C23A', url: '/pages/finance/payment-list' },
  { label: '采购发票登记', icon: 'edit-pen', bgColor: '#67C23A', url: '/pages/purchase/invoice-list' }
]

const saleItems = [
  { label: '销售订单', icon: 'rmb-circle', bgColor: '#409EFF', url: '/pages/sale/order-list' },
  { label: '销售发货单', icon: 'car', bgColor: '#409EFF', url: '/pages/sale/delivery-list' },
  { label: '发货退货单', icon: 'rewind-left', bgColor: '#409EFF', url: '/pages/sale/return-list' },
  { label: '销售收款单', icon: 'rmb-circle', bgColor: '#409EFF', url: '/pages/finance/receipt-list' },
  { label: '销售发票登记', icon: 'edit-pen', bgColor: '#409EFF', url: '/pages/sale/invoice-list' }
]

const processingItems = [
  { label: '药材加工批次', icon: 'reload', bgColor: '#E6A23C', url: '/pages/processing/batch-list' }
]

const inventoryItems = [
  { label: '库存查询', icon: 'home', bgColor: '#9B59B6', url: '/pages/inventory/stock' },
  { label: '其他入库', icon: 'download', bgColor: '#9B59B6', url: '/pages/inventory/other-in-list' },
  { label: '其他出库', icon: 'arrow-upward', bgColor: '#9B59B6', url: '/pages/inventory/other-out-list' },
  { label: '库存盘点', icon: 'checkmark-circle', bgColor: '#9B59B6', url: '/pages/inventory/check-list' },
  { label: '库存日志', icon: 'list', bgColor: '#9B59B6', url: '/pages/inventory/log' }
]

const reportItems = [
  { label: '产品库存', icon: 'gift', bgColor: '#2C3E50', url: '/pages/report/product-stock' },
  { label: '采购订单', icon: 'shopping-cart', bgColor: '#2C3E50', url: '/pages/report/purchase-order' },
  { label: '采购入库', icon: 'download', bgColor: '#2C3E50', url: '/pages/report/purchase-inbound' },
  { label: '采购付款', icon: 'rmb-circle', bgColor: '#2C3E50', url: '/pages/report/purchase-payment' },
  { label: '其他入库', icon: 'download', bgColor: '#2C3E50', url: '/pages/report/other-inbound' },
  { label: '销售订单', icon: 'rmb-circle', bgColor: '#2C3E50', url: '/pages/report/sale-order' },
  { label: '销售发货', icon: 'car', bgColor: '#2C3E50', url: '/pages/report/sale-delivery' },
  { label: '销售收款', icon: 'rmb-circle', bgColor: '#2C3E50', url: '/pages/report/sale-receipt' },
  { label: '其他出库', icon: 'arrow-upward', bgColor: '#2C3E50', url: '/pages/report/other-outbound' }
]

const supplierItems = [
  { label: '企业管理', icon: 'account', bgColor: '#1ABC9C', url: '/pages/supplier/company-list' },
  { label: '企业分类', icon: 'list', bgColor: '#1ABC9C', url: '/pages/supplier/category-list' },
  { label: '会员等级', icon: 'integral', bgColor: '#1ABC9C', url: '/pages/supplier/member-list' }
]

const systemItems = [
  { label: '系统设置', icon: 'setting', bgColor: '#909399', url: 'todo' },
  { label: '管理员', icon: 'account', bgColor: '#909399', url: 'todo' },
  { label: '角色', icon: 'account', bgColor: '#909399', url: 'todo' },
  { label: '打印模板', icon: 'edit-pen', bgColor: '#909399', url: 'todo' },
  { label: '操作日志', icon: 'list', bgColor: '#909399', url: 'todo' }
]

const navigateTo = (url) => {
  if (!url || url === 'todo') {
    uni.showToast({
      title: '该功能暂未开放',
      icon: 'none'
    })
    return
  }
  uni.navigateTo({ url })
}

const viewAllStats = () => {
  uni.navigateTo({ url: '/pages/report/basic-stats' })
}
</script>

<style lang="scss" scoped>
.dashboard {
  min-height: 100vh;
  background: #F5F7FA;
  padding-bottom: 140rpx;
}

/* ===== Header ===== */
.header {
  background: linear-gradient(160deg, #409EFF 0%, #5CADFF 100%);
  padding: 44rpx 30rpx 36rpx;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.avatar {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #67C23A, #85CE61);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.shop-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.brand-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
}

/* Stats Row */
.stats-row {
  display: flex;
  gap: 16rpx;
}

.stat-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10rpx);
  border-radius: 16rpx;
  padding: 18rpx 10rpx;
  text-align: center;
}

.stat-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1.2;
  display: block;
}

.stat-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4rpx;
  display: block;
}

/* ===== Section ===== */
.section {
  background: #FFFFFF;
  margin: 20rpx;
  border-radius: 20rpx;
  padding: 28rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #303133;
  position: relative;
  padding-left: 20rpx;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 28rpx;
    background: linear-gradient(180deg, #409EFF, #66B1FF);
    border-radius: 3rpx;
  }
}

.section-right {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.dropdown {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  background: #F5F7FA;
  border-radius: 20rpx;
}

.dropdown-text {
  font-size: 24rpx;
  color: #606266;
}

.view-all {
  font-size: 24rpx;
  color: #409EFF;
}

/* ===== Stat Cards 横向滚动 ===== */
.stat-cards-scroll {
  white-space: nowrap;
}

.stat-card-item {
  display: inline-flex;
  flex-direction: column;
  width: 230rpx;
  background: #F8FAFB;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-right: 16rpx;
  vertical-align: top;
  white-space: normal;
}

.stat-card-item:last-child {
  margin-right: 0;
}

.card-title {
  font-size: 26rpx;
  color: #909399;
  margin-bottom: 16rpx;
}

.card-value {
  font-size: 48rpx;
  font-weight: 800;
  color: #303133;
  line-height: 1.2;
  margin-bottom: 14rpx;
}

.card-extra-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #EBEDF0;
}

.extra-item {
  display: flex;
  align-items: center;
  gap: 2rpx;
}

.extra-label {
  font-size: 20rpx;
  color: #909399;
}

.extra-value {
  font-size: 22rpx;
  font-weight: 600;
  color: #303133;

  &.green {
    color: #67C23A;
  }
}

/* ===== Data Grid ===== */
.data-grid {
  display: flex;
  flex-wrap: wrap;
}

.data-item {
  width: calc((100% - 30rpx) / 4);
  box-sizing: border-box;
  margin-right: 10rpx;
  margin-bottom: 10rpx;

  &:nth-child(4n) {
    margin-right: 0;
  }

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16rpx 4rpx;
  border-radius: 16rpx;
  background: #F8FAFB;
  margin-bottom: 16rpx;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.96);
  }

  &.empty {
    opacity: 0;
    pointer-events: none;
  }
}

.data-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10rpx;
}

.data-label {
  font-size: 22rpx;
  color: #606266;
  text-align: center;
}
</style>
