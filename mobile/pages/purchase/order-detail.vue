<template>
  <view class="order-detail">
    <view v-if="order.id" class="detail-content">
      <!-- 采购单基本信息 -->
      <view class="card">
        <view class="card-title">基本信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">采购单ID</text>
            <text class="info-value">{{ order.id }}</text>
          </view>
          
          <view class="info-item order-no-item">
            <text class="info-label">采购单号</text>
            <view class="info-value-copy">
              <text class="info-value">{{ order.order_no }}</text>
              <u-icon name="file-text" size="14" color="#1890FF" class="copy-icon" @click="copyOrderNo"  />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">供应商</text>
            <text class="info-value">{{ order.supplier_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">采购状态</text>
            <view class="info-value">
              <uni-tag :text="statusMap[order.status] || '未知'" size="small" :type="getStatusType(order.status)" />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">付款状态</text>
            <view class="info-value">
              <uni-tag :text="paymentStatusMap[order.payment_status] || '未付款'" size="small" :type="getPaymentStatusType(order.payment_status)" />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">退货状态</text>
            <view class="info-value">
              <uni-tag :text="returnStatusMap[order.return_status] || '无退货'" size="small" :type="getReturnStatusType(order.return_status)" />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">付款方式</text>
            <text class="info-value">{{ order.payment_method || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">付款总额</text>
            <text class="info-value">¥{{ formatPrice(order.payment_total_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">单价</text>
            <text class="info-value">¥{{ formatPrice(order.unit_price) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">税金</text>
            <text class="info-value">¥{{ formatPrice(order.tax_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">总价</text>
            <text class="info-value text-danger font-bold">¥{{ formatPrice(order.total_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">最终产品总数量</text>
            <text class="info-value">{{ order.final_product_total_quantity || 0 }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">退款金额</text>
            <text class="info-value">¥{{ formatPrice(order.refund_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">退货数量</text>
            <text class="info-value">{{ order.return_quantity || 0 }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">联系人</text>
            <text class="info-value">{{ order.contact || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ order.phone || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">开户银行</text>
            <text class="info-value">{{ order.bank_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">开户地址</text>
            <text class="info-value">{{ order.bank_address || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">开户户名</text>
            <text class="info-value">{{ order.bank_account_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">开户户号</text>
            <text class="info-value">{{ order.bank_account || '-' }}</text>
          </view>
          
          <view class="info-item" style="width: 100%;">
            <text class="info-label">采购单备注信息</text>
            <text class="info-value remarks-value">{{ order.purchase_remark || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">完成时间</text>
            <text class="info-value date-text">{{ formatDate(order.completed_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">入库开始时间</text>
            <text class="info-value date-text">{{ formatDate(order.inbound_start_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">采购完成时间</text>
            <text class="info-value date-text">{{ formatDate(order.purchase_completed_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">采购开始时间</text>
            <text class="info-value date-text">{{ formatDate(order.purchase_start_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value date-text">{{ formatDate(order.created_at || order.createdAt) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">更新时间</text>
            <text class="info-value date-text">{{ formatDate(order.updated_at || order.updatedAt) }}</text>
          </view>
        </view>
      </view>

      <!-- 商品明细 -->
      <view class="card">
        <view class="card-title">商品明细 ({{ order.items?.length || 0 }} 项)</view>
        <view class="product-item-list">
          <view class="product-item-card" v-for="(item, index) in order.items" :key="index">
            <!-- 头部：商品名称与规格 -->
            <view class="prod-header">
              <text class="prod-title">#{{ index + 1 }} {{ item.product_name || '-' }}</text>
              <text class="prod-spec" v-if="item.spec">{{ item.spec }}</text>
            </view>
            
            <!-- 编码 -->
            <view class="prod-code-row" v-if="item.code">
              <text class="prod-code-label">编码：</text>
              <text class="prod-code-val">{{ item.code }}</text>
            </view>
            
            <!-- 紧凑网格详情 -->
            <view class="prod-details-grid">
              <!-- 第一行：单位、单价 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">单位：</text><text class="cell-val">{{ item.unit_name || '-' }}</text></view>
                <view class="grid-cell"><text class="cell-lbl">采购单价：</text><text class="cell-val">¥{{ formatPrice(item.price) }}</text></view>
              </view>
              <!-- 第二行：数量、税额/税率 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">采购数量：</text><text class="cell-val">{{ item.quantity }}</text></view>
                <view class="grid-cell"><text class="cell-lbl">税额/率：</text><text class="cell-val">¥{{ formatPrice(item.tax) }} ({{ item.tax_rate }}%)</text></view>
              </view>
              <!-- 第三行：采购金额 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">采购金额：</text><text class="cell-val danger-text">¥{{ formatPrice(item.amount) }}</text></view>
                <view class="grid-cell" v-if="item.final_quantity !== null"><text class="cell-lbl">最终数量：</text><text class="cell-val">{{ item.final_quantity }}</text></view>
              </view>
              <!-- 第四行：最终单价、最终金额 -->
              <view class="grid-row" v-if="item.final_quantity !== null">
                <view class="grid-cell"><text class="cell-lbl">最终单价：</text><text class="cell-val">¥{{ formatPrice(item.final_price) }}</text></view>
                <view class="grid-cell"><text class="cell-lbl">最终金额：</text><text class="cell-val danger-text">¥{{ formatPrice(item.final_amount) }}</text></view>
              </view>
              <!-- 第五行：已入库、已退货 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">已入库：</text><text class="cell-val success">{{ item.inbounded_quantity }}</text></view>
                <view class="grid-cell"><text class="cell-lbl">已退货：</text><text class="cell-val warning">{{ item.returned_quantity }}</text></view>
              </view>
              <!-- 第六行：待入库、备注 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">待入库：</text><text class="cell-val primary">{{ item.remaining_quantity }}</text></view>
                <view class="grid-cell" v-if="item.remark"><text class="cell-lbl">备注：</text><text class="cell-val remark-text">{{ item.remark }}</text></view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">订单不存在</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="order.id" class="bottom-bar safe-bottom">
      <button v-if="Number(order.status) === 0" class="btn-submit primary" @click="handleSubmit">提 审</button>
      <button v-if="Number(order.status) === 2" class="btn-primary" @click="handleAudit">审核通过</button>
      
      <button class="btn-more outline" @click="showMore">更 多</button>
      <button class="btn-back" @click="goBack">返回</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { purchaseApi } from '@/api/purchase'

const order = ref({})
const loading = ref(true)

const statusMap = {
  0: '草稿',
  1: '采购中',
  2: '待审核',
  3: '已取消',
  4: '已关闭',
  5: '已审核',
  6: '已采购',
  7: '入库中',
  8: '已完成',
  9: '已拒绝'
}

const getStatusType = (status) => {
  const map = {
    0: 'info',
    1: 'primary',
    2: 'warning',
    3: 'error',
    4: 'info',
    5: 'success',
    6: 'primary',
    7: 'warning',
    8: 'success',
    9: 'error'
  }
  return map[status] || 'info'
}

const paymentStatusMap = {
  0: '未付款',
  1: '部分付款',
  2: '已付款'
}

const getPaymentStatusType = (status) => {
  const map = {
    0: 'info',
    1: 'warning',
    2: 'success'
  }
  return map[status] || 'info'
}

const returnStatusMap = {
  0: '无退货',
  1: '已退货'
}

const getReturnStatusType = (status) => {
  const map = {
    0: 'info',
    1: 'danger'
  }
  return map[status] || 'info'
}

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const formatDate = (val) => {
  if (!val) return '-'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

const copyOrderNo = () => {
  if (!order.value.order_no) return
  uni.setClipboardData({
    data: order.value.order_no,
    success: () => {
      uni.showToast({ title: '复制单号成功', icon: 'none' })
    }
  })
}

const loadDetail = async () => {
  const pages = getCurrentPages()
  const id = pages[pages.length - 1].$page?.options?.id
  if (!id) { loading.value = false; return }

  loading.value = true
  try {
    const res = await purchaseApi.getOrderDetail(id)
    if (res.code === 0) {
      order.value = res.data || {}
    }
  } catch (e) {
    // Interceptor auto toasts
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  uni.showModal({
    title: '确认提审',
    content: '提交后将不可修改，确定提交审核吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const submitRes = await purchaseApi.submitOrder(order.value.id)
          if (submitRes.code === 0) {
            uni.showToast({ title: '提审成功', icon: 'success' })
            loadDetail()
          }
        } catch (e) { /* handled */ }
      }
    }
  })
}

const handleAudit = async () => {
  uni.showModal({
    title: '确认审核通过',
    content: '审核通过后将生成采购入库单。',
    success: async (res) => {
      if (res.confirm) {
        try {
          const auditRes = await purchaseApi.auditOrder(order.value.id, { approved: true })
          if (auditRes.code === 0) {
            uni.showToast({ title: '已通过', icon: 'success' })
            loadDetail()
          }
        } catch (e) { /* handled */ }
      }
    }
  })
}

const handleReject = () => {
  uni.showModal({
    title: '确认拒绝',
    content: '确认拒绝该采购订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const rejectRes = await purchaseApi.rejectOrder(order.value.id)
          if (rejectRes.code === 0) {
            uni.showToast({ title: '已拒绝', icon: 'success' })
            loadDetail()
          }
        } catch (e) { /* handled */ }
      }
    }
  })
}

const handleCancel = () => {
  uni.showModal({
    title: '确认取消',
    content: '确定取消并关闭此采购订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const cancelRes = await purchaseApi.cancelOrder(order.value.id)
          if (cancelRes.code === 0) {
            uni.showToast({ title: '已取消订单', icon: 'success' })
            setTimeout(() => uni.navigateBack(), 500)
          }
        } catch (e) { /* handled */ }
      }
    }
  })
}

const goEdit = () => {
  uni.navigateTo({ url: `/pages/purchase/order-edit?id=${order.value.id}` })
}

const goBack = () => {
  uni.navigateBack()
}

const startPurchase = () => {
  uni.showModal({
    title: '确认开始采购',
    content: `确认开始采购订单 ${order.value.order_no || ''} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const startRes = await purchaseApi.startPurchase(order.value.id)
          if (startRes.code === 0) {
            uni.showToast({ title: '已开始采购', icon: 'success' })
            loadDetail()
          }
        } catch (e) { /* handled */ }
      }
    }
  })
}

const confirmPurchased = () => {
  uni.showModal({
    title: '已采确认',
    content: `确认已采购订单 ${order.value.order_no || ''} 吗？将使用原采购数量与单价。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const items = (order.value.items || []).map(it => ({
            id: it.id,
            final_quantity: Number(it.quantity || 0),
            final_price: Number(it.price || 0),
            final_tax: Number(it.tax || 0),
            final_amount: Number(it.amount || 0),
            final_remark: it.remark || ''
          }))
          const confirmRes = await purchaseApi.confirmPurchased(order.value.id, {
            payment_method: order.value.payment_method || '',
            admin_remark: order.value.admin_remark || '',
            purchase_remark: order.value.purchase_remark || '',
            items
          })
          if (confirmRes.code === 0) {
            uni.showToast({ title: '已采确认成功', icon: 'success' })
            loadDetail()
          }
        } catch (e) { /* handled */ }
      }
    }
  })
}

const inboundOrder = () => {
  uni.navigateTo({
    url: `/pages/purchase/inbound-edit?order_id=${order.value.id}`
  })
}

const returnOrder = () => {
  uni.navigateTo({
    url: `/pages/purchase/return-edit?order_id=${order.value.id}`
  })
}

const closeOrder = () => {
  uni.showModal({
    title: '确认关闭',
    content: `确认关闭采购订单 ${order.value.order_no || ''} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const closeRes = await purchaseApi.closeOrder(order.value.id)
          if (closeRes.code === 0) {
            uni.showToast({ title: '已关闭', icon: 'success' })
            loadDetail()
          }
        } catch (e) { /* handled */ }
      }
    }
  })
}

const deleteOrder = () => {
  uni.showModal({
    title: '确认删除',
    content: `确认删除采购订单 ${order.value.order_no || ''} 吗？此操作不可恢复。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const deleteRes = await purchaseApi.deleteOrder(order.value.id)
          if (deleteRes.code === 0) {
            uni.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => uni.navigateBack(), 500)
          }
        } catch (e) { /* handled */ }
      }
    }
  })
}

const showMore = () => {
  const status = Number(order.value.status)
  const hasRemaining = (order.value.items || []).some(it => Number(it.remaining_quantity || 0) > 0)
  
  const menu = []
  const actions = []
  if (status === 0) actions.push({ command: 'edit', label: '编辑' }, { command: 'submit', label: '提交审核' }, { command: 'cancel', label: '取消' })
  if (status === 2) actions.push({ command: 'audit', label: '审核通过' }, { command: 'reject', label: '拒绝' }, { command: 'cancel', label: '取消' })
  if (status === 5) actions.push({ command: 'startPurchase', label: '开始采购' }, { command: 'cancel', label: '取消' }, { command: 'close', label: '关闭' })
  if (status === 1) actions.push({ command: 'confirmPurchased', label: '已采确认' }, { command: 'cancel', label: '取消' })
  if ([6, 7, 8].includes(status) && hasRemaining) actions.push({ command: 'inbound', label: '入库' }, { command: 'returnOrder', label: '退单' })
  if ([6, 7, 8].includes(status)) actions.push({ command: 'close', label: '关闭' })
  if ([3, 4].includes(status)) actions.push({ command: 'delete', label: '删除' })

  actions.forEach(act => {
    menu.push(act.label)
  })
  menu.push('复制单号')

  uni.showActionSheet({
    itemList: menu,
    success: ({ tapIndex }) => {
      const actionLabel = menu[tapIndex]
      if (actionLabel === '复制单号') {
        copyOrderNo()
      } else {
        const clickedAction = actions.find(act => act.label === actionLabel)
        if (clickedAction) {
          const cmd = clickedAction.command
          if (cmd === 'edit') goEdit()
          else if (cmd === 'submit') handleSubmit()
          else if (cmd === 'cancel') handleCancel()
          else if (cmd === 'audit') handleAudit()
          else if (cmd === 'reject') handleReject()
          else if (cmd === 'startPurchase') startPurchase()
          else if (cmd === 'confirmPurchased') confirmPurchased()
          else if (cmd === 'inbound') inboundOrder()
          else if (cmd === 'returnOrder') returnOrder()
          else if (cmd === 'close') closeOrder()
          else if (cmd === 'delete') deleteOrder()
        }
      }
    }
  })
}

onShow(() => {
  uni.hideTabBar()
  loadDetail()
})
</script>

<style lang="scss" scoped>
.order-detail {
  min-height: 100vh;
  background: #F5F7FA;
  box-sizing: border-box;
  padding-bottom: calc(140rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
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
    padding: 12rpx 8rpx;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    
    .info-label { font-size: 22rpx; color: #909399; display: block; margin-bottom: 6rpx; }
    .info-value { font-size: 26rpx; color: #303133; display: block; font-weight: 600; word-break: break-all; }
    .date-text { color: #909399; font-size: 24rpx; }
    
    &.order-no-item {
      .info-value-copy {
        display: flex;
        align-items: center;
        gap: 8rpx;
      }
      .copy-icon {
        flex-shrink: 0;
        cursor: pointer;
        
        &:active {
          opacity: 0.6;
        }
      }
    }
  }
}

.remarks-value {
  white-space: pre-wrap;
  line-height: 1.45;
}

.product-item-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.product-item-card {
  background: #F8FAFC;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  border: 1rpx solid #EEF2F6;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.prod-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  border-bottom: 1rpx solid #EEF2F6;
  padding-bottom: 8rpx;
}

.prod-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #303133;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.prod-spec {
  font-size: 20rpx;
  background: #E8F4FF;
  color: #1890FF;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  max-width: 180rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.prod-code-row {
  display: flex;
  align-items: center;
  font-size: 20rpx;
  color: #909399;
}

.prod-code-val {
  font-family: monospace;
}

.prod-details-grid {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.grid-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.grid-cell {
  flex: 1;
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: #606266;
  min-width: 0;
}

.cell-lbl {
  color: #909399;
  flex-shrink: 0;
}

.cell-val {
  font-weight: 600;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  
  &.primary {
    color: #1890FF;
  }
  
  &.success {
    color: #67C23A;
  }
  
  &.warning {
    color: #E6A23C;
  }
  
  &.danger-text {
    color: #F56C6C;
  }
}

.remark-text {
  font-size: 20rpx;
  color: #909399;
  font-weight: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 99;

  button {
    height: 76rpx;
    line-height: 76rpx;
    padding: 0 32rpx;
    font-size: 26rpx;
    border-radius: 16rpx;
    font-weight: 600;
    margin: 0;
    
    &::after { border: none; }
    
    &.outline {
      background: #FFFFFF;
      color: #909399;
      border: 1rpx solid #DCDFE6;
    }
    
    &.warning {
      background: #FF9800;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(255, 152, 0, 0.2);
    }

    &.primary {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
    }
    
    &.btn-primary {
      background: #67C23A;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(103, 194, 58, 0.2);
    }
    
    &.btn-danger {
      background: #F56C6C;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(245, 108, 108, 0.2);
    }
    
    &.btn-back {
      background: #F4F4F5;
      color: #909399;
    }
  }
}

.empty-state, .loading-state {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
  .empty-text { font-size: 26rpx; color: #C0C4CC; }
}
</style>
