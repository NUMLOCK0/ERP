<template>
  <view class="return-edit-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="scroll-inner">
        <!-- ===== 基础配置 ===== -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">基本信息</text>
          </view>
          
          <!-- Mode 1: 关联采购订单退单 -->
          <view v-if="orderId" class="form-group">
            <view class="form-item">
              <text class="form-label">退货单号</text>
              <input class="form-input" v-model="form.return_no" placeholder="自定义单号(留空自动生成)" />
            </view>
            <view class="form-item">
              <text class="form-label">采购单号</text>
              <text class="info-value font-bold">{{ order.order_no || '-' }}</text>
            </view>
            <view class="form-item">
              <text class="form-label">供应商</text>
              <text class="info-value">{{ order.supplier_name || '-' }}</text>
            </view>
            <view class="form-item">
              <text class="form-label required">退货状态</text>
              <view class="status-selector">
                <view class="status-btn" :class="{ active: form.return_status === 0 }" @click="form.return_status = 0">
                  <text class="status-btn-text">等待退货</text>
                </view>
                <view class="status-btn" :class="{ active: form.return_status === 1 }" @click="form.return_status = 1">
                  <text class="status-btn-text">直接退货</text>
                </view>
              </view>
            </view>
            <view class="form-item">
              <text class="form-label">快递名称</text>
              <input class="form-input" v-model="form.express_name" placeholder="请输入快递名称(选填)" maxlength="60" />
            </view>
            <view class="form-item">
              <text class="form-label">快递单号</text>
              <input class="form-input" v-model="form.express_no" placeholder="请输入快递单号(选填)" maxlength="60" />
            </view>
            <view class="form-item">
              <text class="form-label">联系人</text>
              <input class="form-input" v-model="form.contact" placeholder="请输入联系人(选填)" maxlength="60" />
            </view>
            <view class="form-item">
              <text class="form-label">联系电话</text>
              <input class="form-input" v-model="form.phone" placeholder="请输入联系电话(选填)" maxlength="60" />
            </view>
            <view class="form-item">
              <text class="form-label">收货地址</text>
              <input class="form-input" v-model="form.address" placeholder="请输入收货地址(选填)" maxlength="160" />
            </view>
            <view class="form-item vertical">
              <text class="form-label">单据备注</text>
              <textarea class="form-textarea" v-model="form.remark" placeholder="请输入单据备注说明(选填)" maxlength="200" />
            </view>
          </view>

          <!-- Mode 2: 手动创建退货单 -->
          <view v-else class="form-group">
            <view class="form-item">
              <text class="form-label">退货单号</text>
              <input class="form-input" v-model="form.return_no" placeholder="自定义单号(留空自动生成)" />
            </view>
            <view class="form-item">
              <text class="form-label">关联入库单</text>
              <picker class="form-picker" @change="onInboundChange" :value="inboundIndex" :range="inbounds" range-key="label">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: inboundIndex === -1 }">
                    {{ inbounds[inboundIndex]?.label || '请选择关联入库单(可空)' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label required">供应商</text>
              <picker class="form-picker" @change="onSupplierChange" :value="supplierIndex" :range="suppliers" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: supplierIndex === -1 }">
                    {{ suppliers[supplierIndex]?.name || '请选择供应商' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">退货原因</text>
              <input class="form-input" v-model="form.reason" placeholder="请输入退货原因(选填)" maxlength="160" />
            </view>
          </view>
        </view>

        <!-- ===== 商品明细 ===== -->
        <view class="section">
          <view class="section-header list-title-row">
            <text class="section-title">退货商品明细</text>
            <view v-if="!orderId" class="add-row-btn" @click="openProductSelector">
              <u-icon name="plus" size="14" color="#1890FF"></u-icon>
              <text class="add-row-text">选择商品</text>
            </view>
          </view>

          <!-- 商品明细列表 -->
          <view v-if="form.items.length > 0" class="items-wrap">
            <view class="item-row-card" v-for="(item, idx) in form.items" :key="idx">
              <view class="card-title-row">
                <text class="card-index-title">#{{ idx + 1 }} {{ item.product_name || item.name || '-' }}</text>
                <text v-if="!orderId" class="remove-row-btn" @click="removeItemRow(idx)">删除</text>
                <text v-else-if="item.spec" class="card-spec-tag">{{ item.spec }}</text>
              </view>

              <!-- Order Return View (Compact fields aligned with PC Web) -->
              <view v-if="orderId" class="item-grid-details">
                <view class="grid-row">
                  <view class="grid-cell"><text class="cell-label">采购单价/总额：</text><text class="cell-value">¥{{ formatPrice(item.price) }} / ¥{{ formatPrice(item.amount) }}</text></view>
                </view>
                <view class="grid-row">
                  <view class="grid-cell"><text class="cell-label">采购税金/总额：</text><text class="cell-value">¥{{ formatPrice(item.tax) }} / ¥{{ formatPrice(item.tax) }}</text></view>
                </view>
                <view class="grid-row">
                  <view class="grid-cell"><text class="cell-label">产品单位：</text><text class="cell-value">{{ item.base_quantity || 1 }} / {{ item.unit_name || '-' }}</text></view>
                  <view class="grid-cell"><text class="cell-label">采购数量：</text><text class="cell-value">{{ item.final_quantity }}</text></view>
                </view>
                <view class="grid-row">
                  <view class="grid-cell"><text class="cell-label">已处理/剩余：</text><text class="cell-value">{{ Number(item.inbounded_quantity || 0) + Number(item.returned_quantity || 0) }} / {{ item.remaining_quantity }}</text></view>
                </view>
              </view>

              <view v-if="orderId" class="item-inputs-section">
                <view class="input-inline-item">
                  <text class="input-label required">退货数量</text>
                  <input class="input-field font-bold" type="number" v-model="item.return_quantity" placeholder="数量" @input="onItemReturnQtyInput(idx)" />
                </view>
                <view class="input-inline-item">
                  <text class="input-label required">退款金额</text>
                  <input class="input-field" type="digit" v-model="item.return_amount" placeholder="金额" />
                </view>
                <view class="input-inline-item wide">
                  <text class="input-label">备注说明</text>
                  <input class="input-field" v-model="item.remark" placeholder="选填" />
                </view>
              </view>

              <!-- Manual Return View -->
              <view v-else class="form-group row-group">
                <view class="form-item" v-if="item.spec || item.unit_name">
                  <text class="form-label">规格单位</text>
                  <text class="product-info-text">{{ item.spec || '-' }} ({{ item.unit_name || '-' }})</text>
                </view>
                <view class="form-item">
                  <text class="form-label required">退货数量</text>
                  <input class="form-input" type="number" v-model="item.quantity" placeholder="请输入数量" @input="onItemQtyOrPriceInput(idx)" />
                </view>
                <view class="form-item">
                  <text class="form-label required">退货单价</text>
                  <input class="form-input" type="digit" v-model="item.price" placeholder="请输入单价" @input="onItemQtyOrPriceInput(idx)" />
                </view>
                <view class="form-item">
                  <text class="form-label">退货金额</text>
                  <text class="product-info-text text-danger font-bold">¥{{ formatPrice(item.amount) }}</text>
                </view>
              </view>
            </view>

            <!-- 统计汇总 -->
            <view class="summary-card">
              <view class="summary-row">
                <text class="summary-label">退货总项数</text>
                <text class="summary-val">{{ form.items.length }} 项</text>
              </view>
              <view class="summary-row">
                <text class="summary-label">退货总金额</text>
                <text class="summary-val danger-text font-bold">¥{{ formatPrice(totalReturnAmount) }}</text>
              </view>
            </view>
          </view>

          <view v-else class="empty-items-state">
            <u-icon name="rewind-left" size="48" color="#DCDFE6"></u-icon>
            <text class="empty-text">
              {{ orderId ? '该采购订单没有可退货的明细' : '尚未选择退货商品，请点击右上角选择商品或通过关联入库单自动带出明细' }}
            </text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goCancel">取消</view>
      <view class="bottom-btn primary" @click="handleSave">确认退货</view>
    </view>

    <!-- 商品选择弹窗 -->
    <product-select-popup
      v-model:show="showProductPopup"
      :selected-ids="selectedProductIds"
      price-type="cost_price"
      @confirm="handleProductSelectConfirm"
    />
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { purchaseApi } from '@/api/purchase'
import { commonApi } from '@/api/common'
import { productApi } from '@/api/product'

const orderId = ref(null)
const order = ref({})

// Dropdown Options
const suppliers = ref([])
const inbounds = ref([])

// Selection Indices
const supplierIndex = ref(-1)
const inboundIndex = ref(-1)

// Form State
const form = reactive({
  return_no: '',
  inbound_id: null,
  supplier_id: null,
  reason: '',
  return_status: 1, // 默认直接退货 (status: 1), 0: 等待退货
  express_name: '',
  express_no: '',
  contact: '',
  phone: '',
  address: '',
  remark: '',
  items: []
})

const totalReturnAmount = computed(() => {
  if (orderId.value) {
    return form.items.reduce((sum, item) => sum + Number(item.return_amount || 0), 0)
  } else {
    return form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }
})

// Product Selector State
const showProductPopup = ref(false)
const selectedProductIds = computed(() => {
  return form.items.map(item => item.product_id)
})

const loadOptions = async () => {
  try {
    const [sRes, iRes] = await Promise.all([
      commonApi.getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 }),
      purchaseApi.getInbounds({ page: 1, pageSize: 1000 })
    ])
    if (sRes.code === 0) suppliers.value = sRes.data?.list || sRes.data || []
    if (iRes.code === 0) {
      const listData = iRes.data?.list || iRes.data || []
      inbounds.value = [
        { id: null, label: '无（手动创建退货）' },
        ...listData.map(item => ({
          ...item,
          label: `${item.inbound_no} (${item.supplier_name || ''})`
        }))
      ]
    }
  } catch (e) {
    // handled
  }
}

const onSupplierChange = (e) => {
  const index = e.detail.value
  supplierIndex.value = index
  const selected = suppliers.value[index]
  if (selected) {
    form.supplier_id = selected.id
  }
}

const onInboundChange = async (e) => {
  const index = e.detail.value
  inboundIndex.value = index
  const selected = inbounds.value[index]
  if (!selected) return

  form.inbound_id = selected.id
  
  if (selected.id === null) {
    form.items = []
    return
  }

  const sIdx = suppliers.value.findIndex(s => s.id === selected.supplier_id)
  if (sIdx !== -1) {
    supplierIndex.value = sIdx
    form.supplier_id = selected.supplier_id
  }

  uni.showLoading({ title: '加载入库单明细...' })
  try {
    const res = await purchaseApi.getInboundDetail(selected.id)
    if (res.code === 0 && res.data) {
      form.items = (res.data.items || []).map(item => ({
        product_id: item.product_id,
        name: item.product_name,
        code: item.code || '',
        spec: item.spec || '',
        unit_name: item.unit_name || '',
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        amount: Number(item.amount || 0)
      }))
    }
  } catch (err) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

const openProductSelector = () => {
  showProductPopup.value = true
}

const handleProductSelectConfirm = (selectedList) => {
  const currentItems = [...form.items]
  form.items = selectedList.map(prod => {
    const existing = currentItems.find(item => item.product_id === prod.id)
    if (existing) {
      return {
        product_id: prod.id,
        name: prod.name,
        code: prod.code || '',
        spec: prod.spec || '',
        unit_name: prod.unit_name || '',
        quantity: existing.quantity,
        price: existing.price,
        amount: Number((Number(existing.quantity || 0) * Number(existing.price || 0)).toFixed(2))
      }
    } else {
      const price = Number(prod.price || prod.cost_price || prod.sale_price || 0)
      return {
        product_id: prod.id,
        name: prod.name,
        code: prod.code || '',
        spec: prod.spec || '',
        unit_name: prod.unit_name || '',
        quantity: prod.quantity || 1,
        price: price,
        amount: price
      }
    }
  })
}

const removeItemRow = (idx) => {
  form.items.splice(idx, 1)
}

const onItemQtyOrPriceInput = (idx) => {
  const item = form.items[idx]
  if (item) {
    item.amount = Number((Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2))
  }
}

const onItemReturnQtyInput = (idx) => {
  const item = form.items[idx]
  if (item) {
    item.return_amount = Number((Number(item.return_quantity || 0) * Number(item.price || 0)).toFixed(2))
  }
}

const formatPrice = (val) => {
  if (val === null || val === undefined || val === '') return '0.00'
  return Number(val).toFixed(2)
}

const loadData = async () => {
  if (!orderId.value) {
    loadOptions()
    return
  }
  
  uni.showLoading({ title: '加载中...' })
  try {
    const res = await purchaseApi.getOrderDetail(orderId.value)
    if (res.code === 0 && res.data) {
      order.value = res.data
      
      form.contact = order.value.contact || ''
      form.phone = order.value.phone || ''
      form.address = order.value.address || order.value.bank_address || ''
      
      const remainingItems = (order.value.items || []).filter(
        item => Number(item.remaining_quantity || 0) > 0
      )
      
      form.items = remainingItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name || item.name || '',
        spec: item.spec || '',
        unit_name: item.unit_name || '',
        base_quantity: Number(item.base_quantity || 1),
        price: Number(item.final_price ?? item.price ?? 0),
        tax: Number(item.final_tax ?? item.tax ?? 0),
        amount: Number(item.final_amount ?? item.amount ?? 0),
        final_quantity: Number(item.final_quantity ?? item.quantity ?? 1),
        inbounded_quantity: Number(item.inbounded_quantity || 0),
        returned_quantity: Number(item.returned_quantity || 0),
        remaining_quantity: Number(item.remaining_quantity || 0),
        return_quantity: Number(item.remaining_quantity || 0), 
        return_amount: Number(((item.remaining_quantity || 0) * (item.final_price ?? item.price ?? 0)).toFixed(2)),
        remark: ''
      }))
    }
  } catch (e) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

