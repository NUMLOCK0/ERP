<template>
  <view class="delivery-detail">
    <view v-if="delivery.id" class="detail-content">
      <!-- 销售发货单基本信息 -->
      <view class="card">
        <view class="card-title">基本信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">发货单id</text>
            <text class="info-value">{{ delivery.id }}</text>
          </view>
          
          <view class="info-item order-no-item">
            <text class="info-label">发货单号</text>
            <view class="info-value-copy">
              <text class="info-value">{{ delivery.delivery_no }}</text>
              <u-icon name="file-text" size="14" color="#1890FF" class="copy-icon" @click="copyDeliveryNo"  />
            </view>
          </view>
          
          <view class="info-item order-no-item">
            <text class="info-label">销售单号</text>
            <view class="info-value-copy">
              <text class="info-value">{{ delivery.order_no || '-' }}</text>
              <u-icon v-if="delivery.order_no" name="file-text" size="14" color="#1890FF" class="copy-icon" @click="copyOrderNo"  />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">发货状态</text>
            <view class="info-value">
              <uni-tag :text="statusMap[delivery.status] || '未知'" size="small" :type="getStatusType(delivery.status)" />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">退货状态</text>
            <view class="info-value">
              <uni-tag :text="returnStatusMap[delivery.return_status] || '无退货'" size="small" :type="getReturnStatusType(delivery.return_status)" />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">仓库</text>
            <text class="info-value">{{ delivery.warehouse_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">客户</text>
            <text class="info-value">{{ delivery.customer_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">职员</text>
            <text class="info-value">{{ delivery.employee_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">单价</text>
            <text class="info-value">
              {{ delivery.unit_price === null || delivery.unit_price === undefined ? (delivery.items?.length > 1 ? '多产品' : '-') : `¥${formatPrice(delivery.unit_price)}` }}
            </text>
          </view>
          
          <view class="info-item">
            <text class="info-label">税金</text>
            <text class="info-value">¥{{ formatPrice(delivery.total_tax) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">总价</text>
            <text class="info-value text-danger font-bold">¥{{ formatPrice(delivery.total_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">发货总数量</text>
            <text class="info-value">{{ delivery.delivery_total_quantity || 0 }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">退款金额</text>
            <text class="info-value">¥{{ formatPrice(delivery.refund_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">退货数量</text>
            <text class="info-value">{{ delivery.return_quantity || 0 }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">联系人</text>
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
          
          <view class="info-item">
            <text class="info-label">快递名称</text>
            <text class="info-value">{{ delivery.logistics_company || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">快递单号</text>
            <text class="info-value">{{ delivery.logistics_no || '-' }}</text>
          </view>
          
          <view class="info-item" style="width: 100%;">
            <text class="info-label">管理员备注信息</text>
            <text class="info-value remarks-value">{{ delivery.admin_remark || '-' }}</text>
          </view>
          
          <view class="info-item" style="width: 100%;">
            <text class="info-label">发货单备注信息</text>
            <text class="info-value remarks-value">{{ delivery.delivery_remark || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">完成时间</text>
            <text class="info-value date-text">{{ formatDate(delivery.completed_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">发货时间</text>
            <text class="info-value date-text">{{ formatDate(delivery.shipped_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">取消时间</text>
            <text class="info-value date-text">{{ formatDate(delivery.cancel_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">关闭时间</text>
            <text class="info-value date-text">{{ formatDate(delivery.close_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value date-text">{{ formatDate(delivery.created_at || delivery.createdAt) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">更新时间</text>
            <text class="info-value date-text">{{ formatDate(delivery.updated_at || delivery.updatedAt) }}</text>
          </view>
        </view>
      </view>

      <!-- 商品明细 -->
      <view class="card">
        <view class="card-title">商品明细 ({{ delivery.items?.length || 0 }} 项)</view>
        <view class="product-item-list">
          <view class="product-item-card" v-for="(item, index) in delivery.items" :key="index">
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
                <view class="grid-cell"><text class="cell-lbl">销售单价：</text><text class="cell-val">¥{{ formatPrice(item.price) }}</text></view>
              </view>
              <!-- 第二行：发货数量、金额 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">发货数量：</text><text class="cell-val success">{{ item.quantity }}</text></view>
                <view class="grid-cell"><text class="cell-lbl">发货税金：</text><text class="cell-val">¥{{ formatPrice(item.tax) }}</text></view>
              </view>
              <!-- 第三行：发货金额 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">发货金额：</text><text class="cell-val danger-text">¥{{ formatPrice(item.amount) }}</text></view>
                <view class="grid-cell"><text class="cell-lbl">已退数量：</text><text class="cell-val warning">{{ item.returned_quantity || 0 }}</text></view>
              </view>
            </view>
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
      <button v-if="Number(delivery.status) === 0" class="btn-submit primary" @click="openShipPopup">确认发货</button>
      <button v-if="Number(delivery.status) === 1" class="btn-primary" @click="handleReceive">确认签收</button>
      
      <button class="btn-more outline" @click="showMore">更 多</button>
      <button class="btn-back" @click="goBack">返回</button>
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
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
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
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { saleApi } from '@/api/sale'

const delivery = ref({})
const loading = ref(true)

const statusMap = {
  0: '待发货',
  1: '已发货',
  2: '已签收',
  3: '已取消',
  4: '已关闭'
}

const getStatusType = (status) => {
  const map = {
    0: 'warning',
    1: 'primary',
    2: 'success',
    3: 'error',
    4: 'default'
  }
  return map[status] || 'info'
}

const returnStatusMap = {
  0: '无退货',
  1: '有退货'
}

const getReturnStatusType = (status) => {
  const map = {
    0: 'info',
    1: 'warning'
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

const copyDeliveryNo = () => {
  if (!delivery.value.delivery_no) return
  uni.setClipboardData({
    data: delivery.value.delivery_no,
    success: () => {
      uni.showToast({ title: '复制发货单号成功', icon: 'none' })
    }
  })
}

const copyOrderNo = () => {
  if (!delivery.value.order_no) return
  uni.setClipboardData({
    data: delivery.value.order_no,
    success: () => {
      uni.showToast({ title: '复制销售单号成功', icon: 'none' })
    }
  })
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

const handleCancel = () => {
  uni.showModal({
    title: '确认取消发货单',
    content: '确定要取消该销售发货单吗？取消后需要重新生成。',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '取消中...' })
        try {
          const ret = await saleApi.cancelDelivery(delivery.value.id)
          if (ret.code === 0) {
            uni.showToast({ title: '已取消', icon: 'success' })
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

const handleReturn = () => {
  uni.navigateTo({
    url: `/pages/sale/return-edit?delivery_id=${delivery.value.id}`
  })
}

const showMore = () => {
  const status = Number(delivery.value.status)
  const menu = []
  const actions = []

  if (status === 0) {
    actions.push(
      { command: 'ship', label: '确认发货' },
      { command: 'cancel', label: '取消发货单' }
    )
  }
  if (status === 1) {
    actions.push(
      { command: 'receive', label: '确认签收' },
      { command: 'return', label: '退货' }
    )
  }
  if (status === 2) {
    actions.push(
      { command: 'return', label: '退货' }
    )
  }

  actions.forEach(act => {
    menu.push(act.label)
  })
  menu.push('复制发货单号')
  menu.push('复制销售单号')

  uni.showActionSheet({
    itemList: menu,
    success: ({ tapIndex }) => {
      const actionLabel = menu[tapIndex]
      if (actionLabel === '复制发货单号') {
        copyDeliveryNo()
      } else if (actionLabel === '复制销售单号') {
        copyOrderNo()
      } else {
        const clickedAction = actions.find(act => act.label === actionLabel)
        if (clickedAction) {
          const cmd = clickedAction.command
          if (cmd === 'ship') openShipPopup()
          else if (cmd === 'receive') handleReceive()
          else if (cmd === 'cancel') handleCancel()
          else if (cmd === 'return') handleReturn()
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
.delivery-detail {
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

/* 弹出层 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
  display: flex;
  align-items: flex-end;
}

.dialog-content {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.dialog-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30rpx;
  position: relative;
  border-bottom: 1rpx solid #F2F6FC;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #303133;
}

.dialog-close {
  position: absolute;
  right: 30rpx;
  top: 30rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  color: #909399;
}

.dialog-body {
  padding: 30rpx;
  
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
    
    .form-label {
      font-size: 26rpx;
      color: #606266;
      font-weight: 500;
      flex-shrink: 0;
      width: 180rpx;
    }
    
    .form-input {
      flex: 1;
      text-align: right;
      font-size: 28rpx;
      color: #303133;
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
  }
}

.dialog-footer {
  display: flex;
  gap: 20rpx;
  padding: 0 30rpx 20rpx;
  
  button {
    flex: 1;
    height: 88rpx;
    line-height: 88rpx;
    font-size: 28rpx;
    font-weight: 600;
    border-radius: 44rpx;
    margin: 0;
    
    &::after { border: none; }
    
    &.btn-cancel {
      background: #F4F4F5;
      color: #909399;
    }
    
    &.btn-primary {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
    }
  }
}
</style>
