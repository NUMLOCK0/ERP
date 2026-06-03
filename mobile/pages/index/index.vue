<template>
  <view class="dashboard">
    <!-- 顶部信息栏 -->
    <view class="header-bar">
      <view class="header-left">
        <text class="greeting">你好，{{ userStore.userName }}</text>
        <text class="date">{{ currentDate }}</text>
      </view>
      <view class="header-right">
        <uni-icons type="gear" size="22" color="#FFFFFF"></uni-icons>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-row">
      <view class="stat-card" v-for="item in statsCards" :key="item.label">
        <view class="stat-icon" :style="{ backgroundColor: item.bgColor }">
          <uni-icons :type="item.icon" size="24" color="#FFFFFF"></uni-icons>
        </view>
        <view class="stat-info">
          <text class="stat-value">{{ item.value }}</text>
          <text class="stat-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="section">
      <text class="section-title">快捷入口</text>
      <view class="shortcut-grid">
        <view
          class="shortcut-item"
          v-for="item in shortcuts"
          :key="item.label"
          @click="navigateTo(item.url)"
        >
          <view class="shortcut-icon" :style="{ backgroundColor: item.bgColor }">
            <uni-icons :type="item.icon" size="28" color="#FFFFFF"></uni-icons>
          </view>
          <text class="shortcut-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 最近单据 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">最近采购订单</text>
        <text class="section-more" @click="navigateTo('/pages/purchase/order-list')">更多</text>
      </view>
      <view v-if="recentPurchases.length > 0" class="recent-list">
        <view
          class="recent-item"
          v-for="item in recentPurchases"
          :key="item.id"
          @click="navigateTo(`/pages/purchase/order-detail?id=${item.id}`)"
        >
          <view class="recent-left">
            <text class="recent-no">{{ item.order_no }}</text>
            <text class="recent-supplier">{{ item.supplier_name || '-' }}</text>
          </view>
          <view class="recent-right">
            <text class="recent-amount">{{ formatMoney(item.total_amount) }}</text>
            <uni-tag :text="statusMap[item.status] || item.status" size="small" :type="getStatusType(item.status)" />
          </view>
        </view>
      </view>
      <view v-else class="empty-tip">暂无数据</view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">最近销售订单</text>
        <text class="section-more" @click="navigateTo('/pages/sale/order-list')">更多</text>
      </view>
      <view v-if="recentSales.length > 0" class="recent-list">
        <view
          class="recent-item"
          v-for="item in recentSales"
          :key="item.id"
          @click="navigateTo(`/pages/sale/order-detail?id=${item.id}`)"
        >
          <view class="recent-left">
            <text class="recent-no">{{ item.order_no }}</text>
            <text class="recent-supplier">{{ item.customer_name || '-' }}</text>
          </view>
          <view class="recent-right">
            <text class="recent-amount">{{ formatMoney(item.total_amount) }}</text>
            <uni-tag :text="statusMap[item.status] || item.status" size="small" :type="getStatusType(item.status)" />
          </view>
        </view>
      </view>
      <view v-else class="empty-tip">暂无数据</view>
    </view>

    <view class="safe-bottom"></view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { reportApi } from '@/api/report'
import { purchaseApi } from '@/api/purchase'
import { saleApi } from '@/api/sale'

const userStore = useUserStore()

const currentDate = ref('')
const statsCards = reactive([
  { label: '产品总数', value: 0, icon: 'shop', bgColor: '#409EFF' },
  { label: '本月采购额', value: '¥0', icon: 'cart', bgColor: '#67C23A' },
  { label: '本月销售额', value: '¥0', icon: 'wallet', bgColor: '#E6A23C' },
  { label: '库存预警', value: 0, icon: 'notification', bgColor: '#F56C6C' }
])

const shortcuts = reactive([
  { label: '采购管理', icon: 'cart', bgColor: '#409EFF', url: '/pages/purchase/order-list' },
  { label: '销售管理', icon: 'wallet', bgColor: '#67C23A', url: '/pages/sale/order-list' },
  { label: '库存管理', icon: 'box', bgColor: '#E6A23C', url: '/pages/inventory/stock' },
  { label: '产品管理', icon: 'gift', bgColor: '#F56C6C', url: '/pages/product/list' },
  { label: '财务报表', icon: 'paperclip', bgColor: '#8E44AD', url: '/pages/finance/payment-list' },
  { label: '客户管理', icon: 'person', bgColor: '#17A2B8', url: '/pages/sale/order-list' }
])

