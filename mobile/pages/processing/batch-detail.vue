<template>
  <view class="detail-page">
    <scroll-view class="detail-scroll" scroll-y>
      <view class="scroll-inner" v-if="order.id">
        <!-- ===== 基础概要 ===== -->
        <view class="summary-section">
          <view class="summary-header">
            <text class="batch-no font-bold">{{ order.batch_no }}</text>
            <view class="status-tag" :class="getStatusClass(order.status)">
              {{ statusMap[order.status] }}
            </view>
          </view>
          
          <view class="summary-grid">
            <view class="grid-item">
              <text class="grid-label">采购原包货</text>
              <text class="grid-value font-bold">{{ order.source_product_name || '-' }}</text>
            </view>
            <view class="grid-item">
              <text class="grid-label">原料仓</text>
              <text class="grid-value">{{ order.source_warehouse_name || '-' }}</text>
            </view>
            <view class="grid-item">
              <text class="grid-label">投入数量</text>
              <text class="grid-value font-bold">{{ formatQuantity(order.source_quantity) }} {{ order.source_unit_name || '' }}</text>
            </view>
            <view class="grid-item">
              <text class="grid-label">采购单价</text>
              <text class="grid-value font-bold text-red">￥{{ formatPrice(order.source_unit_price) }}</text>
            </view>
            <view class="grid-item">
              <text class="grid-label">入库仓库</text>
              <text class="grid-value">{{ order.target_warehouse_name || '-' }}</text>
            </view>
            <view class="grid-item">
              <text class="grid-label">创建时间</text>
              <text class="grid-value">{{ formatDate(order.created_at) }}</text>
            </view>
            <view class="grid-item wide" v-if="order.remark">
              <text class="grid-label">加工备注</text>
              <text class="grid-value">{{ order.remark }}</text>
            </view>
          </view>
          <view v-if="normalizeImageUrls(order.image_urls).length" class="detail-image-grid">
            <image
              v-for="(url, idx) in normalizeImageUrls(order.image_urls)"
              :key="idx"
              :src="url"
              mode="aspectFill"
              class="detail-image"
              @click="previewOrderImages(idx)"
            />
          </view>
        </view>

        <!-- ===== 工序产出台账 ===== -->
        <view class="section-title-row">
          <text class="section-title">工序产出台账</text>
          <button
            v-if="Number(order.status) === 1 && availableStageOptions.length > 0"
            class="add-step-btn"
            @click="openAddStagePopup"
          >
            + 新增步骤
          </button>
        </view>

        <view v-if="!order.stages || order.stages.length === 0" class="empty-stages">
          <u-icon name="reload" size="40" color="#DCDFE6"  />
          <text class="empty-text">暂无加工工序步骤</text>
        </view>

        <view v-else class="stage-list">
          <view
            class="stage-card"
            v-for="(stage, index) in order.stages"
            :key="stage.id"
            :class="{ active: canEditStage(index) }"
          >
            <view class="stage-header">
              <view class="stage-name-box">
                <text class="stage-name font-bold">工序: {{ stage.stage_name }}</text>
                <view class="skip-tag" v-if="Number(stage.is_skipped)">已跳过</view>
                <view class="status-dot" :class="{ processed: stage.processed_at, skipped: Number(stage.is_skipped) }"></view>
              </view>
              
              <!-- actions inside stage card -->
              <view class="stage-actions" v-if="Number(order.status) === 1">
                <text v-if="canEditStage(index)" class="act-link text-blue" @click="editStage(stage, index)">登记</text>
                <text v-if="canSkipStage(stage) && canEditStage(index)" class="act-link text-orange" @click="skipStage(stage)">跳过</text>
                <text v-if="canDeleteStage(stage)" class="act-link text-red" @click="deleteStage(stage)">删除</text>
              </view>
            </view>

            <view class="stage-body">
              <view class="stage-info-row">
                <text class="info-label">投入数量：</text>
                <text class="info-value font-bold">{{ formatQuantity(stage.input_quantity) }}</text>
              </view>
              
              <template v-if="!Number(stage.is_skipped) && stage.processed_at">
                <view class="divider"></view>
                <view class="stage-info-row">
                  <text class="info-label">成品等级：</text>
                  <text class="info-value">{{ stage.output_product_name || '-' }}</text>
                </view>
                <view class="stage-info-row">
                  <text class="info-label">等级产出：</text>
                  <text class="info-value font-bold">{{ formatQuantity(stage.output_quantity) }} (比例: {{ stageOutputRatio(stage) }})</text>
                </view>
                <view class="stage-info-row">
                  <text class="info-label">等级单价：</text>
                  <text class="info-value">￥{{ formatPrice(stage.output_unit_price) }}</text>
                </view>
                <view class="stage-info-row" v-if="hasNextStage(stage.stage_key)">
                  <text class="info-label">流转下道：</text>
                  <text class="info-value font-bold">{{ formatQuantity(stage.transfer_quantity) }}</text>
                </view>
                <view class="stage-info-row">
                  <text class="info-label">下料产品：</text>
                  <text class="info-value">{{ stage.byproduct_product_name || '-' }}</text>
                </view>
                <view class="stage-info-row">
                  <text class="info-label">下料产出：</text>
                  <text class="info-value">{{ formatQuantity(stage.byproduct_quantity) }} @ ￥{{ formatPrice(stage.byproduct_unit_price) }}</text>
                </view>
                <view class="stage-info-row">
                  <text class="info-label">损耗数量：</text>
                  <text class="info-value">{{ formatQuantity(stage.loss_quantity) }}</text>
                </view>
                <view class="stage-info-row">
                  <text class="info-label">平衡差值：</text>
                  <text class="info-value" :class="{ 'text-red': Math.abs(stageBalance(stage)) > 0.001 }">
                    {{ formatQuantity(stageBalance(stage)) }}
                  </text>
                </view>
                <view class="stage-info-row">
                  <text class="info-label">加工人员：</text>
                  <text class="info-value">{{ stage.operator_name || '-' }}</text>
                </view>
                <view class="stage-info-row">
                  <text class="info-label">加工时间：</text>
                  <text class="info-value">{{ formatDate(stage.processed_at) }}</text>
                </view>
                <view class="stage-info-row" v-if="stage.remark">
                  <text class="info-label">工序备注：</text>
                  <text class="info-value">{{ stage.remark }}</text>
                </view>
              </template>
              <template v-else-if="Number(stage.is_skipped)">
                <view class="skipped-hint">该工序已被跳过，数量已流转。</view>
              </template>
              <template v-else>
                <view class="pending-hint">等待登记本工序加工产出信息。</view>
              </template>
            </view>
          </view>
        </view>

        <!-- ===== 统计总览 ===== -->
        <view class="totals-section" v-if="order.stages && order.stages.length > 0">
          <text class="totals-title">产出入库预测</text>
          <view class="totals-grid">
            <view class="totals-item"><text class="totals-label">等级成品</text><text class="totals-val font-bold">{{ formatQuantity(gradeQuantity) }}</text></view>
            <view class="totals-item"><text class="totals-label">下料副产品</text><text class="totals-val font-bold">{{ formatQuantity(byproductQuantity) }}</text></view>
            <view class="totals-item"><text class="totals-label">累计损耗</text><text class="totals-val font-bold text-red">{{ formatQuantity(stageLossQuantity) }}</text></view>
            <view class="totals-item"><text class="totals-label">预计入库金额</text><text class="totals-val font-bold text-blue">￥{{ formatPrice(generatedAmount) }}</text></view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- ===== 底部操作栏 ===== -->
    <view class="bottom-bar">
      <!-- 总是可以返回 -->
      <view class="action-btn outline" @click="goBack">返回</view>
      
      <!-- 动态状态操作 -->
      <view v-if="Number(order.status) === 0" class="action-btn primary" @click="handleStart">开工</view>
      <view v-if="Number(order.status) === 1" class="action-btn primary" @click="handleComplete">加工完成</view>
      <view v-if="Number(order.status) === 4" class="action-btn primary" @click="handleInbound">确认产品入库</view>

      <!-- 更多操作 -->
      <view class="action-btn outline" @click="showMoreActions">更多</view>
    </view>

    <!-- ===== 登记/编辑工序弹窗 ===== -->
    <view class="dialog-overlay" :class="{ show: editPopupVisible }">
      <view class="dialog-content">
        <view class="dialog-header">
          <text class="dialog-title">工序登记: {{ editingStage.stage_name }}</text>
          <text class="dialog-close" @click="editPopupVisible = false">×</text>
        </view>
        <scroll-view class="dialog-scroll" scroll-y>
          <view class="dialog-form-inner">
            <view class="form-item-static">
              <text class="form-label">投入数量</text>
              <input v-if="isSourceStage(editingStage.stage_key)" class="form-input text-right font-bold" type="digit" v-model="editingStageForm.input_quantity" />
              <text v-else class="form-value font-bold">{{ formatQuantity(editingStageForm.input_quantity) }}</text>
            </view>
            
            <view class="form-item">
              <text class="form-label required">本等级产品</text>
              <picker class="form-picker" @change="onOutputProductChange" :value="outputProductIndex" :range="productOptions">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: outputProductIndex === -1 }">
                    {{ productOptions[outputProductIndex] || '请选择本等级产品' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>

            <view class="form-item">
              <text class="form-label required">等级产出</text>
              <input class="form-input text-right font-bold" type="digit" v-model="editingStageForm.output_quantity" placeholder="0.00" />
            </view>

            <view class="form-item">
              <text class="form-label required">等级单价</text>
              <input class="form-input text-right" type="digit" v-model="editingStageForm.output_unit_price" placeholder="￥0.00" />
            </view>

            <view class="form-item" v-if="hasNextStage(editingStage.stage_key)">
              <text class="form-label required">流转下道</text>
              <input class="form-input text-right font-bold" type="digit" v-model="editingStageForm.transfer_quantity" placeholder="0.00" />
            </view>

            <view class="form-item">
              <text class="form-label">下料产品</text>
              <picker class="form-picker" @change="onByproductChange" :value="byproductIndex" :range="productOptions">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: byproductIndex === -1 }">
                    {{ productOptions[byproductIndex] || '请选择下料产品' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>

            <view class="form-item">
              <text class="form-label">下料数量</text>
              <input class="form-input text-right" type="digit" v-model="editingStageForm.byproduct_quantity" placeholder="0.00" />
            </view>

            <view class="form-item">
              <text class="form-label">下料单价</text>
              <input class="form-input text-right" type="digit" v-model="editingStageForm.byproduct_unit_price" placeholder="￥0.00" />
            </view>

            <view class="form-item">
              <text class="form-label">损耗数量</text>
              <input class="form-input text-right" type="digit" v-model="editingStageForm.loss_quantity" placeholder="0.00" />
            </view>

            <view class="form-item-static alert-box" :class="{ error: Math.abs(currentPopupBalance) > 0.001 }">
              <text class="form-label">平衡校验</text>
              <text class="form-value font-bold">
                差额: {{ formatQuantity(currentPopupBalance) }} (必须为0)
              </text>
            </view>

            <view class="form-item">
              <text class="form-label required">加工人员</text>
              <picker class="form-picker" @change="onOperatorChange" :value="operatorIndex" :range="operators" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: operatorIndex === -1 }">
                    {{ operators[operatorIndex]?.name || '请选择加工人员' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>

            <view class="form-item">
              <text class="form-label">备注说明</text>
              <input class="form-input text-right" v-model="editingStageForm.remark" placeholder="限60字" />
            </view>
          </view>
        </scroll-view>
        <view class="dialog-footer">
          <button class="dlg-btn outline" @click="editPopupVisible = false">取消</button>
          <button class="dlg-btn primary" @click="saveStageEdit">保存产出</button>
        </view>
      </view>
    </view>

    <!-- ===== 新增加工工序弹窗 ===== -->
    <view class="dialog-overlay" :class="{ show: addStagePopupVisible }">
      <view class="dialog-content short-dialog">
        <view class="dialog-header">
          <text class="dialog-title">新增加工工序步骤</text>
          <text class="dialog-close" @click="addStagePopupVisible = false">×</text>
        </view>
        <view class="dialog-form-inner">
          <view class="form-item">
            <text class="form-label required">选择步骤</text>
            <picker class="form-picker" @change="onAddStageSelectChange" :value="addStageSelectIndex" :range="availableStageOptions" range-key="name">
              <view class="picker-inner">
                <text class="picker-value" :class="{ placeholder: addStageSelectIndex === -1 }">
                  {{ availableStageOptions[addStageSelectIndex]?.name || '请选择要添加的步骤' }}
                </text>
                <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
              </view>
            </picker>
          </view>
        </view>
        <view class="dialog-footer">
          <button class="dlg-btn outline" @click="addStagePopupVisible = false">取消</button>
          <button class="dlg-btn primary" @click="submitAddStage">添加步骤</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { processingApi } from '@/api/processing'
import { productApi } from '@/api/product'
import { employeeApi } from '@/api/employee'

const orderId = ref(null)
const order = ref({})
const products = ref([])
const employees = ref([])

// Popups visibility
const editPopupVisible = ref(false)
const addStagePopupVisible = ref(false)

// Selectors / Indexes
const outputProductIndex = ref(-1)
const byproductIndex = ref(-1)
const operatorIndex = ref(-1)
const addStageSelectIndex = ref(-1)

// Edit State
const editingStage = ref({})
const editingStageForm = reactive({
  input_quantity: '0',
  output_product_id: null,
  output_quantity: '0',
  output_unit_price: '0',
  transfer_quantity: '0',
  byproduct_product_id: null,
  byproduct_quantity: '0',
  byproduct_unit_price: '0',
  loss_quantity: '0',
  operator_id: null,
  processed_at: null,
  remark: ''
})

const addStageKey = ref('')

const statusMap = {
  0: '待开工',
  1: '加工中',
  2: '已入库',
  3: '已取消',
  4: '待入库',
  5: '已关闭'
}

const stageOptions = [
  { key: 'raw_package', name: '原包货' },
  { key: 'screening', name: '过筛' },
  { key: 'color_sorting', name: '色选' },
  { key: 'general_sorting', name: '普选' },
  { key: 'fine_sorting', name: '精选' }
]

const sourceStageKeys = ['raw_package', 'screening', 'color_sorting']
const stageNextMap = { color_sorting: 'general_sorting', general_sorting: 'fine_sorting' }
const stageDependencyMap = { general_sorting: 'color_sorting', fine_sorting: 'general_sorting' }

const productOptions = computed(() => {
  return products.value.map(p => [p.name, p.spec, p.code].filter(Boolean).join(' / '))
})

const operators = computed(() => {
  return [...employees.value]
})

const availableStageOptions = computed(() => {
  const addedKeys = new Set((order.value.stages || []).map(s => s.stage_key))
  return stageOptions.filter(item => !addedKeys.has(item.key))
})

const currentPopupBalance = computed(() => {
  const input = Number(editingStageForm.input_quantity || 0)
  const output = Number(editingStageForm.output_quantity || 0)
  const transfer = Number(editingStageForm.transfer_quantity || 0)
  const byproduct = Number(editingStageForm.byproduct_quantity || 0)
  const loss = Number(editingStageForm.loss_quantity || 0)
  return input - output - transfer - byproduct - loss
})

const gradeQuantity = computed(() => sumStages('output_quantity'))
const byproductQuantity = computed(() => sumStages('byproduct_quantity'))
const stageLossQuantity = computed(() => sumStages('loss_quantity'))
const generatedAmount = computed(() => {
  return (order.value.stages || []).reduce((sum, stage) => {
    return sum + Number(stage.output_quantity || 0) * Number(stage.output_unit_price || 0) +
           Number(stage.byproduct_quantity || 0) * Number(stage.byproduct_unit_price || 0)
  }, 0)
})

onLoad((options) => {
  orderId.value = Number(options.id)
})

onMounted(async () => {
  await getOptions()
  await getDetail()
})

const getOptions = async () => {
  try {
    const [prodRes, empRes] = await Promise.all([
      productApi.getList({ page: 1, pageSize: 1000, status: 1 }),
      employeeApi.getList({ page: 1, pageSize: 1000, status: 1 })
    ])
    if (prodRes.code === 0) products.value = prodRes.data?.list || prodRes.data || []
    if (empRes.code === 0) employees.value = empRes.data?.list || empRes.data || []
  } catch (error) {
    console.error(error)
  }
}

const getDetail = async () => {
  if (!orderId.value) return
  try {
    const res = await processingApi.getOrderDetail(orderId.value)
    if (res.code === 0) {
      order.value = res.data || {}
    }
  } catch (e) {
    console.error(e)
  }
}

const getStatusClass = (status) => {
  const map = {
    0: 'info',
    1: 'warning',
    2: 'success',
    3: 'danger',
    4: 'primary',
    5: 'info'
  }
  return map[status] || 'info'
}

const formatPrice = (val) => {
  if (val === null || val === undefined || val === '') return '0.00'
  return Number(val).toFixed(2)
}

const formatQuantity = (val) => {
  const quantity = Number(val || 0)
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)))
}

const formatDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return val
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const normalizeImageUrls = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [value]
    } catch (error) {
      return [value]
    }
  }
  return []
}

