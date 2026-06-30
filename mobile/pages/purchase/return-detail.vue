<template>
  <view class="return-detail">
    <view v-if="ret.id" class="detail-content">
      <!-- 退货基本信息 -->
      <view class="card">
        <view class="card-title">基本信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">退货单ID</text>
            <text class="info-value">{{ ret.id }}</text>
          </view>
          
          <view class="info-item order-no-item">
            <text class="info-label">退货单号</text>
            <view class="info-value-copy">
              <text class="info-value">{{ ret.return_no }}</text>
              <u-icon name="file-text" size="14" color="#1890FF" class="copy-icon" @click="copyReturnNo"  />
            </view>
          </view>
          
          <view class="info-item order-no-item">
            <text class="info-label">采购单号</text>
            <view class="info-value-copy">
              <text class="info-value">{{ ret.order_no || '-' }}</text>
              <u-icon v-if="ret.order_no" name="file-text" size="14" color="#1890FF" class="copy-icon" @click="copyOrderNo"  />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">退货状态</text>
            <view class="info-value">
              <uni-tag :text="statusMap[ret.status] || '未知'" size="small" :type="getStatusType(ret.status)" />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">供应商</text>
            <text class="info-value">{{ ret.supplier_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">单价</text>
            <text class="info-value">¥{{ formatPrice(ret.unit_price) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">税金</text>
            <text class="info-value">¥{{ formatPrice(ret.tax_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">退款总额</text>
            <text class="info-value text-danger font-bold">¥{{ formatPrice(ret.refund_total_amount || ret.total_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">退货总数量</text>
            <text class="info-value">{{ ret.refund_total_quantity || ret.total_quantity || 0 }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">联系人</text>
            <text class="info-value">{{ ret.contact || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ ret.phone || '-' }}</text>
          </view>
          
          <view class="info-item" style="width: 100%;">
            <text class="info-label">收货地址</text>
            <text class="info-value">{{ ret.address || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">快递名称</text>
            <text class="info-value">{{ ret.express_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">快递单号</text>
            <text class="info-value">{{ ret.express_no || '-' }}</text>
          </view>

          <view class="info-item">
            <text class="info-label">制单人</text>
            <text class="info-value">{{ ret.creator_name || '-' }}</text>
          </view>

          <view class="info-item" style="width: 100%;">
            <text class="info-label">备注信息</text>
            <text class="info-value remarks-value">{{ ret.reason || ret.remark || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">完成时间</text>
            <text class="info-value date-text">{{ formatDate(ret.completed_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">取消时间</text>
            <text class="info-value date-text">{{ formatDate(ret.cancel_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value date-text">{{ formatDate(ret.created_at || ret.createdAt) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">更新时间</text>
            <text class="info-value date-text">{{ formatDate(ret.updated_at || ret.updatedAt) }}</text>
          </view>
        </view>
      </view>

      <!-- 退货明细 -->
      <view class="card">
        <view class="card-title">退货明细 ({{ ret.items?.length || 0 }} 项)</view>
        <view class="product-item-list">
          <view class="product-item-card" v-for="(item, index) in ret.items" :key="index">
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
              <!-- 第一行：单位、退货单价 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">单位：</text><text class="cell-val">{{ item.unit_name || '-' }}</text></view>
                <view class="grid-cell"><text class="cell-lbl">退货单价：</text><text class="cell-val">¥{{ formatPrice(item.price) }}</text></view>
              </view>
              <!-- 第二行：退货数量、退款金额 -->
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">退货数量：</text><text class="cell-val danger-text">{{ item.quantity }}</text></view>
                <view class="grid-cell"><text class="cell-lbl">退款金额：</text><text class="cell-val danger-text">¥{{ formatPrice(item.amount) }}</text></view>
              </view>
              <!-- 第三行：备注说明 -->
              <view class="grid-row" v-if="item.remark">
                <view class="grid-cell"><text class="cell-lbl">备注：</text><text class="cell-val remark-text">{{ item.remark }}</text></view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">退货单不存在</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="ret.id" class="bottom-bar safe-bottom">
      <button v-if="Number(ret.status) === 0" class="btn-primary" @click="openConfirmPopup">确认退货</button>
      <button class="btn-back" @click="goBack">返回</button>
    </view>

    <!-- 确认退货弹窗 -->
    <view v-if="showConfirmPopup" class="popup-overlay" @click="closePopup">
      <view class="popup-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sheet-title">确认退货并填写物流</text>
          <view class="close-btn" @click="closePopup">
            <u-icon name="close" size="20" color="#999"></u-icon>
          </view>
        </view>

        <view class="sheet-body">
          <view class="form-item">
            <text class="form-label">物流公司</text>
            <input class="form-input" v-model="form.express_name" placeholder="请输入物流公司名称" placeholder-style="color: #909399" />
          </view>
          <view class="form-item">
            <text class="form-label">快递单号</text>
            <input class="form-input" v-model="form.express_no" placeholder="请输入快递单号" placeholder-style="color: #909399" />
          </view>
          <view class="form-item">
            <text class="form-label">备注说明</text>
            <textarea class="form-textarea" v-model="form.remark" placeholder="请输入备注说明（最多200字）" placeholder-style="color: #909399" :maxlength="200" />
          </view>
        </view>

        <view class="sheet-footer">
          <button class="btn-cancel" @click="closePopup">取消</button>
          <button class="btn-confirm" @click="submitConfirm">确认退货</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { purchaseApi } from '@/api/purchase'

const ret = ref({})
const loading = ref(true)
const showConfirmPopup = ref(false)

const form = ref({
  express_name: '',
  express_no: '',
  remark: ''
})

const statusMap = {
  0: '待退货',
  1: '已退货'
}

const getStatusType = (status) => {
  const map = {
    0: 'warning',
    1: 'success'
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

const copyReturnNo = () => {
  if (!ret.value.return_no) return
  uni.setClipboardData({
    data: ret.value.return_no,
    success: () => {
      uni.showToast({ title: '复制退货单号成功', icon: 'none' })
    }
  })
}

const copyOrderNo = () => {
  if (!ret.value.order_no) return
  uni.setClipboardData({
    data: ret.value.order_no,
    success: () => {
      uni.showToast({ title: '复制采购单号成功', icon: 'none' })
    }
  })
}

const loadDetail = async () => {
  const pages = getCurrentPages()
  const id = pages[pages.length - 1].$page?.options?.id
  if (!id) { loading.value = false; return }

  loading.value = true
  try {
    const res = await purchaseApi.getReturnDetail(id)
    if (res.code === 0) {
      ret.value = res.data || {}
    }
  } catch (e) {
    // Interceptor auto toasts
  } finally {
    loading.value = false
  }
}

const openConfirmPopup = () => {
  form.value = {
    express_name: '',
    express_no: '',
    remark: ''
  }
  showConfirmPopup.value = true
}

const closePopup = () => {
  showConfirmPopup.value = false
}

const submitConfirm = async () => {
  if (!form.value.express_name.trim()) {
    uni.showToast({ title: '请输入物流公司', icon: 'none' })
    return
  }
  if (!form.value.express_no.trim()) {
    uni.showToast({ title: '请输入快递单号', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在提交...' })
  try {
    const res = await purchaseApi.completeReturn(ret.value.id, {
      express_name: form.value.express_name.trim(),
      express_no: form.value.express_no.trim(),
      remark: form.value.remark.trim()
    })
    if (res.code === 0) {
      uni.showToast({ title: '退货成功', icon: 'success' })
      closePopup()
      loadDetail()
    }
  } catch (e) {
    // Handled
  } finally {
    uni.hideLoading()
  }
}

const goBack = () => {
  uni.navigateBack()
}

onShow(() => {
  uni.hideTabBar()
  loadDetail()
})
</script>

<style lang="scss" scoped>
.return-detail {
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

    &.btn-primary {
      background: #67C23A;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(103, 194, 58, 0.2);
    }
    
    &.btn-back {
      background: #F4F4F5;
      color: #909399;
    }
  }
}

/* 弹出层 */
.popup-overlay {
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

.popup-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.sheet-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30rpx;
  position: relative;
  border-bottom: 1rpx solid #F2F6FC;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #303133;
}

.close-btn {
  position: absolute;
  right: 30rpx;
  top: 30rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-body {
  padding: 30rpx;
  
  .form-item {
    margin-bottom: 24rpx;
    
    .form-label {
      font-size: 26rpx;
      color: #606266;
      font-weight: 500;
      margin-bottom: 12rpx;
      display: block;
    }
    
    .form-input {
      background: #F5F7FA;
      border-radius: 12rpx;
      height: 80rpx;
      padding: 0 24rpx;
      font-size: 28rpx;
      color: #303133;
      width: 100%;
      box-sizing: border-box;
    }
    
    .form-textarea {
      background: #F5F7FA;
      border-radius: 12rpx;
      height: 160rpx;
      padding: 20rpx 24rpx;
      font-size: 28rpx;
      color: #303133;
      width: 100%;
      box-sizing: border-box;
    }
  }
}

.sheet-footer {
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
    
    &.btn-confirm {
      background: #67C23A;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(103, 194, 58, 0.2);
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