onLoad((options) => {
  if (options && options.order_id) {
    orderId.value = options.order_id
  } else {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    orderId.value = currentPage?.$page?.options?.order_id || currentPage?.options?.order_id
  }
  loadData()
})

const goCancel = () => {
  uni.navigateBack()
}

const handleSave = async () => {
  if (orderId.value) {
    const returnItems = form.items.filter(item => Number(item.return_quantity || 0) > 0 || Number(item.return_amount || 0) > 0)
    if (returnItems.length === 0) {
      uni.showToast({ title: '退货明细不能为空，请输入至少一个商品退货量', icon: 'none' })
      return
    }
    
    for (const item of returnItems) {
      if (Number(item.return_quantity) > Number(item.remaining_quantity)) {
        uni.showToast({
          title: `${item.product_name || item.name} 的退货量超过剩余量`,
          icon: 'none'
        })
        return
      }
    }
    
    uni.showLoading({ title: '提交中...' })
    try {
      const payload = {
        return_no: form.return_no.trim() || undefined,
        return_status: form.return_status,
        express_name: form.express_name,
        express_no: form.express_no,
        contact: form.contact,
        phone: form.phone,
        address: form.address,
        remark: form.remark,
        items: returnItems.map(item => ({
          product_id: item.product_id,
          return_quantity: Number(item.return_quantity),
          return_amount: Number(item.return_amount),
          price: Number(item.price || 0),
          remark: item.remark || ''
        }))
      }
      
      const res = await purchaseApi.createOrderReturn(orderId.value, payload)
      uni.hideLoading()
      if (res.code === 0) {
        uni.showToast({ title: '退货成功', icon: 'success' })
        setTimeout(() => {
          uni.redirectTo({
            url: '/pages/purchase/return-list'
          })
        }, 800)
      }
    } catch (e) {
      uni.hideLoading()
    }
  } else {
    if (!form.supplier_id) {
      uni.showToast({ title: '请选择供应商', icon: 'none' })
      return
    }
    const validItems = form.items.filter(item => item.product_id && Number(item.quantity) > 0)
    if (!validItems.length) {
      uni.showToast({ title: '退货明细不能为空', icon: 'none' })
      return
    }

    for (const item of validItems) {
      if (Number(item.quantity) <= 0) {
        uni.showToast({ title: '退货数量必须大于0', icon: 'none' })
        return
      }
      if (Number(item.price) < 0) {
        uni.showToast({ title: '退货单价不能小于0', icon: 'none' })
        return
      }
    }

    uni.showLoading({ title: '正在保存...' })
    try {
      const payload = {
        return_no: form.return_no.trim() || undefined,
        inbound_id: form.inbound_id || 0,
        supplier_id: form.supplier_id,
        reason: form.reason.trim(),
        items: validItems.map(item => ({
          product_id: item.product_id,
          quantity: Number(item.quantity),
          price: Number(item.price)
        }))
      }
      const res = await purchaseApi.createReturn(payload)
      uni.hideLoading()
      if (res.code === 0) {
        uni.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1000)
      }
    } catch (e) {
      uni.hideLoading()
    }
  }
}
</script>