const previewOrderImages = (idx) => {
  const urls = normalizeImageUrls(order.value.image_urls)
  if (!urls.length) return
  uni.previewImage({
    urls,
    current: urls[idx]
  })
}

function isSourceStage(stageKey) {
  return sourceStageKeys.includes(stageKey)
}

function hasNextStage(stageKey) {
  return Boolean(stageNextMap[stageKey])
}

function canEditStage(index) {
  if (Number(order.value.status) !== 1) return false
  const stage = order.value.stages[index]
  if (!stage) return false
  const dependencyKey = stageDependencyMap[stage.stage_key]
  if (!dependencyKey) return true
  return Boolean((order.value.stages || []).find(item => item.stage_key === dependencyKey)?.processed_at)
}

function canSkipStage(row) {
  return row.stage_key !== 'fine_sorting' && !row.processed_at
}

function canDeleteStage(row) {
  if (Number(order.value.status) !== 1 || row.processed_at || Number(row.is_skipped)) return false
  const downstreamKey = Object.entries(stageDependencyMap).find(([, upstreamKey]) => upstreamKey === row.stage_key)?.[0]
  return !downstreamKey || !(order.value.stages || []).some(stage => stage.stage_key === downstreamKey)
}

function stageBalance(row) {
  return Number(row.input_quantity || 0) - Number(row.output_quantity || 0) - Number(row.transfer_quantity || 0) - Number(row.byproduct_quantity || 0) - Number(row.loss_quantity || 0)
}

