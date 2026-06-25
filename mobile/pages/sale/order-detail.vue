<template>
  <view class="order-detail">
    <view v-if="order.id" class="detail-content">
      <!-- 基础信息卡片 -->
      <view class="card">
        <view class="card-title">订单基础信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">订单号</text>
            <text class="info-value font-bold">{{ order.order_no }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">订单状态</text>
            <view class="info-value">
              <uni-tag :text="statusMap[order.status] || '未知'" size="small" :type="getStatusType(order.status)" />
            </view>
          </view>
          <view class="info-item">
            <text class="info-label">销售客户</text>
            <text class="info-value">{{ order.customer_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">出库仓库</text>
            <text class="info-value">{{ order.warehouse_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">销售员</text>
            <text class="info-value">{{ order.employee_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">付款方式</text>
            <text class="info-value">{{ order.payment_method || '未确定' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">下单时间</text>
            <text class="info-value date-text">{{ formatDate(order.created_at || order.createdAt) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建人</text>
            <text class="info-value">{{ order.creator_name || '-' }}</text>
          </view>
        </view>
      </view>

      <!-- 收货信息卡片 -->
      <view class="card">
        <view class="card-title">收货及备注信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">收货人</text>
            <text class="info-value">{{ order.contact || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ order.phone || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;">
            <text class="info-label">收货地址</text>
            <text class="info-value">{{ order.detail_address || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;" v-if="order.sale_remark">
            <text class="info-label">单据备注</text>
            <text class="info-value">{{ order.sale_remark }}</text>
          </view>
          <view class="info-item" style="width: 100%;" v-if="order.admin_remark">
            <text class="info-label">管理备注</text>
            <text class="info-value">{{ order.admin_remark }}</text>
          </view>
        </view>
      </view>

      <!-- 商品明细卡片 -->
      <view class="card">
        <view class="card-title">商品明细</view>
        <view class="item-list">
          <view class="item-header">
            <text class="col-name">商品标题/规格</text>
            <text class="col-qty">数量</text>
            <text class="col-price">单价</text>
            <text class="col-amount">销售总价</text>
          </view>
          <view class="item-row" v-for="(item, index) in order.items" :key="index">
            <view class="col-name-box">
              <text class="product-title">{{ item.product_name || '-' }}</text>
              <text class="product-spec" v-if="item.spec || item.code">{{ item.spec || '' }} {{ item.code || '' }}</text>
            </view>
            <text class="col-qty">{{ item.quantity }}{{ item.unit_name || '' }}</text>
            <text class="col-price">¥{{ formatPrice(item.price) }}</text>
            <text class="col-amount">¥{{ formatPrice(item.amount) }}</text>
          </view>
        </view>

        <!-- 金额统计 -->
        <view class="amount-total-bar">
          <view class="total-row">
            <text class="total-label">税金合计：</text>
            <text class="total-val">¥{{ formatPrice(order.total_tax) }}</text>
          </view>
          <view class="total-row">
            <text class="total-label">应收总额：</text>
            <text class="total-val text-danger font-bold">¥{{ formatPrice(order.total_amount) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">订单不存在或已被删除</text>
    </view>
    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="order.id" class="bottom-bar safe-bottom">
      <view class="action-btn-group">
        <button class="btn-action outline" @click="goBack">返回</button>
        <!-- Draft (0) actions -->
        <button v-if="Number(order.status) === 0" class="btn-action warning" @click="goEdit">编辑</button>
        <button v-if="Number(order.status) === 0" class="btn-action primary" @click="handleSubmit">提交审核</button>
        <button v-if="Number(order.status) === 0" class="btn-action danger" @click="handleDelete">删除</button>
        
        <!-- Pending Audit (2) actions -->
        <button v-if="Number(order.status) === 2" class="btn-action danger" @click="handleCancel">取消订单</button>
        <button v-if="Number(order.status) === 2" class="btn-action primary" @click="handleAudit">审核通过</button>

        <!-- Audited/In Progress (1) actions -->
        <button v-if="Number(order.status) === 1" class="btn-action danger" @click="handleClose">关闭订单</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { saleApi } from '@/api/sale'

const order = ref({})
const loading = ref(true)

const statusMap = {
  0: '草稿',
  2: '待审核',
  1: '进行中',
  3: '已取消',
  4: '已关闭'
}

const getStatusType = (status) => {
  const map = {
    0: 'info',
    2: 'warning',
    1: 'success',
    3: 'error',
    4: 'default'
  }
  return map[status] || 'info'
}

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const formatDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

const loadDetail = async () => {
  const pages = getCurrentPages()
  const id = pages[pages.length - 1].$page?.options?.id
  if (!id) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const res = await saleApi.getOrderDetail(id)
    if (res.code === 0) {
      order.value = res.data || {}
    }
  } catch (e) {
    // handled
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  uni.navigateBack()
}

const goEdit = () => {
  uni.navigateTo({ url: `/pages/sale/order-edit?id=${order.value.id}` })
}

const handleSubmit = () => {
  uni.showModal({
    title: '确认提交',
    content: '提交审核后将无法修改，确定提交吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '提交中...' })
        try {
          const subRes = await saleApi.submitOrder(order.value.id)
          if (subRes.code === 0) {
            uni.showToast({ title: subRes.data?.auto_approved ? '审核通过并生成发货单' : '提交审核成功', icon: 'success' })
            setTimeout(() => {
              loadDetail()
            }, 1000)
          }
        } catch (e) {
          // handled
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

const handleAudit = () => {
  uni.showModal({
    title: '确认审核通过',
    content: '确认审核通过此销售订单吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '提交中...' })
        try {
          const auditRes = await saleApi.auditOrder(order.value.id)
          if (auditRes.code === 0) {
            uni.showToast({ title: '审核通过成功', icon: 'success' })
            setTimeout(() => {
              loadDetail()
            }, 1000)
          }
        } catch (e) {
          // handled
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

const handleCancel = () => {
  uni.showModal({
    title: '确认取消订单',
    content: '确认取消该销售订单吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '处理中...' })
        try {
          const cancelRes = await saleApi.cancelOrder(order.value.id)
          if (cancelRes.code === 0) {
            uni.showToast({ title: '订单已取消', icon: 'success' })
            setTimeout(() => {
              loadDetail()
            }, 1000)
          }
        } catch (e) {
          // handled
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

const handleClose = () => {
  uni.showModal({
    title: '确认关闭订单',
    content: '确定要关闭该销售订单吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '处理中...' })
        try {
          const closeRes = await saleApi.closeOrder(order.value.id)
          if (closeRes.code === 0) {
            uni.showToast({ title: '订单已关闭', icon: 'success' })
            setTimeout(() => {
              loadDetail()
            }, 1000)
          }
        } catch (e) {
          // handled
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

const handleDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: '删除后数据将无法恢复，确定要删除此草稿订单吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '删除中...' })
        try {
          const delRes = await saleApi.deleteOrder(order.value.id)
          if (delRes.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' })
            setTimeout(() => {
              uni.navigateBack()
            }, 1000)
          }
        } catch (e) {
          // handled
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

onShow(() => {
  loadDetail()
})
</script>

<style lang="scss" scoped>
.order-detail {
  min-height: 100vh;
  background: #F5F7FA;
  box-sizing: border-box;
  padding-bottom: calc(120rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.detail-content {
  padding: 20rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);

  .card-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #303133;
    margin-bottom: 20rpx;
    padding-bottom: 16rpx;
    border-bottom: 1rpx solid #F2F6FC;
  }
}

.info-grid {
  display: flex;
  flex-wrap: wrap;

  .info-item {
    width: 50%;
    padding: 12rpx 0;
    box-sizing: border-box;

    .info-label {
      font-size: 22rpx;
      color: #909399;
      display: block;
      margin-bottom: 4rpx;
    }

    .info-value {
      font-size: 26rpx;
      color: #303133;
      display: block;
      font-weight: 500;
      word-break: break-all;
    }

    .date-text {
      color: #909399;
      font-size: 24rpx;
    }
  }
}

.item-list {
  .item-header {
    display: flex;
    background: #F8FAFC;
    border-radius: 8rpx;
    padding: 16rpx 12rpx;
    margin-bottom: 8rpx;
  }

  .item-row {
    display: flex;
    align-items: center;
    padding: 20rpx 12rpx;
    border-bottom: 1rpx solid #F2F6FC;

    &:last-child {
      border-bottom: none;
    }
  }

  .col-name {
    flex: 2;
    font-size: 24rpx;
    color: #303133;
    font-weight: 600;
  }

  .col-name-box {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: 4rpx;

    .product-title {
      font-size: 24rpx;
      color: #303133;
      font-weight: 600;
    }

    .product-spec {
      font-size: 20rpx;
      color: #909399;
    }
  }

  .col-qty {
    flex: 1;
    text-align: center;
    font-size: 24rpx;
    color: #606266;
  }

  .col-price {
    flex: 1.2;
    text-align: right;
    font-size: 24rpx;
    color: #606266;
  }

  .col-amount {
    flex: 1.3;
    text-align: right;
    font-size: 24rpx;
    color: #F56C6C;
    font-weight: 600;
  }
}

.amount-total-bar {
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F2F6FC;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;

  .total-row {
    display: flex;
    align-items: center;
    font-size: 24rpx;

    .total-label {
      color: #909399;
    }

    .total-val {
      color: #303133;
      font-weight: 600;
    }

    .text-danger {
      color: #F56C6C;
      font-size: 28rpx;
    }
  }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10rpx);
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 99;

  .action-btn-group {
    display: flex;
    justify-content: flex-end;
    gap: 16rpx;
    width: 100%;
  }

  .btn-action {
    height: 76rpx;
    line-height: 76rpx;
    padding: 0 36rpx;
    font-size: 26rpx;
    font-weight: 600;
    border-radius: 38rpx;
    margin: 0;

    &::after {
      border: none;
    }

    &.outline {
      background: #F4F4F5;
      color: #909399;
    }

    &.primary {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
    }

    &.warning {
      background: #E6A23C;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(230, 162, 60, 0.2);
    }

    &.danger {
      background: #F56C6C;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(245, 108, 108, 0.2);
    }

    &:active {
      opacity: 0.85;
    }
  }
}

.empty-state, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;

  .empty-text {
    font-size: 28rpx;
    color: #C0C4CC;
  }
}
</style>
