<template>
  <view class="delivery-detail">
    <view v-if="delivery.id" class="detail-content">
      <!-- 发货单信息卡片 -->
      <view class="card">
        <view class="card-title">发货单基础信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">发货单号</text>
            <text class="info-value font-bold">{{ delivery.delivery_no }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">发货状态</text>
            <view class="info-value">
              <uni-tag :text="statusMap[delivery.status] || '未知'" size="small" :type="getStatusType(delivery.status)" />
            </view>
          </view>
          <view class="info-item">
            <text class="info-label">销售客户</text>
            <text class="info-value">{{ delivery.customer_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">出库仓库</text>
            <text class="info-value">{{ delivery.warehouse_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">关联销售单</text>
            <text class="info-value text-link" @click="goOrderDetail">{{ delivery.order_no || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">销售员</text>
            <text class="info-value">{{ delivery.employee_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value date-text">{{ formatDate(delivery.created_at || delivery.createdAt) }}</text>
          </view>
          <view class="info-item" v-if="delivery.shipped_time">
            <text class="info-label">发货时间</text>
            <text class="info-value date-text">{{ formatDate(delivery.shipped_time) }}</text>
          </view>
          <view class="info-item" v-if="delivery.completed_time">
            <text class="info-label">完成时间</text>
            <text class="info-value date-text">{{ formatDate(delivery.completed_time) }}</text>
          </view>
        </view>
      </view>

      <!-- 物流及收货信息 -->
      <view class="card">
        <view class="card-title">物流与收货信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">收货人</text>
            <text class="info-value">{{ delivery.contact || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ delivery.phone || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;">
            <text class="info-label">收货地址</text>
            <text class="info-value">{{ delivery.detail_address || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;" v-if="delivery.logistics_company || delivery.logistics_no">
            <text class="info-label">物流信息</text>
            <text class="info-value">{{ delivery.logistics_company || '-' }} (单号: {{ delivery.logistics_no || '-' }})</text>
          </view>
          <view class="info-item" style="width: 100%;" v-if="delivery.delivery_remark">
            <text class="info-label">发货备注</text>
            <text class="info-value">{{ delivery.delivery_remark }}</text>
          </view>
          <view class="info-item" style="width: 100%;" v-if="delivery.sale_remark">
            <text class="info-label">销售单备注</text>
            <text class="info-value">{{ delivery.sale_remark }}</text>
          </view>
        </view>
      </view>

      <!-- 商品明细卡片 -->
      <view class="card">
        <view class="card-title">发货商品明细</view>
        <view class="item-list">
          <view class="item-header">
            <text class="col-name">商品标题/规格</text>
            <text class="col-qty">数量</text>
            <text class="col-price">单价</text>
            <text class="col-amount">发货总价</text>
          </view>
          <view class="item-row" v-for="(item, index) in delivery.items" :key="index">
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
            <text class="total-val">¥{{ formatPrice(delivery.total_tax) }}</text>
          </view>
          <view class="total-row">
            <text class="total-label">发货总额：</text>
            <text class="total-val text-danger font-bold">¥{{ formatPrice(delivery.total_amount) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">发货单不存在或已被删除</text>
    </view>
    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="delivery.id" class="bottom-bar safe-bottom">
      <view class="action-btn-group">
        <button class="btn-action outline" @click="goBack">返回</button>
        <!-- Shipped Operation (Status 0) -->
        <button v-if="Number(delivery.status) === 0" class="btn-action primary" @click="openShipPopup">确认发货</button>
        <!-- Received Operation (Status 1) -->
        <button v-if="Number(delivery.status) === 1" class="btn-action primary" @click="handleReceive">确认签收</button>
      </view>
    </view>

    <!-- 确认发货弹窗 -->
    <view v-if="renderShipPopup" class="dialog-overlay" :class="{ show: showShipPopup }" @click="closeShipPopup">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">填写发货物流信息</text>
          <text class="dialog-close" @click="closeShipPopup">×</text>
        </view>
        <view class="dialog-body">
          <view class="form-group">
            <view class="form-item">
              <text class="form-label">物流公司</text>
              <picker class="form-picker" @change="onLogisticsChange" :value="logisticsIndex" :range="logisticsCompanies">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: logisticsIndex === -1 }">
                    {{ logisticsCompanies[logisticsIndex] || '请选择物流公司' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">物流单号</text>
              <input class="form-input" v-model="shipForm.logistics_no" placeholder="请输入物流单号" />
            </view>
            <view class="form-item">
              <text class="form-label">发货备注</text>
              <input class="form-input" v-model="shipForm.delivery_remark" placeholder="请输入发货备注(选填)" />
            </view>
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-cancel" @click="closeShipPopup">取消</button>
          <button class="btn-primary" @click="submitShip">确认发货</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { saleApi } from '@/api/sale'

const delivery = ref({})
const loading = ref(true)

const statusMap = {
  0: '待发货',
  1: '已发货',
  2: '已签收',
  3: '已取消'
}

const getStatusType = (status) => {
  const map = {
    0: 'warning',
    1: 'primary',
    2: 'success',
    3: 'error'
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
    const res = await saleApi.getDeliveryDetail(id)
    if (res.code === 0) {
      delivery.value = res.data || {}
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

const goOrderDetail = () => {
  if (delivery.value.order_id) {
    uni.navigateTo({ url: `/pages/sale/order-detail?id=${delivery.value.order_id}` })
  }
}

// Shipped Dialog Logic
const renderShipPopup = ref(false)
const showShipPopup = ref(false)
const logisticsIndex = ref(-1)
const logisticsCompanies = ['顺丰速运', '京东物流', '中通快递', '圆通速递', '申通快递', '百世快递', '韵达速递', '邮政EMS', '其它']

const shipForm = reactive({
  logistics_company: '',
  logistics_no: '',
  delivery_remark: ''
})

const openShipPopup = () => {
  logisticsIndex.value = -1
  shipForm.logistics_company = ''
  shipForm.logistics_no = ''
  shipForm.delivery_remark = ''
  renderShipPopup.value = true
  setTimeout(() => {
    showShipPopup.value = true
  }, 30)
}

const closeShipPopup = () => {
  showShipPopup.value = false
  setTimeout(() => {
    renderShipPopup.value = false
  }, 280)
}

const onLogisticsChange = (e) => {
  logisticsIndex.value = e.detail.value
  shipForm.logistics_company = logisticsCompanies[logisticsIndex.value] || ''
}

const submitShip = async () => {
  if (!shipForm.logistics_company) {
    uni.showToast({ title: '请选择物流公司', icon: 'none' })
    return
  }
  if (!shipForm.logistics_no.trim()) {
    uni.showToast({ title: '请输入物流单号', icon: 'none' })
    return
  }

  uni.showLoading({ title: '发货提交中...' })
  try {
    const res = await saleApi.shipDelivery(delivery.value.id, {
      logistics_company: shipForm.logistics_company,
      logistics_no: shipForm.logistics_no.trim(),
      delivery_remark: shipForm.delivery_remark.trim()
    })
    if (res.code === 0) {
      uni.showToast({ title: '发货成功', icon: 'success' })
      closeShipPopup()
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

const handleReceive = () => {
  uni.showModal({
    title: '确认收货签收',
    content: '确认此发货单已送达客户并完成签收吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '处理中...' })
        try {
          const ret = await saleApi.receiveDelivery(delivery.value.id)
          if (ret.code === 0) {
            uni.showToast({ title: '已确认收货', icon: 'success' })
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

onMounted(() => {
  loadDetail()
})
</script>

<style lang="scss" scoped>
.delivery-detail {
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

    .text-link {
      color: #1890FF;
      font-weight: 600;
      text-decoration: underline;
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
    padding: 0 40rpx;
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

/* 弹窗样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0);
  z-index: 999;
  transition: background-color 0.28s ease;
  visibility: hidden;
  
  &.show {
    visibility: visible;
    background: rgba(0, 0, 0, 0.5);
    
    .dialog-content {
      transform: translateY(0);
    }
  }
}

.dialog-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.28s cubic-bezier(0.25, 1, 0.5, 1);
  overflow: hidden;
}

.dialog-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 40rpx;
  border-bottom: 1rpx solid #F2F6FC;

  .dialog-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #303133;
  }

  .dialog-close {
    font-size: 40rpx;
    color: #909399;
    padding: 10rpx;
  }
}

.dialog-body {
  padding: 30rpx 40rpx;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F2F6FC;

  &:last-child {
    border-bottom: none;
  }
}

.form-label {
  font-size: 28rpx;
  color: #606266;
  flex-shrink: 0;
  width: 180rpx;
}

.form-picker {
  flex: 1;
  text-align: right;
}

.picker-inner {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}

.picker-value {
  font-size: 28rpx;
  color: #303133;
  font-weight: 500;
  
  &.placeholder {
    color: #C0C4CC;
    font-weight: 400;
  }
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #303133;
  text-align: right;
}

.dialog-footer {
  flex-shrink: 0;
  display: flex;
  padding: 24rpx 40rpx;
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #F2F6FC;
  gap: 16rpx;
  background: #FFFFFF;
  
  button {
    flex: 1;
    height: 80rpx;
    line-height: 80rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
    font-weight: 600;
    
    &::after {
      border: none;
    }
    
    &.btn-cancel {
      background: #F4F4F5;
      color: #909399;
    }
    
    &.btn-primary {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
    }
    
    &:active {
      opacity: 0.85;
    }
  }
}
</style>