function stageOutputRatio(row) {
  const input = Number(row.input_quantity || 0)
  if (input <= 0) return '-'
  return `${((Number(row.output_quantity || 0) / input) * 100).toFixed(2)}%`
}

function sumStages(key) {
  return (order.value.stages || []).reduce((sum, stage) => sum + Number(stage[key] || 0), 0)
}

const goBack = () => {
  uni.navigateBack()
}

// Dialog selectors
const onOutputProductChange = (e) => {
  outputProductIndex.value = e.detail.value
  editingStageForm.output_product_id = products.value[outputProductIndex.value]?.id || null
}

const onByproductChange = (e) => {
  byproductIndex.value = e.detail.value
  editingStageForm.byproduct_product_id = products.value[byproductIndex.value]?.id || null
}

const onOperatorChange = (e) => {
  operatorIndex.value = e.detail.value
  editingStageForm.operator_id = operators.value[operatorIndex.value]?.id || null
}

const onAddStageSelectChange = (e) => {
  addStageSelectIndex.value = e.detail.value
  addStageKey.value = availableStageOptions.value[addStageSelectIndex.value]?.key || ''
}

// Stage CRUD operations
const editStage = (stage, index) => {
  editingStage.value = stage
  editingStageForm.input_quantity = String(stage.input_quantity || 0)
  editingStageForm.output_product_id = stage.output_product_id
  editingStageForm.output_quantity = String(stage.output_quantity || 0)
  editingStageForm.output_unit_price = String(stage.output_unit_price || 0)
  editingStageForm.transfer_quantity = String(stage.transfer_quantity || 0)
  editingStageForm.byproduct_product_id = stage.byproduct_product_id
  editingStageForm.byproduct_quantity = String(stage.byproduct_quantity || 0)
  editingStageForm.byproduct_unit_price = String(stage.byproduct_unit_price || 0)
  editingStageForm.loss_quantity = String(stage.loss_quantity || 0)
  editingStageForm.operator_id = stage.operator_id
  editingStageForm.processed_at = stage.processed_at
  editingStageForm.remark = stage.remark || ''

  outputProductIndex.value = products.value.findIndex(p => p.id === stage.output_product_id)
  byproductIndex.value = products.value.findIndex(p => p.id === stage.byproduct_product_id)
  operatorIndex.value = operators.value.findIndex(o => o.id === stage.operator_id)

  editPopupVisible.value = true
}

