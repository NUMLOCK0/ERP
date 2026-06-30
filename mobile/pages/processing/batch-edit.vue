<template>
  <view class="order-edit-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="scroll-inner">
        <!-- ===== 基础配置 ===== -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">基本信息</text>
          </view>
          
          <view class="form-group">
            <!-- 采购原包货 -->
            <view class="form-item">
              <text class="form-label required">采购原包货</text>
              <picker class="form-picker" @change="onProductChange" :value="productIndex" :range="productOptions">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: productIndex === -1 }">
                    {{ productOptions[productIndex] || '选择已入库的原包货' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>

            <!-- 供应商 -->
            <view class="form-item">
              <text class="form-label">供应商</text>
              <picker class="form-picker" @change="onSupplierChange" :value="supplierIndex" :range="suppliers" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: supplierIndex === -1 }">
                    {{ suppliers[supplierIndex]?.name || '选择供应商(可选)' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>

            <!-- 原料仓 -->
            <view class="form-item">
              <text class="form-label required">原料仓</text>
              <picker class="form-picker" @change="onSourceWarehouseChange" :value="sourceWarehouseIndex" :range="warehouses" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: sourceWarehouseIndex === -1 }">
                    {{ warehouses[sourceWarehouseIndex]?.name || '原包货当前仓库' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>

            <!-- 产品入库仓 -->
            <view class="form-item">
              <text class="form-label required">产品入库仓</text>
              <picker class="form-picker" @change="onTargetWarehouseChange" :value="targetWarehouseIndex" :range="warehouses" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: targetWarehouseIndex === -1 }">
                    {{ warehouses[targetWarehouseIndex]?.name || '加工产品统一入库仓' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>

            <!-- 原包货数量 -->
            <view class="form-item">
              <text class="form-label required">原包货数量</text>
              <input class="form-input" type="digit" v-model="form.source_quantity" placeholder="输入投入数量" />
            </view>

            <!-- 采购单价 -->
            <view class="form-item">
              <text class="form-label required">采购单价</text>
              <input class="form-input" type="digit" v-model="form.source_unit_price" placeholder="输入采购单价" />
            </view>

            <!-- 加工备注 -->
            <view class="form-item vertical">
              <text class="form-label">加工备注</text>
              <textarea class="form-textarea" v-model="form.remark" placeholder="批次、产地、特殊加工要求等(选填)" maxlength="200" />
            </view>
            <BusinessImageUpload v-model="form.image_urls" title="加工图片留痕" />
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goBack">取消</view>
      <view class="bottom-btn primary" @click="handleSave">保存批次</view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { productApi } from '@/api/product'
import { warehouseApi } from '@/api/warehouse'
import { supplierApi } from '@/api/supplier'
import { processingApi } from '@/api/processing'
import BusinessImageUpload from '@/components/BusinessImageUpload.vue'

const form = reactive({
  source_product_id: null,
  supplier_id: null,
  source_warehouse_id: null,
  target_warehouse_id: null,
  source_quantity: '',
  source_unit_price: '',
  remark: '',
  image_urls: []
})

const products = ref([])
const warehouses = ref([])
const suppliers = ref([])

const productIndex = ref(-1)
const supplierIndex = ref(-1)
const sourceWarehouseIndex = ref(-1)
const targetWarehouseIndex = ref(-1)

const productOptions = computed(() => {
  return products.value.map(p => [p.name, p.spec, p.code].filter(Boolean).join(' / '))
})

onMounted(async () => {
  try {
    const [prodRes, WHRes, supRes] = await Promise.all([
      productApi.getList({ page: 1, pageSize: 1000, status: 1 }),
      warehouseApi.getList({ page: 1, pageSize: 1000, status: 1 }),
      supplierApi.getSuppliers({ page: 1, pageSize: 1000, status: 1 })
    ])
    if (prodRes.code === 0) products.value = prodRes.data?.list || prodRes.data || []
    if (WHRes.code === 0) warehouses.value = WHRes.data?.list || WHRes.data || []
    if (supRes.code === 0) suppliers.value = supRes.data?.list || supRes.data || []
  } catch (error) {
    console.error(error)
  }
})

const onProductChange = (e) => {
  productIndex.value = e.detail.value
  const product = products.value[productIndex.value]
  if (product) {
    form.source_product_id = product.id
    form.source_unit_price = String(product.cost_price || 0)
    if (product.default_supplier_id) {
      const idx = suppliers.value.findIndex(s => s.id === product.default_supplier_id)
      if (idx !== -1) {
        supplierIndex.value = idx
        form.supplier_id = product.default_supplier_id
      }
    }
  }
}

const onSupplierChange = (e) => {
  supplierIndex.value = e.detail.value
  form.supplier_id = suppliers.value[supplierIndex.value]?.id || null
}

const onSourceWarehouseChange = (e) => {
  sourceWarehouseIndex.value = e.detail.value
  form.source_warehouse_id = warehouses.value[sourceWarehouseIndex.value]?.id || null
}

const onTargetWarehouseChange = (e) => {
  targetWarehouseIndex.value = e.detail.value
  form.target_warehouse_id = warehouses.value[targetWarehouseIndex.value]?.id || null
}

const goBack = () => {
  uni.navigateBack()
}

const handleSave = async () => {
  if (!form.source_product_id) {
    uni.showToast({ title: '请选择采购原包货', icon: 'none' })
    return
  }
  if (!form.source_warehouse_id) {
    uni.showToast({ title: '请选择原料仓', icon: 'none' })
    return
  }
  if (!form.target_warehouse_id) {
    uni.showToast({ title: '请选择产品入库仓', icon: 'none' })
    return
  }
  if (!form.source_quantity || Number(form.source_quantity) <= 0) {
    uni.showToast({ title: '请输入合法的原包货数量', icon: 'none' })
    return
  }
  if (!form.source_unit_price || Number(form.source_unit_price) < 0) {
    uni.showToast({ title: '请输入合法的采购单价', icon: 'none' })
    return
  }

  try {
    const data = {
      ...form,
      source_quantity: Number(form.source_quantity),
      source_unit_price: Number(form.source_unit_price),
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      image_urls: form.image_urls
    }
    const res = await processingApi.createOrder(data)
    if (res.code === 0) {
      uni.showToast({ title: '保存批次成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1000)
    }
  } catch (error) {
    console.error(error)
  }
}
</script>

<style scoped lang="scss">
.order-edit-page {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

.form-scroll {
  flex: 1;
  height: 0;
}

.scroll-inner {
  padding: 24rpx 20rpx 140rpx;
}

.section {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 30rpx 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.02);
}

.section-header {
  margin-bottom: 24rpx;
  border-left: 6rpx solid #1890ff;
  padding-left: 14rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #303133;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
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
  width: 200rpx;

  &.required::after {
    content: '*';
    color: #F56C6C;
    margin-left: 4rpx;
  }
}

.form-picker {
  flex: 1;
  text-align: right;
  width: 100%;
}

.picker-inner {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  justify-content: flex-end;
  width: 100%;
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

.form-textarea {
  width: 100%;
  height: 150rpx;
  background: #F8FAFC;
  border: 1rpx solid #E4E7ED;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.bottom-bar {
  flex-shrink: 0;
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
</style>
