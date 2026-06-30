<template>
  <view class="payment-detail">
    <view v-if="ret.id" class="detail-content">
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">基本信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">付款单id</text>
            <text class="info-value">{{ ret.id }}</text>
          </view>
          
          <view class="info-item order-no-item">
            <text class="info-label">付款单号</text>
            <view class="info-value-copy">
              <text class="info-value">{{ ret.payment_no }}</text>
              <u-icon name="file-text" size="14" color="#1890FF" class="copy-icon" @click="copyPaymentNo"  />
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
            <text class="info-label">付款状态</text>
            <view class="info-value">
              <uni-tag :text="statusMap[ret.status] || '未知'" size="small" :type="getStatusType(ret.status)" />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">供应商</text>
            <text class="info-value">{{ ret.supplier_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">已付款总额</text>
            <text class="info-value text-success font-bold">¥{{ formatPrice(ret.paid_total_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">应收总额</text>
            <text class="info-value font-bold">¥{{ formatPrice(ret.receivable_total_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">付款方式</text>
            <text class="info-value">{{ ret.pay_method || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">开票时间</text>
            <text class="info-value date-text">{{ formatDate(ret.invoice_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">开票状态</text>
            <view class="info-value">
              <uni-tag :text="invoiceStatusMap[ret.invoice_status] || '未开票'" size="small" :type="getInvoiceStatusType(ret.invoice_status)" />
            </view>
          </view>
          
          <view class="info-item">
            <text class="info-label">已开票金额</text>
            <text class="info-value">¥{{ formatPrice(ret.invoice_total_amount || 0) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">采购总额</text>
            <text class="info-value">¥{{ formatPrice(ret.purchase_total_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">采购产品总数量</text>
            <text class="info-value">{{ ret.purchase_total_quantity || 0 }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">采购退款金额</text>
            <text class="info-value">¥{{ formatPrice(ret.purchase_refund_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">采购退货金额</text>
            <text class="info-value">¥{{ formatPrice(ret.purchase_return_amount) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">联系人</text>
            <text class="info-value">{{ ret.contact || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ ret.phone || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">开户银行</text>
            <text class="info-value">{{ ret.bank_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">开户地址</text>
            <text class="info-value">{{ ret.bank_address || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">开户户名</text>
            <text class="info-value">{{ ret.bank_account_name || '-' }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">开户户号</text>
            <text class="info-value">{{ ret.bank_account || '-' }}</text>
          </view>

          <view class="info-item">
            <text class="info-label">制单人</text>
            <text class="info-value">{{ ret.creator_name || '-' }}</text>
          </view>

          <view class="info-item" style="width: 100%;">
            <text class="info-label">详细地址</text>
            <text class="info-value">{{ ret.detail_address || '-' }}</text>
          </view>

          <view class="info-item" style="width: 100%;">
            <text class="info-label">备注信息</text>
            <text class="info-value remarks-value">{{ ret.remark || ret.detail_remark || '-' }}</text>
          </view>

          <view class="info-item">
            <text class="info-label">付款开始时间</text>
            <text class="info-value date-text">{{ formatDate(ret.payment_start_time) }}</text>
          </view>
          
          <view class="info-item">
            <text class="info-label">付款完成时间</text>
            <text class="info-value date-text">{{ formatDate(ret.payment_completed_time) }}</text>
          </view>

          <view class="info-item">
            <text class="info-label">关闭时间</text>
            <text class="info-value date-text">{{ formatDate(ret.close_time) }}</text>
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

      <!-- 付款记录 -->
      <view class="card">
        <view class="card-title">付款明细历史</view>
        <view class="product-item-list" v-if="ret.payment_records && ret.payment_records.length > 0">
          <view class="product-item-card" v-for="(record, idx) in ret.payment_records" :key="idx">
            <view class="prod-header">
              <text class="prod-title">#{{ idx + 1 }} 付款记录</text>
              <text class="prod-spec">{{ record.pay_method || '-' }}</text>
            </view>
            <view class="prod-details-grid">
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">付款人：</text><text class="cell-val">{{ record.payer || '-' }}</text></view>
                <view class="grid-cell"><text class="cell-lbl">付款金额：</text><text class="cell-val danger-text">¥{{ formatPrice(record.amount) }}</text></view>
              </view>
              <view class="grid-row">
                <view class="grid-cell"><text class="cell-lbl">付款时间：</text><text class="cell-val date-text">{{ formatDate(record.pay_time) }}</text></view>
              </view>
              <view class="grid-row" v-if="record.remark">
                <view class="grid-cell"><text class="cell-lbl">备注说明：</text><text class="cell-val remark-text">{{ record.remark }}</text></view>
              </view>
            </view>
          </view>
        </view>
        <view class="empty-records" v-else>
          <text class="empty-records-text">暂无历史付款流水</text>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">付款单不存在</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="ret.id" class="bottom-bar safe-bottom">
      <button v-if="Number(ret.status) < 2" class="btn-primary" @click="openConfirmPopup">付款</button>
      <button class="btn-more outline" @click="showMore">更 多</button>
      <button class="btn-back" @click="goBack">返回</button>
    </view>

    <!-- 确认付款弹窗 -->
    <view v-if="showConfirmPopup" class="popup-overlay" @click="closePopup">
      <view class="popup-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sheet-title">确认付款</text>
          <view class="close-btn" @click="closePopup">
            <u-icon name="close" size="20" color="#999"></u-icon>
          </view>
        </view>

        <view class="sheet-body">
          <view class="form-item">
            <text class="form-label">未付总金额</text>
            <text class="product-info-text text-danger font-bold">¥{{ formatPrice(ret.unpaid_total_amount) }}</text>
          </view>
          <view class="form-item">
            <text class="form-label required">付款金额</text>
            <input class="form-input" type="digit" v-model="form.amount" placeholder="请输入付款金额" />
          </view>
          <view class="form-item">
            <text class="form-label required">付款人</text>
            <input class="form-input" v-model="form.payer" placeholder="请输入付款人" maxlength="30" />
          </view>
          <view class="form-item">
            <text class="form-label required">付款日期</text>
            <picker class="form-picker" mode="date" :value="payDate" @change="onPayDateChange">
              <view class="picker-inner">
                <text class="picker-value" :class="{ placeholder: !payDate }">
                  {{ payDate || '请选择付款日期' }}
                </text>
                <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label required">付款方式</text>
            <input class="form-input" v-model="form.pay_method" placeholder="请输入付款方式" maxlength="50" />
          </view>
          <view class="form-item">
            <text class="form-label">备注说明</text>
            <textarea class="form-textarea" v-model="form.remark" placeholder="请输入备注说明（最多300字）" :maxlength="300" />
          </view>
        </view>

        <view class="sheet-footer">
          <button class="btn-cancel" @click="closePopup">取消</button>
          <button class="btn-confirm" @click="submitConfirm">确认付款</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { financeApi } from '@/api/finance'

const ret = ref({})
const loading = ref(true)
const showConfirmPopup = ref(false)

const payDate = ref('')
const payMethodIndex = ref(-1)
const payMethods = ['账期结算', '预付款', '银行转账', '现金支付', '在线支付', '其他方式']

const form = ref({
  amount: '',
  payer: '',
  pay_time: '',
  pay_method: '',
  remark: ''
})

const statusMap = {
  0: '待付款',
  1: '付款中',
  2: '已付款',
  3: '已关闭'
}

const getStatusType = (status) => {
  const map = {
    0: 'warning',
    1: 'primary',
    2: 'success',
    3: 'info'
  }
  return map[status] || 'info'
}

const invoiceStatusMap = {
  0: '未开票',
  1: '已开票',
  2: '部分开票'
}

const getInvoiceStatusType = (status) => {
  const map = {
    0: 'info',
    1: 'success',
    2: 'warning'
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

const copyPaymentNo = () => {
  if (!ret.value.payment_no) return
  uni.setClipboardData({
    data: ret.value.payment_no,
    success: () => {
      uni.showToast({ title: '复制付款单号成功', icon: 'none' })
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
    const res = await financeApi.getPaymentDetail(id)
    if (res.code === 0) {
      ret.value = res.data || {}
    }
  } catch (e) {
    // handled
  } finally {
    loading.value = false
  }
}

const openConfirmPopup = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  payDate.value = `${y}-${m}-${d}`

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  
  form.value = {
    amount: formatPrice(ret.value.unpaid_total_amount),
    payer: '',
    pay_time: `${payDate.value} ${hh}:${mm}:${ss}`,
    pay_method: '',
    remark: ''
  }

  if (ret.value.pay_method) {
    payMethodIndex.value = payMethods.indexOf(ret.value.pay_method)
    if (payMethodIndex.value !== -1) {
      form.value.pay_method = ret.value.pay_method
    }
  } else {
    payMethodIndex.value = -1
  }

  showConfirmPopup.value = true
}

const closePopup = () => {
  showConfirmPopup.value = false
}

const onPayDateChange = (e) => {
  payDate.value = e.detail.value
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  form.value.pay_time = `${payDate.value} ${hh}:${mm}:${ss}`
}

const onPayMethodChange = (e) => {
  const index = e.detail.value
  payMethodIndex.value = index
  form.value.pay_method = payMethods[index] || ''
}

const submitConfirm = async () => {
  const amount = Number(form.value.amount || 0)
  if (amount <= 0) {
    uni.showToast({ title: '付款金额必须大于0', icon: 'none' })
    return
  }
  if (amount > Number(ret.value.unpaid_total_amount || 0)) {
    uni.showToast({ title: '付款金额不能大于未付金额', icon: 'none' })
    return
  }
  if (!form.value.payer.trim()) {
    uni.showToast({ title: '请输入付款人', icon: 'none' })
    return
  }
  if (!form.value.pay_time) {
    uni.showToast({ title: '请选择付款时间', icon: 'none' })
    return
  }
  if (!form.value.pay_method) {
    uni.showToast({ title: '请输入付款方式', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在提交...' })
  try {
    const res = await financeApi.payPayment(ret.value.id, {
      amount,
      payer: form.value.payer.trim(),
      pay_time: form.value.pay_time,
      pay_method: form.value.pay_method,
      remark: form.value.remark.trim()
    })
    if (res.code === 0) {
      uni.showToast({ title: '付款登记成功', icon: 'success' })
      closePopup()
      loadDetail()
    }
  } catch (e) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

const goRegisterInvoice = () => {
  uni.navigateTo({
    url: `/pages/purchase/invoice-edit?order_id=${ret.value.order_id}`
  })
}

const handleDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: `确认删除付款单 ${ret.value.payment_no || ret.value.id} 吗？此操作不可恢复。`,
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '正在删除...' })
        try {
          const deleteRes = await financeApi.deletePayment(ret.value.id)
          if (deleteRes.code === 0) {
            uni.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => {
              uni.navigateBack()
            }, 800)
          }
        } catch (e) { /* handled */ }
        finally {
          uni.hideLoading()
        }
      }
    }
  })
}

const showMore = () => {
  const status = Number(ret.value.status)
  const invoiceStatus = Number(ret.value.invoice_status || 0)
  
  const menu = []
  const actions = []
  
  if (status < 2) {
    actions.push({ command: 'pay', label: '付款' })
  }
  if (invoiceStatus !== 1 && ret.value.order_id) {
    actions.push({ command: 'invoice', label: '发票登记' })
  }
  if (status === 3) {
    actions.push({ command: 'delete', label: '删除' })
  }
  
  actions.forEach(act => {
    menu.push(act.label)
  })
  menu.push('复制付款单号')
  if (ret.value.order_no) {
    menu.push('复制采购单号')
  }

  uni.showActionSheet({
    itemList: menu,
    success: ({ tapIndex }) => {
      const actionLabel = menu[tapIndex]
      if (actionLabel === '复制付款单号') {
        copyPaymentNo()
      } else if (actionLabel === '复制采购单号') {
        copyOrderNo()
      } else {
        const clickedAction = actions.find(act => act.label === actionLabel)
        if (clickedAction) {
          const cmd = clickedAction.command
          if (cmd === 'pay') openConfirmPopup()
          else if (cmd === 'invoice') goRegisterInvoice()
          else if (cmd === 'delete') handleDelete()
        }
      }
    }
  })
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
.payment-detail {
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

.empty-records {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;
  .empty-records-text {
    font-size: 24rpx;
    color: #C0C4CC;
  }
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

    &.primary {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
    }
    
    &.btn-primary {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
    }
    
    &.btn-back {
      background: #F4F4F5;
      color: #909399;
    }
    
    &.outline {
      background: #FFFFFF;
      color: #909399;
      border: 1rpx solid #DCDFE6;
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

      &.required::after {
        content: '*';
        color: #F56C6C;
        margin-left: 4rpx;
      }
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
    
    .form-textarea {
      background: #F5F7FA;
      border-radius: 12rpx;
      height: 120rpx;
      padding: 16rpx 20rpx;
      font-size: 26rpx;
      color: #303133;
      width: 100%;
      box-sizing: border-box;
      text-align: left;
    }

    .product-info-text {
      font-size: 28rpx;
      color: #303133;
      font-weight: 600;
      text-align: right;
      flex: 1;
      
      &.text-danger {
        color: #F56C6C;
      }
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
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
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
