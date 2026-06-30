<template>
  <view class="company-edit-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="scroll-inner">
        <!-- 基本资料 -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">基本资料</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label required">企业名称</text>
              <input class="form-input" v-model="form.name" placeholder="请输入企业全称" />
            </view>
            <view class="form-item">
              <text class="form-label required">企业类型</text>
              <picker class="form-picker" @change="onTypeChange" :value="typeIndex" :range="types" range-key="label">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: typeIndex === -1 }">
                    {{ types[typeIndex]?.label || '请选择企业类型' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">联系人</text>
              <input class="form-input" v-model="form.contact" placeholder="请输入联系人姓名" />
            </view>
            <view class="form-item">
              <text class="form-label">电话</text>
              <input class="form-input" v-model="form.phone" placeholder="请输入联系电话" />
            </view>
            <view class="form-item">
              <text class="form-label">邮箱</text>
              <input class="form-input" v-model="form.email" placeholder="请输入电子邮箱" />
            </view>
            <view class="form-item">
              <text class="form-label">详细地址</text>
              <input class="form-input" v-model="form.address" placeholder="请输入企业地址" />
            </view>
            <view class="form-item">
              <text class="form-label">是否启用</text>
              <switch :checked="form.status === 1" @change="onStatusChange" color="#1890FF" />
            </view>
          </view>
        </view>

        <!-- 财务与税务 -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">财务与税务信息</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label">开户银行</text>
              <input class="form-input" v-model="form.bank_name" placeholder="如: 招商银行深圳分行" />
            </view>
            <view class="form-item">
              <text class="form-label">银行账号</text>
              <input class="form-input" v-model="form.bank_account" placeholder="请输入银行账号" />
            </view>
            <view class="form-item">
              <text class="form-label">统一税号</text>
              <input class="form-input" v-model="form.tax_no" placeholder="请输入企业统一社会信用代码" />
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goCancel">取消</view>
      <view class="bottom-btn primary" @click="handleSave">保存企业</view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { supplierApi } from '@/api/supplier'

const types = [
  { label: '供应商', value: 'supplier' },
  { label: '客户', value: 'customer' },
  { label: '双重 (供应商+客户)', value: 'both' }
]
const typeIndex = ref(-1)
const isEdit = ref(false)
const editId = ref(null)

const form = reactive({
  name: '',
  type: 'supplier',
  contact: '',
  phone: '',
  email: '',
  address: '',
  bank_name: '',
  bank_account: '',
  tax_no: '',
  status: 1
})

const onTypeChange = (e) => {
  const index = e.detail.value
  typeIndex.value = index
  form.type = types[index].value
}

const onStatusChange = (e) => {
  form.status = e.detail.value ? 1 : 0
}

const loadDetail = async (id) => {
  uni.showLoading({ title: '加载中...' })
  try {
    const res = await supplierApi.getSupplierDetail(id)
    if (res.code === 0 && res.data) {
      const data = res.data
      form.name = data.name || ''
      form.type = data.type || 'supplier'
      form.contact = data.contact || ''
      form.phone = data.phone || ''
      form.email = data.email || ''
      form.address = data.address || ''
      form.bank_name = data.bank_name || ''
      form.bank_account = data.bank_account || ''
      form.tax_no = data.tax_no || ''
      form.status = data.status ?? 1
      
      typeIndex.value = types.findIndex(x => x.value === form.type)
    }
  } catch (err) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

const handleSave = async () => {
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入企业名称', icon: 'none' })
    return
  }
  if (!form.type) {
    uni.showToast({ title: '请选择企业类型', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在保存...' })
  try {
    const payload = {
      name: form.name.trim(),
      type: form.type,
      contact: form.contact.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      bank_name: form.bank_name.trim(),
      bank_account: form.bank_account.trim(),
      tax_no: form.tax_no.trim(),
      status: Number(form.status)
    }

    let res
    if (isEdit.value) {
      res = await supplierApi.updateSupplier(editId.value, payload)
    } else {
      res = await supplierApi.createSupplier(payload)
    }

    if (res.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' })
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

onMounted(() => {
  const pages = getCurrentPages()
  const id = pages[pages.length - 1].$page?.options?.id
  if (id) {
    isEdit.value = true
    editId.value = id
    loadDetail(id)
  } else {
    // Default select Supplier (index 0)
    typeIndex.value = 0
    form.type = 'supplier'
  }
})
</script>

<style lang="scss" scoped>
.company-edit-page {
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
</style>
