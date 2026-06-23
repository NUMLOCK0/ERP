<template>
  <div class="processing-page">
    <el-card>
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增加工批次</el-button>
      </div>

      <SearchForm :model="searchForm" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="批次号/原包货/供应商" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="待开工" :value="0" />
            <el-option label="加工中" :value="1" />
            <el-option label="待入库" :value="4" />
            <el-option label="已入库" :value="2" />
            <el-option label="已取消" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="原料仓">
          <el-select v-model="searchForm.source_warehouse_id" placeholder="全部" clearable filterable>
            <el-option v-for="item in warehouses" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="入库仓">
          <el-select v-model="searchForm.target_warehouse_id" placeholder="全部" clearable filterable>
            <el-option v-for="item in warehouses" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
      </SearchForm>

      <TableColumnTools table-key="processing-order" filename="加工批次" />

      <el-table border :data="tableData" stripe v-loading="loading">
        <el-table-column prop="batch_no" label="加工批次" width="190" show-overflow-tooltip>
          <template #default="{ row }"><CopyableNo :value="row.batch_no" /></template>
        </el-table-column>
        <el-table-column prop="source_product_name" label="采购原包货" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="95">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前环节" width="110">
          <template #default="{ row }">{{ currentStageText(row) }}</template>
        </el-table-column>
        <el-table-column label="原包货数量" width="125" align="right">
          <template #default="{ row }">{{ formatQuantity(row.source_quantity) }} {{ row.source_unit_name || '' }}</template>
        </el-table-column>
        <el-table-column label="采购单价" width="110" align="right">
          <template #default="{ row }">{{ formatMoney(row.source_unit_price) }}</template>
        </el-table-column>
        <el-table-column label="生成产品" width="110" align="right">
          <template #default="{ row }">{{ formatQuantity(row.generated_quantity) }}</template>
        </el-table-column>
        <el-table-column label="产出金额" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.generated_amount) }}</template>
        </el-table-column>
        <el-table-column prop="source_warehouse_name" label="原料仓" min-width="120" show-overflow-tooltip />
        <el-table-column prop="target_warehouse_name" label="入库仓" min-width="120" show-overflow-tooltip />
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="270" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="handleDetail(row)">工序台账</el-button>
            <el-button v-if="Number(row.status) === 0" type="success" link :icon="VideoPlay" @click="handleStart(row)">开工</el-button>
            <el-button v-if="Number(row.status) === 4" type="success" link :icon="Download" @click="handleInbound(row)">入库</el-button>
            <el-button v-if="Number(row.status) === 0" type="danger" link @click="handleCancel(row)">取消</el-button>
            <el-button v-if="Number(row.status) === 3" type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination v-model:page="pagination.page" v-model:size="pagination.size" :total="total" @change="fetchData" />
    </el-card>

    <el-dialog v-model="editorVisible" title="新增药材加工批次" width="780px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="110px">
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="采购原包货" prop="source_product_id">
              <el-select v-model="form.source_product_id" placeholder="选择已采购入库的原包货" filterable clearable @change="handleSourceProductChange">
                <el-option v-for="item in products" :key="item.id" :label="productLabel(item)" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商">
              <el-select v-model="form.supplier_id" placeholder="可选" filterable clearable>
                <el-option v-for="item in suppliers" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="原料仓" prop="source_warehouse_id">
              <el-select v-model="form.source_warehouse_id" placeholder="原包货当前仓库" filterable clearable>
                <el-option v-for="item in warehouses" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品入库仓" prop="target_warehouse_id">
              <el-select v-model="form.target_warehouse_id" placeholder="加工产品统一入库仓" filterable clearable>
                <el-option v-for="item in warehouses" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="原包货数量" prop="source_quantity">
              <el-input-number v-model="form.source_quantity" :min="0.01" :precision="2" :controls="false" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="采购单价" prop="source_unit_price">
              <el-input-number v-model="form.source_unit_price" :min="0" :precision="2" :controls="false" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="加工备注">
              <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="批次、产地、含水率、特殊加工要求等" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSave">保存批次</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="加工工序与产出入库" size="92%" direction="rtl">
      <div v-loading="detailLoading" class="detail-body">
        <template v-if="detailData.id">
          <div class="batch-summary">
            <div>
              <div class="summary-label">加工批次</div>
              <div class="summary-value">{{ detailData.batch_no }}</div>
            </div>
            <div>
              <div class="summary-label">采购原包货</div>
              <div class="summary-value">{{ detailData.source_product_name }}</div>
            </div>
            <div>
              <div class="summary-label">投入数量 / 单价</div>
              <div class="summary-value">{{ formatQuantity(detailData.source_quantity) }} / {{ formatMoney(detailData.source_unit_price) }}</div>
            </div>
            <div>
              <div class="summary-label">加工产品入库仓</div>
              <div class="summary-value">{{ detailData.target_warehouse_name }}</div>
            </div>
            <div>
              <div class="summary-label">状态</div>
              <el-tag :type="statusType(detailData.status)">{{ statusText(detailData.status) }}</el-tag>
            </div>
          </div>

          <el-steps :active="activeStageIndex" finish-status="success" process-status="process" align-center class="stage-steps">
            <el-step title="采购原包货" />
            <el-step v-for="stage in detailData.stages" :key="stage.stage_key" :title="stage.stage_name" />
            <el-step title="产品入库" />
          </el-steps>

          <div class="section-header">
            <div class="section-heading">工序产出台账</div>
            <el-button
              v-if="Number(detailData.status) === 1"
              type="primary"
              :icon="Plus"
              :disabled="availableStageOptions.length === 0"
              @click="openStageAdder"
            >新增加工步骤</el-button>
          </div>
          <el-empty v-if="!detailData.stages?.length" description="暂无加工步骤" />
          <el-table v-else border :data="detailData.stages" stripe row-key="id">
            <el-table-column prop="stage_name" label="工序" width="96" fixed="left">
              <template #default="{ row }">
                <span>{{ row.stage_name }}</span>
                <el-tag v-if="Number(row.is_skipped)" type="info" size="small" class="skip-tag">已跳过</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="投入数量" width="125" align="right">
              <template #default="{ row, $index }">
                <el-input-number
                  v-if="isSourceStage(row.stage_key)"
                  v-model="row.input_quantity"
                  :min="0"
                  :precision="2"
                  :controls="false"
                  :disabled="!canEditStage($index)"
                />
                <strong v-else>{{ formatQuantity(row.input_quantity) }}</strong>
              </template>
            </el-table-column>
            <el-table-column label="本等级产品" min-width="180">
              <template #default="{ row, $index }">
                <el-select v-model="row.output_product_id" filterable clearable placeholder="请选择本等级产品" :disabled="!canEditStage($index)">
                  <el-option v-for="item in products" :key="item.id" :label="productLabel(item)" :value="item.id" />
                  <template #footer>
                    <el-button type="primary" link :icon="Plus" @click.stop="openProductCreator(row, 'output_product_id')">新增产品</el-button>
                  </template>
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="等级产出" width="120" align="right">
              <template #default="{ row, $index }">
                <el-input-number v-model="row.output_quantity" :min="0" :precision="2" :controls="false" :disabled="!canEditStage($index)" />
              </template>
            </el-table-column>
            <el-table-column label="成品比例" width="105" align="right">
              <template #default="{ row }">{{ stageOutputRatio(row) }}</template>
            </el-table-column>
            <el-table-column label="等级单价" width="115" align="right">
              <template #default="{ row, $index }">
                <el-input-number v-model="row.output_unit_price" :min="0" :precision="2" :controls="false" :disabled="!canEditStage($index)" />
              </template>
            </el-table-column>
            <el-table-column label="流转下道" width="120" align="right">
              <template #default="{ row, $index }">
                <el-input-number v-model="row.transfer_quantity" :min="0" :precision="2" :controls="false" :disabled="!canEditStage($index) || !hasNextStage(row.stage_key)" />
              </template>
            </el-table-column>
            <el-table-column label="下料产品" min-width="180">
              <template #default="{ row, $index }">
                <el-select v-model="row.byproduct_product_id" filterable clearable placeholder="请选择下料产品" :disabled="!canEditStage($index)">
                  <el-option v-for="item in products" :key="item.id" :label="productLabel(item)" :value="item.id" />
                  <template #footer>
                    <el-button type="primary" link :icon="Plus" @click.stop="openProductCreator(row, 'byproduct_product_id')">新增产品</el-button>
                  </template>
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="下料数量" width="120" align="right">
              <template #default="{ row, $index }">
                <el-input-number v-model="row.byproduct_quantity" :min="0" :precision="2" :controls="false" :disabled="!canEditStage($index)" />
              </template>
            </el-table-column>
            <el-table-column label="下料单价" width="115" align="right">
              <template #default="{ row, $index }">
                <el-input-number v-model="row.byproduct_unit_price" :min="0" :precision="2" :controls="false" :disabled="!canEditStage($index)" />
              </template>
            </el-table-column>
            <el-table-column label="损耗" width="105" align="right">
              <template #default="{ row, $index }">
                <el-input-number v-model="row.loss_quantity" :min="0" :precision="2" :controls="false" :disabled="!canEditStage($index)" />
              </template>
            </el-table-column>
            <el-table-column label="平衡差" width="105" align="right">
              <template #default="{ row }">
                <span :class="{ 'balance-error': Math.abs(stageBalance(row)) > 0.001 }">{{ formatQuantity(stageBalance(row)) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="加工人" width="120">
              <template #default="{ row, $index }">
                <el-select v-model="row.operator_id" filterable clearable placeholder="请选择加工人" :disabled="!canEditStage($index)">
                  <el-option v-for="item in operatorOptions" :key="item.id" :label="employeeLabel(item)" :value="item.id" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="加工时间" width="185">
              <template #default="{ row, $index }">
                <el-date-picker v-model="row.processed_at" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="保存时默认当前" :disabled="!canEditStage($index)" />
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="150">
              <template #default="{ row, $index }"><el-input v-model="row.remark" :disabled="!canEditStage($index)" /></template>
            </el-table-column>
            <el-table-column label="操作" width="165" fixed="right">
              <template #default="{ row, $index }">
                <el-button type="primary" link :disabled="!canEditStage($index)" @click="handleStageSave(row, $index)">保存</el-button>
                <el-button
                  v-if="canSkipStage(row)"
                  type="warning"
                  link
                  :disabled="!canEditStage($index)"
                  @click="handleStageSkip(row)"
                >跳过</el-button>
                <el-button
                  v-if="canDeleteStage(row)"
                  type="danger"
                  link
                  @click="handleStageDelete(row)"
                >删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="detail-footer">
            <div class="totals">
              <span>等级成品：{{ formatQuantity(gradeQuantity) }}</span>
              <span>下料：{{ formatQuantity(byproductQuantity) }}</span>
              <span>损耗：{{ formatQuantity(stageLossQuantity) }}</span>
              <strong>预计入库金额：{{ formatMoney(generatedAmount) }}</strong>
            </div>
            <div>
              <el-button v-if="Number(detailData.status) === 1" type="primary" :icon="CircleCheck" @click="handleComplete(detailData)">加工完成，提交入库</el-button>
              <el-button v-if="Number(detailData.status) === 4" type="success" :icon="Download" @click="handleInbound(detailData)">确认全部产品入库</el-button>
            </div>
          </div>

          <template v-if="detailData.inbound_items?.length">
            <div class="section-heading inbound-heading">已入库产品</div>
            <el-table border :data="detailData.inbound_items" stripe>
              <el-table-column prop="stage_key" label="工序" width="110">
                <template #default="{ row }">{{ stageName(row.stage_key) }}</template>
              </el-table-column>
              <el-table-column label="产出类型" width="100">
                <template #default="{ row }"><el-tag size="small" :type="row.output_type === 'grade' ? 'success' : 'warning'">{{ row.output_type === 'grade' ? '等级成品' : '下料' }}</el-tag></template>
              </el-table-column>
              <el-table-column prop="product_name" label="产品" min-width="180" />
              <el-table-column prop="warehouse_name" label="仓库" min-width="130" />
              <el-table-column label="数量" width="120" align="right"><template #default="{ row }">{{ formatQuantity(row.quantity) }}</template></el-table-column>
              <el-table-column label="单价" width="120" align="right"><template #default="{ row }">{{ formatMoney(row.unit_price) }}</template></el-table-column>
              <el-table-column label="金额" width="130" align="right"><template #default="{ row }">{{ formatMoney(row.amount) }}</template></el-table-column>
              <el-table-column label="入库时间" width="170"><template #default="{ row }">{{ formatDateTime(row.inbound_at) }}</template></el-table-column>
            </el-table>
          </template>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="stageAdderVisible" title="新增加工步骤" width="420px">
      <el-form label-width="86px">
        <el-form-item label="加工步骤">
          <el-select v-model="stageAdderForm.stage_key" placeholder="请选择要添加的加工步骤" filterable>
            <el-option
              v-for="item in availableStageOptions"
              :key="item.key"
              :label="item.name"
              :value="item.key"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stageAdderVisible = false">取消</el-button>
        <el-button type="primary" :loading="stageAdding" @click="handleStageAdd">添加步骤</el-button>
      </template>
    </el-dialog>

    <ProductCreateDialog v-model="productCreatorVisible" @created="handleProductCreated" />
  </div>
</template>

<script setup lang="ts">
import TableColumnTools from '@/components/TableColumnTools.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { CircleCheck, Delete, Download, Plus, VideoPlay, View } from '@element-plus/icons-vue'
import { getProducts } from '@/api/product'
import { getWarehouses } from '@/api/warehouse'
import { getSuppliers } from '@/api/supplier'
import { getAllEmployees } from '@/api/employee'
import { useUserStore } from '@/stores/user'
import {
  addProcessingStage,
  cancelProcessingOrder,
  completeProcessingOrder,
  createProcessingOrder,
  deleteProcessingOrder,
  deleteProcessingStage,
  getProcessingOrder,
  getProcessingOrders,
  inboundProcessingOrder,
  skipProcessingStage,
  startProcessingOrder,
  updateProcessingStage
} from '@/api/processing'
import SearchForm from '@/components/SearchForm.vue'
import Pagination from '@/components/Pagination.vue'
import CopyableNo from '@/components/CopyableNo.vue'
import ProductCreateDialog from '@/components/ProductCreateDialog.vue'

const loading = ref(false)
const submitting = ref(false)
const editorVisible = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const productCreatorVisible = ref(false)
const stageAdderVisible = ref(false)
const stageAdding = ref(false)
const productCreatorTarget = ref<{ row: any; field: 'output_product_id' | 'byproduct_product_id' } | null>(null)
const formRef = ref<FormInstance>()
const tableData = ref<any[]>([])
const products = ref<any[]>([])
const warehouses = ref<any[]>([])
const suppliers = ref<any[]>([])
const employees = ref<any[]>([])
const userStore = useUserStore()
const total = ref(0)
const pagination = reactive({ page: 1, size: 20 })
const searchForm = reactive({ keyword: '', status: null as number | null, source_warehouse_id: null as number | null, target_warehouse_id: null as number | null })
const form = reactive({
  source_product_id: null as number | null,
  source_warehouse_id: null as number | null,
  target_warehouse_id: null as number | null,
  supplier_id: null as number | null,
  source_quantity: 1,
  source_unit_price: 0,
  remark: ''
})
const formRules: FormRules = {
  source_product_id: [{ required: true, message: '请选择采购原包货', trigger: 'change' }],
  source_warehouse_id: [{ required: true, message: '请选择原料仓', trigger: 'change' }],
  target_warehouse_id: [{ required: true, message: '请选择加工产品入库仓', trigger: 'change' }],
  source_quantity: [{ required: true, message: '请输入原包货数量', trigger: 'blur' }],
  source_unit_price: [{ required: true, message: '请输入采购单价', trigger: 'blur' }]
}
const detailData = reactive<any>({ stages: [], inbound_items: [] })
const stageOptions = [
  { key: 'raw_package', name: '原包货' },
  { key: 'screening', name: '过筛' },
  { key: 'color_sorting', name: '色选' },
  { key: 'general_sorting', name: '普选' },
  { key: 'fine_sorting', name: '精选' }
]
const sourceStageKeys = ['raw_package', 'screening', 'color_sorting']
const stageNextMap: Record<string, string> = { color_sorting: 'general_sorting', general_sorting: 'fine_sorting' }
const stageDependencyMap: Record<string, string> = { general_sorting: 'color_sorting', fine_sorting: 'general_sorting' }
const stageAdderForm = reactive({ stage_key: '' })
const gradeQuantity = computed(() => sumStages('output_quantity'))
const byproductQuantity = computed(() => sumStages('byproduct_quantity'))
const stageLossQuantity = computed(() => sumStages('loss_quantity'))
const generatedAmount = computed(() => (detailData.stages || []).reduce((sum: number, stage: any) => (
  sum + Number(stage.output_quantity || 0) * Number(stage.output_unit_price || 0) +
  Number(stage.byproduct_quantity || 0) * Number(stage.byproduct_unit_price || 0)
), 0))
const operatorOptions = computed(() => {
  const options = [...employees.value]
  const currentUserId = Number(userStore.userInfo?.id || 0)
  const linkedEmployee = options.find(item => Number(item.user_id) === currentUserId)
  if (!linkedEmployee && currentUserId) {
    options.unshift({
      id: -currentUserId,
      user_id: currentUserId,
      name: userStore.userInfo?.real_name || userStore.userInfo?.username || '当前用户',
      is_current_user: true
    })
  }
  return options
})
const defaultOperatorId = computed(() => {
  const currentUserId = Number(userStore.userInfo?.id || 0)
  const linkedEmployee = employees.value.find(item => Number(item.user_id) === currentUserId)
  return linkedEmployee?.id || (currentUserId ? -currentUserId : null)
})
const availableStageOptions = computed(() => {
  const addedKeys = new Set((detailData.stages || []).map((stage: any) => stage.stage_key))
  return stageOptions.filter(item => !addedKeys.has(item.key))
})
const activeStageIndex = computed(() => {
  const inboundIndex = (detailData.stages?.length || 0) + 1
  if (Number(detailData.status) === 2) return inboundIndex + 1
  if (Number(detailData.status) === 4) return inboundIndex
  const index = (detailData.stages || []).findIndex((stage: any) => !stage.processed_at)
  return index === -1 ? inboundIndex : index + 1
})

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getProcessingOrders({
      page: pagination.page,
      pageSize: pagination.size,
      keyword: searchForm.keyword,
      status: searchForm.status ?? '',
      source_warehouse_id: searchForm.source_warehouse_id,
      target_warehouse_id: searchForm.target_warehouse_id
    })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() { pagination.page = 1; fetchData() }
function handleReset() {
  Object.assign(searchForm, { keyword: '', status: null, source_warehouse_id: null, target_warehouse_id: null })
  handleSearch()
}
function resetForm() {
  Object.assign(form, {
    source_product_id: null,
    source_warehouse_id: warehouses.value[0]?.id || null,
    target_warehouse_id: warehouses.value[0]?.id || null,
    supplier_id: null,
    source_quantity: 1,
    source_unit_price: 0,
    remark: ''
  })
  formRef.value?.clearValidate()
}
function handleAdd() { resetForm(); editorVisible.value = true }
function handleSourceProductChange(productId: number) {
  const product = products.value.find(item => Number(item.id) === Number(productId))
  form.source_unit_price = Number(product?.cost_price || 0)
  form.supplier_id = product?.default_supplier_id || form.supplier_id
}
function openStageAdder() {
  stageAdderForm.stage_key = availableStageOptions.value[0]?.key || ''
  stageAdderVisible.value = true
}
async function handleStageAdd() {
  if (!stageAdderForm.stage_key) {
    ElMessage.warning('请选择要添加的加工步骤')
    return
  }
  stageAdding.value = true
  try {
    await addProcessingStage(detailData.id, { stage_key: stageAdderForm.stage_key })
    ElMessage.success('加工步骤已添加')
    stageAdderVisible.value = false
    await handleDetail(detailData)
    fetchData()
  } finally {
    stageAdding.value = false
  }
}
async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    await createProcessingOrder({ ...form, source_quantity: Number(form.source_quantity), source_unit_price: Number(form.source_unit_price) })
    ElMessage.success('加工批次已创建')
    editorVisible.value = false
    fetchData()
  } finally {
    submitting.value = false
  }
}
async function handleDetail(row: any) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    const res: any = await getProcessingOrder(row.id)
    Object.keys(detailData).forEach(key => delete detailData[key])
    const stages = (res.data?.stages || []).map((stage: any) => ({
      ...stage,
      output_product_id: Number(stage.output_product_id) || null,
      byproduct_product_id: Number(stage.byproduct_product_id) || null,
      operator_id: Number(stage.operator_id) || (!stage.processed_at ? defaultOperatorId.value : null)
    }))
    Object.assign(detailData, res.data || {}, { stages, inbound_items: res.data?.inbound_items || [] })
  } finally {
    detailLoading.value = false
  }
}
async function handleStart(row: any) {
  await ElMessageBox.confirm('开工后将从原料仓扣减原包货库存，确认继续？', '开工领料', { type: 'warning' })
  await startProcessingOrder(row.id)
  ElMessage.success('已开工并完成原包货领料')
  fetchData()
  if (detailData.id === row.id) handleDetail(row)
}
function canEditStage(index: number) {
  if (Number(detailData.status) !== 1) return false
  const stage = detailData.stages[index]
  if (!stage) return false
  const dependencyKey = stageDependencyMap[stage.stage_key]
  if (!dependencyKey) return true
  return Boolean((detailData.stages || []).find((item: any) => item.stage_key === dependencyKey)?.processed_at)
}
async function handleStageSave(row: any, index: number) {
  const balance = stageBalance(row)
  if (Math.abs(balance) > 0.001) {
    ElMessage.warning(`当前工序数量不平衡，差额为 ${formatQuantity(balance)}`)
    return
  }
  if (!hasNextStage(row.stage_key)) row.transfer_quantity = 0
  const selectedOperator = operatorOptions.value.find(item => Number(item.id) === Number(row.operator_id))
  await updateProcessingStage(detailData.id, row.stage_key, {
    input_quantity: Number(row.input_quantity || 0),
    output_product_id: row.output_product_id,
    output_quantity: Number(row.output_quantity || 0),
    output_unit_price: Number(row.output_unit_price || 0),
    transfer_quantity: Number(row.transfer_quantity || 0),
    byproduct_product_id: row.byproduct_product_id,
    byproduct_quantity: Number(row.byproduct_quantity || 0),
    byproduct_unit_price: Number(row.byproduct_unit_price || 0),
    loss_quantity: Number(row.loss_quantity || 0),
    operator_id: Number(row.operator_id) > 0 ? Number(row.operator_id) : 0,
    operator_name: selectedOperator?.name || '',
    processed_at: row.processed_at || null,
    remark: row.remark || ''
  })
  ElMessage.success(`${row.stage_name}产出已保存`)
  await handleDetail(detailData)
  fetchData()
}
async function handleStageSkip(row: any) {
  const message = hasNextStage(row.stage_key)
    ? `确认跳过“${row.stage_name}”？当前投入 ${formatQuantity(row.input_quantity)} 将全部流转到下一道工序。`
    : `确认跳过“${row.stage_name}”？该工序将标记为不执行，不产生产出。`
  await ElMessageBox.confirm(
    message,
    '跳过工序',
    { type: 'warning' }
  )
  const selectedOperator = operatorOptions.value.find(item => Number(item.id) === Number(row.operator_id))
  await skipProcessingStage(detailData.id, row.stage_key, {
    input_quantity: Number(row.input_quantity || 0),
    operator_id: Number(row.operator_id) > 0 ? Number(row.operator_id) : 0,
    operator_name: selectedOperator?.name || '',
    remark: '已跳过该工序'
  })
  ElMessage.success(hasNextStage(row.stage_key) ? `${row.stage_name}已跳过，投入数量已流转到下一道工序` : `${row.stage_name}已跳过`)
  await handleDetail(detailData)
  fetchData()
}
async function handleStageDelete(row: any) {
  await ElMessageBox.confirm(`确认删除“${row.stage_name}”步骤？`, '删除加工步骤', {
    type: 'warning',
    confirmButtonText: '确认删除',
    cancelButtonText: '保留步骤'
  })
  await deleteProcessingStage(detailData.id, row.stage_key)
  ElMessage.success(`${row.stage_name}步骤已删除`)
  await handleDetail(detailData)
  fetchData()
}
async function handleComplete(row: any) {
  await ElMessageBox.confirm('确认所有工序均已完成并提交待入库？提交后工序数据将锁定。', '加工完成', { type: 'warning' })
  await completeProcessingOrder(row.id)
  ElMessage.success('加工已完成，产品等待入库')
  fetchData()
  handleDetail(row)
}
async function handleInbound(row: any) {
  await ElMessageBox.confirm('将所有等级成品和各工序下料按登记数量、价格入库，确认继续？', '确认产品入库', { type: 'warning' })
  await inboundProcessingOrder(row.id)
  ElMessage.success('全部加工产品已入库')
  fetchData()
  if (detailData.id === row.id) handleDetail(row)
}
async function handleCancel(row: any) {
  await ElMessageBox.confirm('确认取消该待开工批次？', '取消批次', { type: 'warning' })
  await cancelProcessingOrder(row.id)
  ElMessage.success('已取消')
  fetchData()
}
async function handleDelete(row: any) {
  await ElMessageBox.confirm(`删除后无法恢复，确认删除加工批次 ${row.batch_no}？`, '删除已取消批次', {
    type: 'warning',
    confirmButtonText: '确认删除',
    cancelButtonText: '保留批次'
  })
  await deleteProcessingOrder(row.id)
  ElMessage.success('已取消的加工批次已删除')
  if (detailData.id === row.id) detailVisible.value = false
  fetchData()
}
function openProductCreator(row: any, field: 'output_product_id' | 'byproduct_product_id') {
  productCreatorTarget.value = { row, field }
  productCreatorVisible.value = true
}
async function handleProductCreated(productId: number) {
  const res: any = await getProducts({ page: 1, pageSize: 1000, status: 1 })
  products.value = listOf(res)
  if (productCreatorTarget.value && productId) {
    productCreatorTarget.value.row[productCreatorTarget.value.field] = productId
  }
  productCreatorTarget.value = null
}
function stageBalance(row: any) {
  return Number(row.input_quantity || 0) - Number(row.output_quantity || 0) - Number(row.transfer_quantity || 0) - Number(row.byproduct_quantity || 0) - Number(row.loss_quantity || 0)
}
function isSourceStage(stageKey: string) { return sourceStageKeys.includes(stageKey) }
function hasNextStage(stageKey: string) { return Boolean(stageNextMap[stageKey]) }
function canSkipStage(row: any) {
  return row.stage_key !== 'fine_sorting' && !row.processed_at
}
function canDeleteStage(row: any) {
  if (Number(detailData.status) !== 1 || row.processed_at || Number(row.is_skipped)) return false
  const downstreamKey = Object.entries(stageDependencyMap).find(([, upstreamKey]) => upstreamKey === row.stage_key)?.[0]
  return !downstreamKey || !(detailData.stages || []).some((stage: any) => stage.stage_key === downstreamKey)
}
function stageOutputRatio(row: any) {
  const input = Number(row.input_quantity || 0)
  if (input <= 0) return '-'
  return `${((Number(row.output_quantity || 0) / input) * 100).toFixed(2)}%`
}
function productLabel(product: any) { return [product.name, product.spec, product.code].filter(Boolean).join(' / ') }
function employeeLabel(employee: any) {
  const suffix = [employee.department, employee.position].filter(Boolean).join(' / ')
  return `${employee.name}${suffix ? `（${suffix}）` : ''}${employee.is_current_user ? '（当前用户）' : ''}`
}
function currentStageText(row: any) {
  const status = Number(row.status)
  if (status === 0) return '待开工'
  if (status === 4) return '产品入库'
  if (status === 2) return '已入库'
  if (status === 3) return '已取消'
  if (!Number(row.total_stage_count || 0)) return '待添加步骤'
  return row.current_stage_name || '加工完成'
}
function statusText(status: any) {
  return ({ 0: '待开工', 1: '加工中', 2: '已入库', 3: '已取消', 4: '待入库' } as Record<number, string>)[Number(status)] || '未知'
}
function statusType(status: any) {
  return ({ 0: 'info', 1: 'warning', 2: 'success', 3: 'danger', 4: 'primary' } as Record<number, any>)[Number(status)] || 'info'
}
function stageName(key: string) {
  return ({ raw_package: '原包货', screening: '过筛', color_sorting: '色选', general_sorting: '普选', fine_sorting: '精选' } as Record<string, string>)[key] || key
}
function sumStages(key: string) { return (detailData.stages || []).reduce((sum: number, stage: any) => sum + Number(stage[key] || 0), 0) }
function formatQuantity(value: any) {
  const quantity = Number(value || 0)
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)))
}
function formatMoney(value: any) { return `¥${Number(value || 0).toFixed(2)}` }
function formatDateTime(value: any) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
function listOf(res: any) { return res.data?.list || res.data || [] }

