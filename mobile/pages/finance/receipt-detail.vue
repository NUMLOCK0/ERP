<template>
  <view class="receipt-detail">
    <view v-if="ret.id" class="detail-content">
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">收款单信息</view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">收款单号</text>
            <text class="info-value font-bold">{{ ret.receipt_no }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">收款状态</text>
            <view class="info-value">
              <uni-tag :text="statusMap[ret.status] || '未知'" size="small" :type="getStatusType(ret.status)" />
            </view>
          </view>
          <view class="info-item">
            <text class="info-label">关联销售单</text>
            <text class="info-value text-link" @click="goOrderDetail">{{ ret.order_no || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">客户</text>
            <text class="info-value">{{ ret.customer_name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">应收总额</text>
            <text class="info-value font-bold">¥{{ formatPrice(ret.receivable_amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">已收金额</text>
            <text class="info-value text-success font-bold">¥{{ formatPrice(ret.amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">未收金额</text>
            <text class="info-value text-danger font-bold">¥{{ formatPrice(ret.unreceived_amount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">收款方式</text>
            <text class="info-value">{{ payMethodMap[ret.receipt_method] || ret.receipt_method || '-' }}</text>
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
            <text class="info-label">创建时间</text>
            <text class="info-value date-text">{{ formatDate(ret.created_at || ret.createdAt) }}</text>
          </view>
          <view class="info-item" v-if="ret.receipt_time">
            <text class="info-label">收款登记时间</text>
            <text class="info-value date-text">{{ formatDate(ret.receipt_time) }}</text>
          </view>
          <view class="info-item" style="width: 100%;" v-if="ret.detail_remark">
            <text class="info-label">备注说明</text>
            <text class="info-value">{{ ret.detail_remark }}</text>
          </view>
        </view>
      </view>

      <!-- 客户开户信息 -->
      <view class="card" v-if="ret.bank_name || ret.bank_account">
        <view class="card-title">客户结算账户</view>
        <view class="info-grid">
          <view class="info-item" style="width: 100%;">
            <text class="info-label">开户银行</text>
            <text class="info-value">{{ ret.bank_name || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;">
            <text class="info-label">账户账号</text>
            <text class="info-value">{{ ret.bank_account || '-' }}</text>
          </view>
          <view class="info-item" style="width: 100%;">
            <text class="info-label">开户户名</text>
            <text class="info-value">{{ ret.bank_account_name || '-' }}</text>
          </view>
        </view>
      </view>

      <!-- 收款凭证展示 -->
      <view class="card" v-if="getVoucherList(ret.voucher_urls).length > 0">
        <view class="card-title">收款凭证附件</view>
        <view class="voucher-grid">
          <view class="voucher-item" v-for="(url, index) in getVoucherList(ret.voucher_urls)" :key="index">
            <image :src="url" mode="aspectFill" class="voucher-img" @click="previewVoucher(url)" />
          </view>
        </view>
      </view>

      <!-- 销售发票明细 -->
      <view class="card" v-if="ret.sale_invoices && ret.sale_invoices.length > 0">
        <view class="card-title">关联销售发票</view>
        <view class="invoices-list">
          <view class="invoice-item-card" v-for="invoice in ret.sale_invoices" :key="invoice.id">
            <view class="invoice-header">
              <text class="invoice-no">发票号: {{ invoice.invoice_no || invoice.external_invoice_no || '-' }}</text>
              <text class="invoice-amount">¥{{ formatPrice(invoice.total_amount) }}</text>
            </view>
            <view class="invoice-body">
              <view class="invoice-row">
                <text class="invoice-label">开票日期：</text>
                <text class="invoice-val">{{ formatDate(invoice.invoice_date).split(' ')[0] }}</text>
              </view>
              <view class="invoice-row" v-if="invoice.remark">
                <text class="invoice-label">备注：</text>
                <text class="invoice-val">{{ invoice.remark }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-text">收款单不存在</text>
    </view>

    <view v-if="loading" class="loading-state">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="ret.id" class="bottom-bar safe-bottom">
      <view class="action-btn-group">
        <button class="btn-back" @click="goBack">返回</button>
        <button v-if="Number(ret.status) < 2" class="btn-primary" @click="openConfirmPopup">确认收款</button>
      </view>
    </view>

    <!-- 确认收款弹窗 -->
    <view v-if="showConfirmPopup" class="popup-overlay" @click="closePopup">
      <view class="popup-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sheet-title">登记收款</text>
          <view class="close-btn" @click="closePopup">
            <uni-icons type="closeempty" size="20" color="#999"></uni-icons>
          </view>
        </view>

        <view class="sheet-body">
          <scroll-view class="sheet-scroll" scroll-y>
            <view class="form-item">
              <text class="form-label">未收总金额</text>
              <text class="product-info-text text-danger font-bold">¥{{ formatPrice(ret.unreceived_amount) }}</text>
            </view>
            <view class="form-item">
              <text class="form-label required">本次收款</text>
              <input class="form-input" type="digit" v-model="form.amount" placeholder="请输入收款金额" />
            </view>
            <view class="form-item">
              <text class="form-label required">收款日期</text>
              <picker class="form-picker" mode="date" :value="payDate" @change="onPayDateChange">
                <view class="picker-inner">
                  <text class="picker-value">
                    {{ payDate || '请选择收款日期' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label required">收款方式</text>
              <picker class="form-picker" @change="onPayMethodChange" :value="payMethodIndex" :range="payMethods">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: payMethodIndex === -1 }">
                    {{ payMethods[payMethodIndex] || '请选择收款方式' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">备注说明</text>
              <textarea class="form-textarea" v-model="form.remark" placeholder="请输入备注说明（最多300字）" :maxlength="300" />
            </view>
            <view class="form-item block">
              <text class="form-label">收款凭证 (最多10张)</text>
              <view class="uploader-grid">
                <view class="uploader-item" v-for="(url, idx) in uploadVouchers" :key="idx">
                  <image :src="url" mode="aspectFill" class="uploader-img" @click="previewVoucher(url)" />
                  <view class="remove-icon" @click="removeVoucher(idx)">×</view>
                </view>
                <view class="uploader-btn" v-if="uploadVouchers.length < 10" @click="chooseVoucher">
                  <uni-icons type="plusempty" size="24" color="#909399"></uni-icons>
                  <text class="uploader-btn-text">上传图片</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="sheet-footer">
          <button class="btn-cancel" @click="closePopup">取消</button>
          <button class="btn-confirm" @click="submitConfirm">确认收款</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { financeApi } from '@/api/finance'
import { useUserStore } from '@/store/user'

const ret = ref({})
const loading = ref(true)
const showConfirmPopup = ref(false)

const payDate = ref('')
const payMethodIndex = ref(-1)
const payMethods = ['银行转账', '现金', '支付宝', '微信支付', '账期结算', '其他方式']

const form = ref({
  amount: '',
  pay_time: '',
  pay_method: '',
  remark: ''
})

const uploadVouchers = ref([])

const statusMap = {
  0: '待收款',
  1: '收款中',
  2: '已收款',
  3: '已关闭'
}

const payMethodMap = {
  cash: '现金',
  bank: '银行转账',
  alipay: '支付宝',
  wechat: '微信支付',
  bank_transfer: '银行转账'
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

const getVoucherList = (val) => {
  if (!val) return []
  if (Array.isArray(val)) return val
  try {
    return JSON.parse(val)
  } catch (e) {
    return []
  }
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
    const res = await financeApi.getReceiptDetail(id)
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
    amount: formatPrice(ret.value.unreceived_amount),
    pay_time: `${payDate.value} ${hh}:${mm}:${ss}`,
    pay_method: '',
    remark: ''
  }

  uploadVouchers.value = getVoucherList(ret.value.voucher_urls)

  if (ret.value.receipt_method) {
    payMethodIndex.value = payMethods.indexOf(ret.value.receipt_method)
    if (payMethodIndex.value !== -1) {
      form.value.pay_method = ret.value.receipt_method
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

const chooseVoucher = () => {
  uni.chooseImage({
    count: 10 - uploadVouchers.value.length,
    success: (res) => {
      const filePaths = res.tempFilePaths
      filePaths.forEach(filePath => {
        uni.showLoading({ title: '上传图片中...' })
        const userStore = useUserStore()
        uni.uploadFile({
          url: 'http://localhost:3000/api/upload/file',
          filePath,
          name: 'file',
          header: {
            'Authorization': `Bearer ${userStore.token}`
          },
          success: (uploadRes) => {
            try {
              const resData = JSON.parse(uploadRes.data)
              if (resData.code === 0) {
                uploadVouchers.value.push(resData.data.url)
              } else {
                uni.showToast({ title: resData.message || '上传失败', icon: 'none' })
              }
            } catch (err) {
              uni.showToast({ title: '解析失败', icon: 'none' })
            }
          },
          fail: () => {
            uni.showToast({ title: '上传失败', icon: 'none' })
          },
          complete: () => {
            uni.hideLoading()
          }
        })
      })
    }
  })
}

const removeVoucher = (idx) => {
  uploadVouchers.value.splice(idx, 1)
}

const previewVoucher = (url) => {
  uni.previewImage({
    urls: [url],
    current: url
  })
}

const submitConfirm = async () => {
  const amount = Number(form.value.amount || 0)
  if (amount <= 0) {
    uni.showToast({ title: '收款金额必须大于0', icon: 'none' })
    return
  }
  if (amount > Number(ret.value.unreceived_amount || 0)) {
    uni.showToast({ title: '收款金额不能大于未收金额', icon: 'none' })
    return
  }
  if (!form.value.pay_time) {
    uni.showToast({ title: '请选择收款日期', icon: 'none' })
    return
  }
  if (!form.value.pay_method) {
    uni.showToast({ title: '请选择收款方式', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在提交...' })
  try {
    const res = await financeApi.receiveReceipt(ret.value.id, {
      amount,
      pay_time: form.value.pay_time,
      pay_method: form.value.pay_method,
      remark: form.value.remark.trim(),
      voucher_urls: uploadVouchers.value
    })
    if (res.code === 0) {
      uni.showToast({ title: '登记收款成功', icon: 'success' })
      closePopup()
      loadDetail()
    }
  } catch (e) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

const goBack = () => {
  uni.navigateBack()
}

const goOrderDetail = () => {
  if (ret.value.sale_order_id || ret.value.order_id) {
    uni.navigateTo({ url: `/pages/sale/order-detail?id=${ret.value.sale_order_id || ret.value.order_id}` })
  }
}

onShow(() => {
  uni.hideTabBar()
  loadDetail()
})
</script>

<style lang="scss" scoped>
.receipt-detail {
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
    padding: 10rpx 0;
    box-sizing: border-box;
    .info-label { font-size: 22rpx; color: #909399; display: block; margin-bottom: 4rpx; }
    .info-value { font-size: 26rpx; color: #303133; display: block; font-weight: 500; word-break: break-all; }
    .date-text { color: #909399; font-size: 24rpx; }
    .font-bold { font-weight: 700; }
    .text-success { color: #67C23A; }
    .text-danger { color: #F56C6C; }
    .text-link { color: #1890FF; font-weight: 600; text-decoration: underline; }
  }
}

.voucher-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  
  .voucher-item {
    width: calc(25% - 12rpx);
    height: 140rpx;
    border-radius: 8rpx;
    overflow: hidden;
    background: #F2F6FC;
    
    .voucher-img {
      width: 100%;
      height: 100%;
    }
  }
}

.invoices-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.invoice-item-card {
  background: #F8FAFC;
  border-radius: 12rpx;
  padding: 18rpx 20rpx;
  border: 1rpx solid #EBEEF5;

  .invoice-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1rpx solid #EBEEF5;
    padding-bottom: 10rpx;
    margin-bottom: 10rpx;

    .invoice-no {
      font-size: 24rpx;
      font-weight: 600;
      color: #909399;
    }
    .invoice-amount {
      font-size: 28rpx;
      font-weight: 700;
      color: #F56C6C;
    }
  }

  .invoice-body {
    .invoice-row {
      display: flex;
      padding: 4rpx 0;
      font-size: 22rpx;
      .invoice-label {
        color: #909399;
        width: 130rpx;
        flex-shrink: 0;
      }
      .invoice-val {
        color: #303133;
        font-weight: 500;
      }
    }
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

  .action-btn-group {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 16rpx;
    width: 100%;
  }

  button {
    height: 76rpx;
    line-height: 76rpx;
    padding: 0 40rpx;
    font-size: 26rpx;
    border-radius: 38rpx;
    font-weight: 600;
    margin: 0;
    
    &::after { border: none; }

    &.btn-primary {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
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
  max-height: 80vh;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
}

.sheet-header {
  flex-shrink: 0;
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
  flex: 1;
  height: 0;
  padding: 30rpx;
}

.sheet-scroll {
  height: 100%;
  width: 100%;
}

.form-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F2F6FC;

  &.block {
    flex-direction: column;
    align-items: flex-start;
    border-bottom: none;
    
    .form-label {
      margin-bottom: 16rpx;
    }
  }

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
    height: 100rpx;
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

.uploader-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  width: 100%;
  
  .uploader-item {
    position: relative;
    width: calc(25% - 12rpx);
    height: 140rpx;
    border-radius: 8rpx;
    overflow: hidden;
    background: #F2F6FC;
    
    .uploader-img {
      width: 100%;
      height: 100%;
    }
    
    .remove-icon {
      position: absolute;
      top: 0;
      right: 0;
      width: 36rpx;
      height: 36rpx;
      background: rgba(0, 0, 0, 0.5);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24rpx;
      border-bottom-left-radius: 8rpx;
    }
  }
  
  .uploader-btn {
    width: calc(25% - 12rpx);
    height: 140rpx;
    border-radius: 8rpx;
    background: #F5F7FA;
    border: 1rpx dashed #DCDFE6;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    
    .uploader-btn-text {
      font-size: 20rpx;
      color: #909399;
    }
  }
}

.sheet-footer {
  flex-shrink: 0;
  display: flex;
  gap: 20rpx;
  padding: 24rpx 30rpx;
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #F2F6FC;
  background: #FFFFFF;
  
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