const saveStageEdit = async () => {
  if (Math.abs(currentPopupBalance.value) > 0.001) {
    uni.showToast({ title: `工序数量不平衡，差额为 ${formatQuantity(currentPopupBalance.value)}`, icon: 'none' })
    return
  }
  if (!editingStageForm.output_product_id) {
    uni.showToast({ title: '请选择本等级产品', icon: 'none' })
    return
  }
  if (!editingStageForm.operator_id) {
    uni.showToast({ title: '请选择加工人员', icon: 'none' })
    return
  }
  
  if (!hasNextStage(editingStage.value.stage_key)) {
    editingStageForm.transfer_quantity = '0'
  }

  try {
    const payload = {
      input_quantity: Number(editingStageForm.input_quantity),
      output_product_id: Number(editingStageForm.output_product_id),
      output_quantity: Number(editingStageForm.output_quantity),
      output_unit_price: Number(editingStageForm.output_unit_price),
      transfer_quantity: Number(editingStageForm.transfer_quantity),
      byproduct_product_id: editingStageForm.byproduct_product_id ? Number(editingStageForm.byproduct_product_id) : null,
      byproduct_quantity: Number(editingStageForm.byproduct_quantity || 0),
      byproduct_unit_price: Number(editingStageForm.byproduct_unit_price || 0),
      loss_quantity: Number(editingStageForm.loss_quantity || 0),
      operator_id: Number(editingStageForm.operator_id),
      operator_name: operators.value[operatorIndex.value]?.name || '',
      processed_at: editingStageForm.processed_at || new Date().toISOString().slice(0, 19).replace('T', ' '),
      remark: editingStageForm.remark || ''
    }

    const res = await processingApi.updateStage(order.value.id, editingStage.value.stage_key, payload)
    if (res.code === 0) {
      uni.showToast({ title: '工序产出已保存' })
      editPopupVisible.value = false
      getDetail()
    }
  } catch (error) {
    console.error(error)
  }
}