onMounted(async () => {
  const [productRes, warehouseRes, supplierRes, employeeRes]: any[] = await Promise.all([
    getProducts({ page: 1, pageSize: 1000, status: 1 }),
    getWarehouses({ page: 1, pageSize: 1000, status: 1 }),
    getSuppliers({ page: 1, pageSize: 1000, status: 1 }),
    getAllEmployees()
  ])
  products.value = listOf(productRes)
  warehouses.value = listOf(warehouseRes)
  suppliers.value = listOf(supplierRes)
  employees.value = listOf(employeeRes)
  fetchData()
})
</script>

<style scoped>
.processing-page { height: 100%; }
.toolbar { margin-bottom: 16px; }
.processing-page :deep(.el-select),
.processing-page :deep(.el-input-number),
.processing-page :deep(.el-date-editor) { width: 100%; }
.detail-body { min-height: 420px; }
.batch-summary {
  display: grid;
  grid-template-columns: 1.2fr 1.3fr 1fr 1fr 100px;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: 18px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #f7f8fa;
}
.summary-label { margin-bottom: 6px; color: #909399; font-size: 12px; }
.summary-value { color: #303133; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stage-steps { margin: 8px 0 24px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.section-heading { margin: 0 0 10px; color: #303133; font-size: 15px; font-weight: 600; }
.section-header .section-heading { margin-bottom: 0; }
.inbound-heading { margin-top: 28px; }
.detail-footer {
  position: sticky;
  bottom: 0;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  margin-top: 12px;
  border-top: 1px solid #ebeef5;
  background: #fff;
}
.totals { display: flex; flex-wrap: wrap; gap: 20px; color: #606266; }
.balance-error { color: #f56c6c; font-weight: 600; }
.skip-tag { display: block; width: fit-content; margin-top: 4px; }
@media (max-width: 1200px) {
  .batch-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>

