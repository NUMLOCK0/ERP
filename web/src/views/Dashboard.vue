<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background:#e6f7ff;color:#1890ff;"><el-icon :size="28"><Box /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">产品总数</div>
              <div class="stat-value">{{ stats.productCount }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background:#fff7e6;color:#fa8c16;"><el-icon :size="28"><ShoppingCart /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">本月采购额</div>
              <div class="stat-value">¥{{ formatNumber(stats.monthPurchase) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background:#f6ffed;color:#52c41a;"><el-icon :size="28"><Sell /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">本月销售额</div>
              <div class="stat-value">¥{{ formatNumber(stats.monthSale) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background:#fff1f0;color:#f5222d;"><el-icon :size="28"><Warning /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">库存预警数</div>
              <div class="stat-value">{{ stats.alertCount }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top:20px">
      <el-col :span="12">
        <el-card>
          <template #header><span>最近采购订单</span></template>
          <el-table :data="recentPurchase" size="small" style="width:100%">
            <el-table-column prop="order_no" label="订单号" width="180">
              <template #default="{ row }"><CopyableNo :value="row.order_no" /></template>
            </el-table-column>
            <el-table-column prop="supplier_name" label="供应商" />
            <el-table-column prop="total_amount" label="金额" width="100">
              <template #default="{ row }">¥{{ formatNumber(row.total_amount) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="statusType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" width="100" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span>最近销售订单</span></template>
          <el-table :data="recentSale" size="small" style="width:100%">
            <el-table-column prop="order_no" label="订单号" width="180">
              <template #default="{ row }"><CopyableNo :value="row.order_no" /></template>
            </el-table-column>
            <el-table-column prop="customer_name" label="客户" />
            <el-table-column prop="total_amount" label="金额" width="100">
              <template #default="{ row }">¥{{ formatNumber(row.total_amount) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="statusType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" width="100" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row style="margin-top:20px">
      <el-col :span="24">
        <el-card>
          <template #header><span>库存不足预警</span></template>
          <el-table :data="alertStocks" size="small" style="width:100%">
            <el-table-column prop="product_name" label="产品名称" />
            <el-table-column prop="warehouse_name" label="仓库" />
            <el-table-column prop="quantity" label="库存数量" width="100" />
            <el-table-column label="状态" width="100">
              <template #default>
                <el-tag type="danger" size="small">库存不足</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { Box, ShoppingCart, Sell, Warning } from '@element-plus/icons-vue'
import { get } from '@/api/request'

const stats = reactive({
  productCount: 0,
  monthPurchase: 0,
  monthSale: 0,
  alertCount: 0
})

const recentPurchase = ref<any[]>([])
const recentSale = ref<any[]>([])
const alertStocks = ref<any[]>([])

function formatNumber(n: number) {
  return n?.toLocaleString?.('zh-CN') || '0'
}

function statusType(status: string) {
  const map: Record<string, string> = {
    draft: 'info', pending: 'warning', audited: 'success',
    inbounded: '', completed: 'success', cancelled: 'danger',
    delivered: 'success'
  }
  return map[status] || 'info'
}

onMounted(async () => {
  try {
    const res: any = await get('/report/dashboard')
    if (res.data) {
      Object.assign(stats, {
        productCount: res.data.productCount || 0,
        monthPurchase: res.data.monthPurchase || 0,
        monthSale: res.data.monthSale || 0,
        alertCount: res.data.alertCount || 0
      })
      recentPurchase.value = res.data.recentPurchase || []
      recentSale.value = res.data.recentSale || []
      alertStocks.value = res.data.alertStocks || []
    }
  } catch {}
})
</script>

<style scoped>
.stat-cards .stat-card {
  border-radius: 8px;
}
.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-label {
  font-size: 14px;
  color: #909399;
}
.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-top: 4px;
}
</style>