<style lang="scss" scoped>
.return-edit-page {
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
  padding: 24rpx 24rpx 180rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.section {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  
  &.list-title-row {
    margin-bottom: 16rpx;
  }
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #303133;
}

.add-row-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  background: #E8F4FF;
}

.add-row-text {
  font-size: 24rpx;
  color: #1890FF;
  font-weight: 600;
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
  
  &.vertical {
    flex-direction: column;
    align-items: flex-start;
    gap: 16rpx;
  }
}

.form-label {
  font-size: 28rpx;
  color: #606266;
  flex-shrink: 0;
  width: 180rpx;

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

.info-value {
  font-size: 28rpx;
  color: #303133;
  text-align: right;
  flex: 1;
  
  &.font-bold {
    font-weight: 700;
  }
}

.form-textarea {
  width: 100%;
  height: 120rpx;
  background: #F8FAFC;
  border: 1rpx solid #DCDFE6;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.status-selector {
  display: flex;
  background: #F4F4F5;
  border-radius: 12rpx;
  padding: 4rpx;
  gap: 4rpx;
}

.status-btn {
  padding: 10rpx 28rpx;
  border-radius: 10rpx;
  transition: all 0.2s;
  
  &.active {
    background: #FFFFFF;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
    
    .status-btn-text {
      color: #1890FF;
      font-weight: 700;
    }
  }
}

.status-btn-text {
  font-size: 26rpx;
  color: #909399;
}

/* 商品明细卡片 */
.items-wrap {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.item-row-card {
  background: #F8FAFC;
  border-radius: 20rpx;
  padding: 24rpx;
  border: 1rpx solid #E4E7ED;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.01);
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.card-index-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #303133;
}

.remove-row-btn {
  font-size: 24rpx;
  color: #F56C6C;
  font-weight: 600;
}

.card-spec-tag {
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

.item-grid-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 20rpx;
  background: #FFFFFF;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}

.grid-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.grid-cell {
  flex: 1;
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: #606266;
}

.cell-label {
  color: #909399;
}

.cell-value {
  font-weight: 600;
  color: #303133;
}

.item-inputs-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
}

.input-inline-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #FFFFFF;
  border: 1rpx solid #DCDFE6;
  border-radius: 10rpx;
  padding: 6rpx 12rpx;
  
  &.wide {
    grid-column: 1 / -1;
  }
}

.input-label {
  font-size: 22rpx;
  color: #606266;
  flex-shrink: 0;
  
  &.required::after {
    content: '*';
    color: #F56C6C;
  }
}

.input-field {
  flex: 1;
  font-size: 24rpx;
  color: #303133;
  text-align: right;
  height: 48rpx;
  min-height: 48rpx;
  
  &.font-bold {
    font-weight: 700;
    color: #1890FF;
  }
}

.row-group {
  .form-item {
    padding: 16rpx 0;
    border-bottom: 1rpx solid #EBEEF5;
    
    &:last-child {
      border-bottom: none;
    }
  }
}

.product-info-text {
  font-size: 26rpx;
  color: #303133;
  font-weight: 600;
  text-align: right;
  flex: 1;
}

.empty-items-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}