const statusMap = { draft: '草稿', submitted: '待审核', approved: '已审核', completed: '已完成', cancelled: '已取消' }
const recentPurchases = ref([])
const recentSales = ref([])

const formatMoney = (val) => {
  if (!val) return '¥0.00'
  const num = Number(val)
  return num.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })
}

const getStatusType = (status) => {
  const map = { draft: 'info', submitted: 'warning', approved: 'success', completed: '', cancelled: 'error' }
  return map[status] || 'info'
}

const navigateTo = (url) => {
  uni.navigateTo({ url })
}

const formatDate = () => {
  const now = new Date()
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentDate.value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`
}

const loadDashboard = async () => {
  try {
    const res = await reportApi.getDashboard()
    if (res.code === 0 && res.data) {
      statsCards[0].value = res.data.productCount || 0
      statsCards[1].value = formatMoney(res.data.monthPurchaseAmount || 0)
      statsCards[2].value = formatMoney(res.data.monthSaleAmount || 0)
      statsCards[3].value = res.data.stockWarningCount || 0
    }
  } catch (e) {
    // 使用默认值
  }

  try {
    const purRes = await purchaseApi.getOrders({ limit: 3 })
    if (purRes.code === 0) {
      recentPurchases.value = purRes.data?.list || purRes.data || []
    }
  } catch (e) { /* ignore */ }

  try {
    const saleRes = await saleApi.getOrders({ limit: 3 })
    if (saleRes.code === 0) {
      recentSales.value = saleRes.data?.list || saleRes.data || []
    }
  } catch (e) { /* ignore */ }
}

onMounted(() => {
  formatDate()
  loadDashboard()
})
</script>

<style lang="scss" scoped>
.dashboard {
  min-height: 100vh;
  background: #F5F7FA;
}

.header-bar {
  background: linear-gradient(135deg, #409EFF, #66B1FF);
  padding: 40rpx 30rpx 50rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  .header-left {
    .greeting {
      font-size: 36rpx;
      font-weight: 700;
      color: #FFFFFF;
      display: block;
    }
    .date {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.75);
      margin-top: 8rpx;
      display: block;
    }
  }
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  padding: 0 20rpx;
  margin-top: -30rpx;
}

.stat-card {
  width: calc(50% - 20rpx);
  margin: 0 10rpx 20rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);

  .stat-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
  }

  .stat-info {
    flex: 1;
    .stat-value {
      font-size: 32rpx;
      font-weight: 700;
      color: #303133;
      display: block;
    }
    .stat-label {
      font-size: 22rpx;
      color: #909399;
      margin-top: 4rpx;
      display: block;
    }
  }
}

.section {
  padding: 0 20rpx;
  margin-bottom: 20rpx;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 10rpx;
  }

  .section-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #303133;
  }

  .section-more {
    font-size: 24rpx;
    color: #409EFF;
  }
}

.shortcut-grid {
  display: flex;
  flex-wrap: wrap;
}

.shortcut-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;

  .shortcut-icon {
    width: 90rpx;
    height: 90rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12rpx;
  }

  .shortcut-label {
    font-size: 22rpx;
    color: #606266;
  }
}

.recent-list {
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
}

.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #F2F6FC;

  &:last-child {
    border-bottom: none;
  }

  .recent-left {
    .recent-no {
      font-size: 28rpx;
      color: #303133;
      font-weight: 500;
      display: block;
    }
    .recent-supplier {
      font-size: 22rpx;
      color: #909399;
      margin-top: 4rpx;
      display: block;
    }
  }

  .recent-right {
    text-align: right;
    .recent-amount {
      font-size: 28rpx;
      color: #F56C6C;
      font-weight: 600;
      display: block;
      margin-bottom: 6rpx;
    }
  }
}

.empty-tip {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 60rpx;
  text-align: center;
  color: #C0C4CC;
  font-size: 26rpx;
}

.safe-bottom {
  height: 40rpx;
}
</style>