const skipStage = async (stage) => {
  const isNext = hasNextStage(stage.stage_key)
  const message = isNext
    ? `确认跳过“${stage.stage_name}”？当前投入 ${formatQuantity(stage.input_quantity)} 将全部流转到下一道工序。`
    : `确认跳过“${stage.stage_name}”？该工序将标记为不执行，不产生产出。`

  uni.showModal({
    title: '跳过工序',
    content: message,
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.skipStage(order.value.id, stage.stage_key, {
            input_quantity: Number(stage.input_quantity || 0),
            remark: '已跳过该工序'
          })
          if (apiRes.code === 0) {
            uni.showToast({ title: '工序已跳过' })
            getDetail()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const deleteStage = async (stage) => {
  uni.showModal({
    title: '删除加工步骤',
    content: `确认删除“${stage.stage_name}”步骤？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.deleteStage(order.value.id, stage.stage_key)
          if (apiRes.code === 0) {
            uni.showToast({ title: '步骤已删除' })
            getDetail()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const openAddStagePopup = () => {
  addStageSelectIndex.value = -1
  addStageKey.value = ''
  addStagePopupVisible.value = true
}

const submitAddStage = async () => {
  if (!addStageKey.value) {
    uni.showToast({ title: '请选择要添加的工序步骤', icon: 'none' })
    return
  }
  try {
    const res = await processingApi.addStage(order.value.id, { stage_key: addStageKey.value })
    if (res.code === 0) {
      uni.showToast({ title: '加工步骤已添加' })
      addStagePopupVisible.value = false
      getDetail()
    }
  } catch (error) {
    console.error(error)
  }
}

// Order State transitions
const handleStart = async () => {
  uni.showModal({
    title: '开工领料',
    content: '开工后将从原料仓扣减原包货库存，确认继续？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.startOrder(order.value.id)
          if (apiRes.code === 0) {
            uni.showToast({ title: '已开工并领料' })
            getDetail()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const handleComplete = async () => {
  uni.showModal({
    title: '加工完成确认',
    content: '确认所有工序均已完成并提交待入库？提交后工序数据将锁定。',
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.completeOrder(order.value.id)
          if (apiRes.code === 0) {
            uni.showToast({ title: '加工已完成' })
            getDetail()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const handleInbound = async () => {
  uni.showModal({
    title: '确认入库',
    content: '将所有等级成品和各工序下料按登记数量、价格入库，确认继续？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.inboundOrder(order.value.id)
          if (apiRes.code === 0) {
            uni.showToast({ title: '全部产品已入库' })
            getDetail()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const handleCancel = async () => {
  uni.showModal({
    title: '取消批次',
    content: '确认取消该待开工批次？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.cancelOrder(order.value.id)
          if (apiRes.code === 0) {
            uni.showToast({ title: '已取消' })
            getDetail()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const handleClose = async () => {
  uni.showModal({
    title: '关闭加工批次',
    content: `确认关闭加工批次 ${order.value.batch_no}？关闭后将把原包货数量 ${formatQuantity(order.value.source_quantity)} 退回原料仓，工序数据将锁定。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.closeOrder(order.value.id)
          if (apiRes.code === 0) {
            uni.showToast({ title: '已关闭' })
            getDetail()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const handleDelete = async () => {
  uni.showModal({
    title: '删除批次',
    content: `删除后无法恢复，确认删除加工批次 ${order.value.batch_no}？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await processingApi.deleteOrder(order.value.id)
          if (apiRes.code === 0) {
            uni.showToast({ title: '已删除' })
            uni.navigateBack()
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const showMoreActions = () => {
  const status = Number(order.value.status)
  const menu = []
  const actions = []
  
  if (status === 0) {
    actions.push({ command: 'cancel', label: '取消批次' })
  }
  if (status === 1) {
    actions.push({ command: 'close', label: '关闭批次' })
  }
  if (status === 3) {
    actions.push({ command: 'delete', label: '删除批次' })
  }

  actions.forEach(act => {
    menu.push(act.label)
  })
  menu.push('复制批次号')

  if (menu.length === 0) {
    uni.showToast({ title: '暂无更多操作', icon: 'none' })
    return
  }

  uni.showActionSheet({
    itemList: menu,
    success: ({ tapIndex }) => {
      const actionLabel = menu[tapIndex]
      if (actionLabel === '复制批次号') {
        uni.setClipboardData({
          data: order.value.batch_no || '',
          success: () => uni.showToast({ title: '复制成功', icon: 'none' })
        })
      } else {
        const clickedAction = actions.find(act => act.label === actionLabel)
        if (clickedAction) {
          const cmd = clickedAction.command
          if (cmd === 'cancel') handleCancel()
          else if (cmd === 'close') handleClose()
          else if (cmd === 'delete') handleDelete()
        }
      }
    }
  })
}
</script>

<style scoped lang="scss">
.detail-page {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

.detail-scroll {
  flex: 1;
  height: 0;
}

.scroll-inner {
  padding: 24rpx 20rpx 140rpx;
}

.summary-section {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 30rpx 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.02);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #F2F6FC;
  padding-bottom: 20rpx;
  margin-bottom: 20rpx;
}

.batch-no {
  font-size: 32rpx;
  color: #303133;
}

.status-tag {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-weight: 600;
  
  &.info { background: #F4F4F5; color: #909399; }
  &.warning { background: #FDF6EC; color: #E6A23C; }
  &.success { background: #F0F9EB; color: #67C23A; }
  &.danger { background: #FEF0F0; color: #F56C6C; }
  &.primary { background: #ECF5FF; color: #409EFF; }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx 24rpx;
}

.grid-item {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  
  &.wide {
    grid-column: span 2;
  }
}

.grid-label {
  font-size: 24rpx;
  color: #909399;
}

.grid-value {
  font-size: 26rpx;
  color: #303133;
}

.detail-image-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
  margin-top: 22rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F2F6FC;
}

.detail-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10rpx;
  background: #F5F7FA;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #303133;
  border-left: 6rpx solid #1890ff;
  padding-left: 14rpx;
}

.add-step-btn {
  height: 52rpx;
  line-height: 52rpx;
  background: #1890FF;
  color: #ffffff;
  font-size: 22rpx;
  border-radius: 8rpx;
  padding: 0 16rpx;
  margin: 0;
  border: none;
  font-weight: 600;
}

.empty-stages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
  background: #ffffff;
  border-radius: 20rpx;
}

.empty-text {
  font-size: 24rpx;
  color: #C0C4CC;
  margin-top: 12rpx;
}

.stage-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.stage-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.02);
  border: 1rpx solid #EBEEF5;
  transition: all 0.2s ease-out;

  &.active {
    border-color: #A0CFFF;
    background: #F0F7FF;
  }
}

.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16rpx;
  border-bottom: 1rpx dashed #EBEEF5;
  margin-bottom: 16rpx;
}

.stage-name-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.stage-name {
  font-size: 28rpx;
  color: #303133;
}

.skip-tag {
  font-size: 20rpx;
  color: #909399;
  background: #F4F4F5;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: #E6A23C;

  &.processed { background: #67C23A; }
  &.skipped { background: #909399; }
}

.stage-actions {
  display: flex;
  gap: 20rpx;
}

.act-link {
  font-size: 24rpx;
  font-weight: 600;
}

.text-blue { color: #1890ff; }
.text-orange { color: #e6a23c; }
.text-red { color: #f56c6c; }

.stage-body {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.stage-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 26rpx;
}

.info-label {
  color: #909399;
}

.info-value {
  color: #303133;
}

.divider {
  height: 1rpx;
  background: #EBEEF5;
  margin: 8rpx 0;
}

.skipped-hint {
  font-size: 24rpx;
  color: #909399;
  font-style: italic;
  padding: 10rpx 0;
}

.pending-hint {
  font-size: 24rpx;
  color: #E6A23C;
  font-style: italic;
  padding: 10rpx 0;
}

.totals-section {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-top: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.02);
}

.totals-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #303133;
  margin-bottom: 16rpx;
  display: block;
}

.totals-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.totals-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 26rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #F2F6FC;
  
  &:nth-last-child(-n+2) {
    border-bottom: none;
  }
}

.totals-label {
  color: #909399;
}

.totals-val {
  color: #303133;
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

.action-btn {
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

/* Modal overlays styles */
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
  height: 80vh;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.24s ease-out;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  
  &.short-dialog {
    height: 40vh;
  }
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
  font-size: 44rpx;
  color: #909399;
  line-height: 1;
}

.dialog-scroll {
  flex: 1;
  height: 0;
}

.dialog-form-inner {
  padding: 10rpx 36rpx 40rpx;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F2F6FC;
}

.form-item-static {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F2F6FC;

  &.alert-box {
    background: #F0F9EB;
    border-radius: 12rpx;
    padding: 18rpx 20rpx;
    border: 1rpx solid #E1F3D8;
    margin: 16rpx 0;
    
    .form-value { color: #67C23A; }
    
    &.error {
      background: #FEF0F0;
      border-color: #FDE2E2;
      .form-value { color: #F56C6C; }
    }
  }
}

.form-label {
  font-size: 28rpx;
  color: #606266;
  flex-shrink: 0;
  
  &.required::after {
    content: '*';
    color: #F56C6C;
    margin-left: 4rpx;
  }
}

.form-value {
  font-size: 28rpx;
  color: #303133;
}

.form-input {
  flex: 1;
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

.dialog-footer {
  flex-shrink: 0;
  padding: 20rpx 36rpx;
  border-top: 1rpx solid #F2F6FC;
  display: flex;
  gap: 16rpx;
}

.dlg-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 16rpx;
  font-size: 26rpx;
  font-weight: 600;
  margin: 0;
  border: none;

  &.outline {
    background: #F4F4F5;
    color: #909399;
  }

  &.primary {
    background: #1890FF;
    color: #FFFFFF;
  }
}
</style>
