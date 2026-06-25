<template>
  <view class="invoice-edit-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="scroll-inner">
        <!-- ===== 基础配置 ===== -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">发票信息</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label required">选择采购单</text>
              <picker class="form-picker" @change="onOrderChange" :value="orderIndex" :range="orders" range-key="label">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: orderIndex === -1 }">
                    {{ orders[orderIndex]?.label || '请选择采购订单' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">供应商</text>
              <text class="product-info-text">{{ supplierName || '-' }}</text>
            </view>
            <view class="form-item">
              <text class="form-label">发票号码</text>
              <input class="form-input" v-model="form.external_invoice_no" placeholder="请输入发票号码" />
            </view>
            <view class="form-item">
              <text class="form-label">开票日期</text>
              <picker class="form-picker" mode="date" :value="invoiceDate" @change="onInvoiceDateChange">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: !invoiceDate }">
                    {{ invoiceDate || '请选择开票日期' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label required">价税合计</text>
              <input class="form-input font-bold text-danger" type="digit" v-model="form.total_amount" placeholder="请输入价税合计金额" @input="recalculateTaxFromRate" />
            </view>
            <view class="form-item">
              <text class="form-label required">税率 (%)</text>
              <input class="form-input" type="number" v-model="form.tax_rate" placeholder="请输入税率" @input="recalculateTaxFromRate" />
            </view>
            <view class="form-item">
              <text class="form-label">税金</text>
              <input class="form-input font-bold" type="digit" v-model="form.tax_amount" placeholder="请输入税金" @input="recalculateAmountFromTax" />
            </view>
            <view class="form-item">
              <text class="form-label">不含税金额</text>
              <text class="product-info-text font-bold">¥{{ formatPrice(form.amount) }}</text>
            </view>
            <view class="form-item">
              <text class="form-label">发票备注</text>
              <input class="form-input" v-model="form.remark" placeholder="请输入发票备注(选填)" maxlength="200" />
            </view>
          </view>
        </view>

        <!-- ===== 发票附件 ===== -->
        <view class="section">
          <view class="section-header flex-row">
            <text class="section-title">发票附件</text>
            <text class="section-subtitle">{{ form.attachment_urls.length }} / 10</text>
          </view>
          <view class="attachment-upload-grid">
            <view class="attachment-upload-item" v-for="(url, idx) in form.attachment_urls" :key="idx">
              <image :src="url" mode="aspectFill" class="attachment-upload-img" @click="previewUploadImage(idx)" />
              <view class="remove-btn" @click.stop="removeAttachment(idx)">
                <uni-icons type="closeempty" size="12" color="#FFFFFF"></uni-icons>
              </view>
            </view>
            <view class="uploader-box" v-if="form.attachment_urls.length < 10" @click="chooseAndUploadAttachments">
              <uni-icons type="plus" size="28" color="#909399"></uni-icons>
              <text class="uploader-text">上传发票</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goCancel">取消</view>
      <view class="bottom-btn primary" @click="handleSave">确认登记</view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { purchaseApi } from '@/api/purchase'
import http from '@/api/request'

// Dropdown Options
const orders = ref([])
const supplierName = ref('')

// Selection Indices
const orderIndex = ref(-1)
const invoiceDate = ref('')

// Form State
const form = reactive({
  order_id: null,
  external_invoice_no: '',
  invoice_date: '',
  amount: 0,
  tax_rate: 13,
  tax_amount: 0,
  total_amount: '',
  remark: '',
  attachment_urls: []
})

const loadOptions = async () => {
  try {
    const oRes = await purchaseApi.getOrders({ page: 1, pageSize: 1000 })
    if (oRes.code === 0) {
      const listData = oRes.data?.list || oRes.data || []
      orders.value = listData.map(item => ({
        ...item,
        label: `${item.order_no} (${item.supplier_name || ''})`
      }))
    }
  } catch (e) {
    // handled
  }
}

const onOrderChange = (e) => {
  const index = e.detail.value
  orderIndex.value = index
  const selected = orders.value[index]
  if (!selected) {
    supplierName.value = ''
    form.order_id = null
    form.total_amount = ''
    recalculateTaxFromRate()
    return
  }

  form.order_id = selected.id
  supplierName.value = selected.supplier_name || ''
  
  const totalAmount = Number(selected.total_price || selected.total_amount || 0)
  form.total_amount = totalAmount > 0 ? totalAmount.toFixed(2) : ''
  recalculateTaxFromRate()
}

const onInvoiceDateChange = (e) => {
  invoiceDate.value = e.detail.value
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  form.invoice_date = `${invoiceDate.value} ${hh}:${mm}:${ss}`
}

const recalculateTaxFromRate = () => {
  const total = Number(form.total_amount || 0)
  const rate = Number(form.tax_rate || 0)
  const tax = rate > 0 ? Number((total * rate / (100 + rate)).toFixed(2)) : 0
  form.tax_amount = tax > 0 ? tax.toFixed(2) : '0'
  form.amount = Number((total - tax).toFixed(2))
}

const recalculateAmountFromTax = () => {
  const total = Number(form.total_amount || 0)
  const tax = Math.min(Math.max(Number(form.tax_amount || 0), 0), total)
  form.tax_amount = tax > 0 ? tax.toFixed(2) : '0'
  form.amount = Number((total - tax).toFixed(2))
}

const formatPrice = (val) => {
  if (val === null || val === undefined) return '0.00'
  return Number(val).toFixed(2)
}

const handleSave = async () => {
  if (!form.order_id) {
    uni.showToast({ title: '请选择采购订单', icon: 'none' })
    return
  }
  
  const totalAmount = Number(form.total_amount || 0)
  const taxRate = Number(form.tax_rate || 0)
  const taxAmount = Number(form.tax_amount || 0)
  
  if (totalAmount <= 0) {
    uni.showToast({ title: '发票金额必须大于0', icon: 'none' })
    return
  }
  if (taxRate < 0 || taxRate > 100) {
    uni.showToast({ title: '税率需在0-100之间', icon: 'none' })
    return
  }
  if (taxAmount < 0 || taxAmount > totalAmount) {
    uni.showToast({ title: '税金需在0到价税合计之间', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在提交...' })
  try {
    const payload = {
      order_id: form.order_id,
      external_invoice_no: form.external_invoice_no.trim(),
      invoice_date: form.invoice_date || null,
      total_amount: totalAmount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      amount: Number(form.amount),
      remark: form.remark.trim(),
      attachment_urls: form.attachment_urls
    }
    const res = await purchaseApi.createInvoice(payload)
    if (res.code === 0) {
      uni.showToast({ title: '登记发票成功', icon: 'success' })
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

const goCancel = () => {
  uni.navigateBack()
}

const chooseAndUploadAttachments = () => {
  const limit = 10 - form.attachment_urls.length
  if (limit <= 0) return

  uni.chooseImage({
    count: limit,
    success: async (chooseRes) => {
      uni.showLoading({ title: '上传中...' })
      try {
        for (const filePath of chooseRes.tempFilePaths) {
          const res = await http.upload('/upload/file', filePath)
          if (res.code === 0 && res.data?.url) {
            form.attachment_urls.push(res.data.url)
          }
        }
        uni.showToast({ title: '上传成功', icon: 'success' })
      } catch (err) {
        uni.showToast({ title: err.message || '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

const removeAttachment = (idx) => {
  form.attachment_urls.splice(idx, 1)
}

const previewUploadImage = (idx) => {
  uni.previewImage({
    urls: form.attachment_urls,
    current: form.attachment_urls[idx]
  })
}

onMounted(() => {
  loadOptions()
  
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  invoiceDate.value = `${y}-${m}-${d}`

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  form.invoice_date = `${invoiceDate.value} ${hh}:${mm}:${ss}`
})
</script>

<style lang="scss" scoped>
.invoice-edit-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  box-sizing: border-box;
}

.form-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 20rpx;
}

.section {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #303133;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F2F6FC;

  &:last-child {
    border-bottom: none;
  }
}

.form-label {
  font-size: 28rpx;
  color: #606266;
  flex-shrink: 0;
  width: 160rpx;

  &.required::after {
    content: '*';
    color: #F56C6C;
    margin-left: 4rpx;
  }
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

.product-info-text {
  font-size: 28rpx;
  color: #303133;
  font-weight: 600;
  text-align: right;
  flex: 1;
}

.font-bold {
  font-weight: 700;
}

.text-danger {
  color: #F56C6C;
}

/* 底部操作栏 */
.bottom-bar {
  flex-shrink: 0;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10rpx);
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 16rpx;
  z-index: 99;
}

.bottom-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;

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

.flex-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.section-subtitle {
  font-size: 24rpx;
  color: #909399;
}

.attachment-upload-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding: 10rpx 0;
}

.attachment-upload-item {
  position: relative;
  width: 150rpx;
  height: 150rpx;
  border-radius: 12rpx;
  overflow: hidden;
  border: 1rpx solid #EBEEF5;
  background: #F8FAFC;
}

.attachment-upload-img {
  width: 100%;
  height: 100%;
}

.remove-btn {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.uploader-box {
  width: 150rpx;
  height: 150rpx;
  border-radius: 12rpx;
  border: 2rpx dashed #DCDFE6;
  background: #FAFAFA;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;

  &:active {
    background: #F2F6FC;
  }

  .uploader-text {
    font-size: 20rpx;
    color: #909399;
    margin-top: 8rpx;
  }
}
</style>
