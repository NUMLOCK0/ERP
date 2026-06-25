<template>
  <view class="detail-page">
    <scroll-view class="detail-scroll" scroll-y>
      <view class="scroll-inner">
        <!-- ===== 基础信息 ===== -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">基础信息</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label required">产品名称</text>
              <input class="form-input" v-model="form.name" placeholder="请输入标题（1~120字）" />
            </view>
            <view class="form-item">
              <text class="form-label">产品编码</text>
              <input class="form-input" v-model="form.code" placeholder="留空按规则自动生成" />
            </view>
            <view class="form-item">
              <text class="form-label required">产品分类</text>
              <picker class="form-picker" @change="onCategoryChange" :value="categoryIndex" :range="categories" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: categoryIndex === -1 }">
                    {{ categories[categoryIndex]?.name || '请选择分类' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">品牌</text>
              <picker class="form-picker" @change="onBrandChange" :value="brandIndex" :range="brands" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: brandIndex === -1 }">
                    {{ brands[brandIndex]?.name || '请选择品牌' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">默认供应商</text>
              <picker class="form-picker" @change="onSupplierChange" :value="supplierIndex" :range="suppliers" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: supplierIndex === -1 }">
                    {{ suppliers[supplierIndex]?.name || '请选择供应商' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">简述</text>
              <input class="form-input" v-model="form.description" placeholder="最长160字" />
            </view>
            <view class="form-item img-upload-item">
              <text class="form-label">产品图片</text>
              <view class="img-upload-row">
                <view class="image-uploader" @click="chooseAndUploadImage">
                  <image v-if="form.image_urls && form.image_urls[0]" :src="form.image_urls[0]" mode="aspectFill" class="uploader-img" />
                  <view v-else class="uploader-placeholder">
                    <uni-icons type="plus" size="24" color="#909399"></uni-icons>
                    <text class="placeholder-text">选择图片</text>
                  </view>
                </view>
                <text v-if="form.image_urls && form.image_urls[0]" class="remove-img-btn" @click.stop="form.image_urls = []">移除</text>
              </view>
            </view>
            <view class="form-item status-item">
              <text class="form-label">状态</text>
              <radio-group class="form-radio-group" @change="onStatusChange">
                <label class="radio-label"><radio value="1" :checked="form.status === 1" color="#1890FF" />正常</label>
                <label class="radio-label"><radio value="0" :checked="form.status === 0" color="#1890FF" />下架</label>
                <label class="radio-label"><radio value="2" :checked="form.status === 2" color="#1890FF" />停售</label>
                <label class="radio-label"><radio value="3" :checked="form.status === 3" color="#1890FF" />停产</label>
              </radio-group>
            </view>
          </view>
        </view>

        <!-- ===== 规格与单位配置 ===== -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">规格与单位配置</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label">默认仓库</text>
              <picker class="form-picker" @change="onWarehouseChange" :value="warehouseIndex" :range="warehouses" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: warehouseIndex === -1 }">
                    {{ warehouses[warehouseIndex]?.name || '请选择仓库' }}
                  </text>
                  <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">规格</text>
              <input class="form-input" v-model="unitMeta.spec" placeholder="例如：100ml / 500g" />
            </view>
            <view class="form-item">
              <text class="form-label">编码规则</text>
              <input class="form-input" v-model="unitMeta.bmCode" placeholder="如 bm{id}******" />
            </view>
            <view class="form-item">
              <text class="form-label">备注</text>
              <input class="form-input" v-model="unitMeta.remark" placeholder="备注信息" />
            </view>
          </view>
        </view>

        <!-- ===== 计量单位列表 ===== -->
        <view class="section">
          <view class="section-header list-title-row">
            <text class="section-title">计量单位列表</text>
            <view class="add-row-btn" @click="addUnitRow">
              <uni-icons type="plus" size="14" color="#1890FF"></uni-icons>
              <text class="add-row-text">新增单位</text>
            </view>
          </view>

          <!-- 循环显示每一行规格单位 -->
          <view class="unit-row-card" v-for="(row, idx) in unitRows" :key="idx">
            <view class="card-title-row">
              <text class="card-index-title">规格单位 #{{ idx + 1 }} {{ row.is_base ? '(主基准单位)' : '' }}</text>
              <text v-if="!row.is_base" class="remove-row-btn" @click="removeUnitRow(idx)">删除</text>
            </view>
            
            <view class="form-group row-group">
              <view class="form-item">
                <text class="form-label required">单位</text>
                <picker class="form-picker" @change="(e) => onRowUnitChange(e, idx)" :value="getRowUnitIndex(row.unit_id)" :range="dynamicUnits" range-key="name">
                  <view class="picker-inner">
                    <text class="picker-value" :class="{ placeholder: !row.unit_id }">
                      {{ getUnitNameById(row.unit_id) || '选择单位' }}
                    </text>
                    <uni-icons type="arrowdown" size="14" color="#909399"></uni-icons>
                  </view>
                </picker>
              </view>
              <view class="form-item">
                <text class="form-label required">基准数</text>
                <input class="form-input" type="number" v-model="row.base_quantity" :disabled="row.is_base" />
              </view>
              <view class="form-item">
                <text class="form-label">编码</text>
                <input class="form-input" v-model="row.code" placeholder="如{product}-{unit}" />
              </view>
              <view class="form-item">
                <text class="form-label">重量(kg)</text>
                <input class="form-input" type="digit" v-model="row.weight" placeholder="0" />
              </view>
              <view class="form-item">
                <text class="form-label">体积(m³)</text>
                <input class="form-input" type="digit" v-model="row.volume" placeholder="0" />
              </view>
              <view class="form-item">
                <text class="form-label">零售价</text>
                <input class="form-input" type="digit" v-model="row.sale_price" placeholder="0" />
              </view>
              <view class="form-item">
                <text class="form-label">成本价</text>
                <input class="form-input" type="digit" v-model="row.cost_price" placeholder="0" />
              </view>

              <!-- 会员价设置 -->
              <view class="member-price-section" v-if="memberLevels.length > 0">
                <text class="m-title">会员等级价格</text>
                <view class="m-grid">
                  <view class="m-item" v-for="level in memberLevels" :key="level.id">
                    <text class="m-label">{{ level.name }}</text>
                    <input class="m-input" type="digit" v-model="row.member_prices[level.id]" placeholder="0" />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 编辑/新建底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goCancel">取消</view>
      <view class="bottom-btn primary" @click="handleSave">保存</view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { productApi } from '@/api/product'
import { categoryApi } from '@/api/category'
import { commonApi } from '@/api/common'
import { useUserStore } from '@/store/user'

const isCreate = ref(true)
const productId = ref(null)

const form = reactive({
  id: null,
  name: '',
  code: '',
  category_id: null,
  brand_id: null,
  default_supplier_id: null,
  description: '',
  image_urls: [],
  status: 1
})

const unitMeta = ref({
  defaultWarehouseId: null,
  spec: '',
  bmCode: '',
  remark: ''
})

const unitRows = ref([])

// Dropdowns data lists
const categories = ref([])
const brands = ref([])
const suppliers = ref([])
const warehouses = ref([])
const dynamicUnits = ref([])
const memberLevels = ref([])

// Select picker indexes
const categoryIndex = ref(-1)
const brandIndex = ref(-1)
const supplierIndex = ref(-1)
const warehouseIndex = ref(-1)

const fetchDetail = async (id) => {
  try {
    const res = await productApi.getDetail(id)
    if (res.code === 0) {
      const data = res.data || {}
      
      // Populate form for editing
      form.id = data.id
      form.name = data.name || ''
      form.code = data.code || ''
      form.category_id = data.category_id || null
      form.brand_id = data.brand_id || null
      form.default_supplier_id = data.default_supplier_id || null
      form.description = data.description || ''
      form.image_urls = data.image_urls || (data.image ? [data.image] : [])
      form.status = data.status ?? 1
      
      // Populate unit rows
      if (data.units && data.units.length > 0) {
        unitRows.value = data.units.map(item => ({
          unit_id: item.unit_id || null,
          is_base: !!item.is_base,
          base_quantity: item.base_quantity || 1,
          code: item.code || '',
          weight: item.weight || 0,
          volume: item.volume || 0,
          sale_price: item.sale_price || 0,
          cost_price: item.cost_price || 0,
          member_prices: item.member_prices || {},
          spec: item.spec || ''
        }))
        
        const firstRow = data.units[0]
        unitMeta.value = {
          defaultWarehouseId: firstRow.warehouse_id || null,
          spec: firstRow.spec || '',
          bmCode: firstRow.bm_code || '',
          remark: firstRow.remark || ''
        }
      }
      
      matchPickerIndices()
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

const fetchFormOptions = async () => {
  try {
    const [cRes, bRes, uRes, wRes, sRes, lRes] = await Promise.all([
      categoryApi.getList(),
      commonApi.getBrands(),
      commonApi.getUnits(),
      commonApi.getWarehouses(),
      commonApi.getSuppliers({ page: 1, pageSize: 1000, type: 'supplier', status: 1 }),
      commonApi.getMemberLevels()
    ])
    
    if (cRes.code === 0) categories.value = cRes.data || []
    if (bRes.code === 0) brands.value = bRes.data || []
    if (uRes.code === 0) dynamicUnits.value = uRes.data || []
    if (wRes.code === 0) warehouses.value = wRes.data || []
    if (sRes.code === 0) suppliers.value = sRes.data?.list || sRes.data || []
    if (lRes.code === 0) memberLevels.value = lRes.data || []
    
    matchPickerIndices()
  } catch (e) {
    console.error('加载选项数据失败', e)
  }
}

const matchPickerIndices = () => {
  if (form.category_id && categories.value.length > 0) {
    categoryIndex.value = categories.value.findIndex(c => c.id === form.category_id)
  }
  if (form.brand_id && brands.value.length > 0) {
    brandIndex.value = brands.value.findIndex(b => b.id === form.brand_id)
  }
  if (form.default_supplier_id && suppliers.value.length > 0) {
    supplierIndex.value = suppliers.value.findIndex(s => s.id === form.default_supplier_id)
  }
  if (unitMeta.value.defaultWarehouseId && warehouses.value.length > 0) {
    warehouseIndex.value = warehouses.value.findIndex(w => w.id === unitMeta.value.defaultWarehouseId)
  }
}

// Form field change handlers
const onCategoryChange = (e) => {
  categoryIndex.value = e.detail.value
  form.category_id = categories.value[categoryIndex.value]?.id || null
}

const onBrandChange = (e) => {
  brandIndex.value = e.detail.value
  form.brand_id = brands.value[brandIndex.value]?.id || null
}

const onSupplierChange = (e) => {
  supplierIndex.value = e.detail.value
  form.default_supplier_id = suppliers.value[supplierIndex.value]?.id || null
}

const onWarehouseChange = (e) => {
  warehouseIndex.value = e.detail.value
  unitMeta.value.defaultWarehouseId = warehouses.value[warehouseIndex.value]?.id || null
}

const onStatusChange = (e) => {
  form.status = Number(e.detail.value)
}

const onRowUnitChange = (e, rowIdx) => {
  const selectedIdx = e.detail.value
  unitRows.value[rowIdx].unit_id = dynamicUnits.value[selectedIdx]?.id || null
}

const getRowUnitIndex = (unitId) => {
  return dynamicUnits.value.findIndex(u => u.id === unitId)
}

const getUnitNameById = (unitId) => {
  const found = dynamicUnits.value.find(u => u.id === unitId)
  return found ? found.name : ''
}

// Image uploader
const chooseAndUploadImage = () => {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0]
      uni.showLoading({ title: '上传中...' })
      
      const userStore = useUserStore()
      uni.uploadFile({
        url: 'http://localhost:3000/api/upload/file',
        filePath: tempFilePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${userStore.token}`
        },
        success: (uploadRes) => {
          try {
            const resData = JSON.parse(uploadRes.data)
            if (resData.code === 0) {
              form.image_urls = [resData.data.url]
              uni.showToast({ title: '上传成功', icon: 'success' })
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
    }
  })
}

// Unit rows dynamic list handlers
const addUnitRow = () => {
  unitRows.value.push({
    unit_id: null,
    is_base: false,
    base_quantity: 1,
    code: '',
    weight: 0,
    volume: 0,
    sale_price: 0,
    cost_price: 0,
    member_prices: {},
    spec: ''
  })
}

const removeUnitRow = (index) => {
  if (unitRows.value[index]?.is_base) {
    uni.showToast({ title: '基础单位不能删除', icon: 'none' })
    return
  }
  unitRows.value.splice(index, 1)
}

const initCreateForm = () => {
  Object.assign(form, {
    id: null,
    name: '',
    code: '',
    category_id: null,
    brand_id: null,
    default_supplier_id: null,
    description: '',
    image_urls: [],
    status: 1
  })
  
  unitRows.value = [
    {
      unit_id: null,
      is_base: true,
      base_quantity: 1,
      code: '',
      weight: 0,
      volume: 0,
      sale_price: 0,
      cost_price: 0,
      member_prices: {},
      spec: ''
    }
  ]
  
  unitMeta.value = {
    defaultWarehouseId: null,
    spec: '',
    bmCode: '',
    remark: ''
  }
}

const goCancel = () => {
  uni.navigateBack()
}

const submitting = ref(false)

const handleSave = async () => {
  if (!form.name || form.name.trim() === '') {
    uni.showToast({ title: '请填写产品标题', icon: 'none' })
    return
  }
  if (!form.category_id) {
    uni.showToast({ title: '请选择产品分类', icon: 'none' })
    return
  }
  
  const validUnitRows = unitRows.value.filter(u => u.unit_id)
  if (validUnitRows.length === 0) {
    uni.showToast({ title: '请至少指定一个有单位的行', icon: 'none' })
    return
  }
  
  submitting.value = true
  uni.showLoading({ title: '保存中...' })
  
  try {
    const unitsPayload = validUnitRows.map((row, idx) => ({
      unit_id: Number(row.unit_id),
      is_base: row.is_base ? 1 : 0,
      base_quantity: Number(row.base_quantity || 1),
      code: row.code || '',
      weight: Number(row.weight || 0),
      volume: Number(row.volume || 0),
      sale_price: Number(row.sale_price || 0),
      cost_price: Number(row.cost_price || 0),
      member_prices: row.member_prices || {},
      warehouse_id: Number(unitMeta.value.defaultWarehouseId || 0),
      spec: unitMeta.value.spec || '',
      bm_code: unitMeta.value.bmCode || '',
      remark: unitMeta.value.remark || '',
      sort_order: idx
    }))
    
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      category_id: Number(form.category_id),
      brand_id: form.brand_id ? Number(form.brand_id) : null,
      default_supplier_id: form.default_supplier_id ? Number(form.default_supplier_id) : null,
      description: form.description.trim(),
      image_urls: form.image_urls || [],
      status: Number(form.status),
      units: unitsPayload
    }
    
    let res
    if (isCreate.value) {
      res = await productApi.create(payload)
    } else {
      res = await productApi.update(form.id, payload)
    }
    
    if (res.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        uni.$emit('refreshProductList')
        uni.navigateBack()
      }, 1500)
    }
  } catch (e) {
    console.error('保存失败', e)
  } finally {
    submitting.value = false
    uni.hideLoading()
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const id = current.$page?.options?.id
  
  fetchFormOptions()
  
  if (id) {
    productId.value = id
    isCreate.value = false
    uni.setNavigationBarTitle({ title: '编辑产品' })
    fetchDetail(id)
  } else {
    isCreate.value = true
    uni.setNavigationBarTitle({ title: '新增产品' })
    initCreateForm()
  }
})
</script>

<style lang="scss" scoped>
.detail-page {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  overflow: hidden;
}

/* 滚动区 */
.detail-scroll {
  flex: 1;
  height: 0;
}

.scroll-inner {
  padding: 16rpx 24rpx;
}

/* 卡片区 */
.section {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #909399;
}

/* 底部操作栏 */
.bottom-bar {
  flex-shrink: 0;
  display: flex;
  gap: 20rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.bottom-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 600;

  &.primary {
    background: #1890FF;
    color: #FFFFFF;
  }

  &.outline {
    border: 2rpx solid #E0E3E5;
    color: #606266;
  }

  &:active {
    opacity: 0.85;
  }
}

/* 表单控件样式 */
.form-group {
  padding: 0 24rpx 24rpx;
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

  &.img-upload-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 16rpx;
  }

  &.status-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 16rpx;
  }
}

.form-label {
  font-size: 26rpx;
  color: #606266;
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
  font-size: 26rpx;
  color: #303133;
  text-align: right;
}

.form-picker {
  flex: 1;
  height: 48rpx;
}

.picker-inner {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8rpx;
  height: 100%;
}

.picker-value {
  font-size: 26rpx;
  color: #303133;

  &.placeholder {
    color: #C0C4CC;
  }
}

.img-upload-row {
  display: flex;
  align-items: flex-end;
  gap: 20rpx;
  width: 100%;
}

.image-uploader {
  width: 140rpx;
  height: 140rpx;
  border: 2rpx dashed #DCDFE6;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FAFAFA;
}

.uploader-img {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
}

.uploader-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;

  .placeholder-text {
    font-size: 20rpx;
    color: #909399;
  }
}

.remove-img-btn {
  font-size: 24rpx;
  color: #F56C6C;
  padding: 10rpx 0;
}

.form-radio-group {
  display: flex;
  gap: 24rpx;
  width: 100%;
  padding: 8rpx 0;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 26rpx;
  color: #303133;

  radio {
    transform: scale(0.8);
  }
}

/* 规格单位卡片列表 */
.list-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 24rpx !important;
}

.add-row-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  background: #E8F4FF;
  border-radius: 30rpx;

  .add-row-text {
    font-size: 22rpx;
    color: #1890FF;
    font-weight: 600;
  }

  &:active {
    opacity: 0.85;
  }
}

.unit-row-card {
  background: #F8FAFB;
  border-radius: 16rpx;
  margin: 0 24rpx 24rpx;
  padding: 20rpx;
  box-shadow: inset 0 2rpx 8rpx rgba(0,0,0,0.02);
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding: 0 8rpx 12rpx;
  border-bottom: 1rpx solid #EBEDF0;
}

.card-index-title {
  font-size: 24rpx;
  font-weight: 700;
  color: #606266;
}

.remove-row-btn {
  font-size: 24rpx;
  color: #F56C6C;
}

.row-group {
  padding: 0;

  .form-item {
    padding: 16rpx 8rpx;
    border-bottom: 1rpx solid #EBEDF0;
  }
}

/* 会员价区域 */
.member-price-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 20rpx 8rpx 8rpx;
  width: 100%;
}

.m-title {
  font-size: 24rpx;
  font-weight: 700;
  color: #606266;
}

.m-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.m-item {
  width: calc((100% - 16rpx) / 2);
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 8rpx;
  padding: 8rpx 16rpx;
  border: 1rpx solid #E4E7ED;
  box-sizing: border-box;
}

.m-label {
  font-size: 22rpx;
  color: #909399;
  width: 100rpx;
  flex-shrink: 0;
}

.m-input {
  flex: 1;
  font-size: 22rpx;
  color: #303133;
  text-align: right;
}
</style>