.empty-items-text {
  font-size: 24rpx;
  color: #C0C4CC;
  margin-top: 12rpx;
  text-align: center;
}

.summary-card {
  background: #FFF8F8;
  border: 1rpx dashed #FFCBCB;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 26rpx;
  color: #606266;
}

.summary-val {
  font-size: 28rpx;
  color: #303133;
  
  &.danger-text {
    color: #F56C6C;
    font-size: 32rpx;
  }
  
  &.font-bold {
    font-weight: 700;
  }
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
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

/* 弹窗样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0);
  backdrop-filter: blur(0px);
  display: flex;
  align-items: flex-end;
  transition: all 0.24s ease-out;
  pointer-events: none;
  visibility: hidden;

  &.show {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(5px);
    pointer-events: auto;
    visibility: visible;
    .dialog-content {
      transform: translateY(0);
    }
  }
}

.dialog-content {
  width: 100%;
  height: 75vh;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.24s ease-out;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.dialog-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 36rpx;
  border-bottom: 1rpx solid #F2F6FC;
}

.dialog-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #303133;
}

.dialog-close {
  font-size: 40rpx;
  color: #909399;
  line-height: 1;
}

.popup-search-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 36rpx;
  background: #FFFFFF;
  border-bottom: 1rpx solid #F2F6FC;
}

.popup-search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #F2F4F6;
  border-radius: 12rpx;
  padding: 0 16rpx;
  height: 68rpx;
}

.popup-search-input {
  flex: 1;
  font-size: 26rpx;
  margin-left: 10rpx;
}

.popup-search-btn {
  flex-shrink: 0;
  background: #1890FF;
  color: #FFFFFF;
  font-size: 24rpx;
  font-weight: 600;
  padding: 0 24rpx;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 12rpx;
  white-space: nowrap;

  &:active {
    opacity: 0.85;
  }
}

.dialog-body-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.popup-product-list {
  padding: 16rpx 36rpx;
}

.product-select-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F2F6FC;
  
  &:last-child {
    border-bottom: none;
  }
}

.prod-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  overflow: hidden;
}

.prod-img {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  background: #F2F6FC;
  flex-shrink: 0;
}

.prod-img-placeholder {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  background: #F2F6FC;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.prod-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  overflow: hidden;
  flex: 1;
}

.prod-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.prod-code, .prod-spec {
  font-size: 20rpx;
  color: #909399;
}

.prod-right {
  flex-shrink: 0;
  margin-left: 12rpx;
}

.popup-empty {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
  
  .popup-empty-text {
    font-size: 24rpx;
    color: #C0C4CC;
  }
}

.popup-loading {
  padding: 10rpx 0;
}
</style>
