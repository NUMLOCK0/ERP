import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/layout/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页仪表盘' }
      },
      // 基础数据
      {
        path: 'basic/product',
        name: 'Product',
        component: () => import('@/views/basic/Product.vue'),
        meta: { title: '产品管理' }
      },
      {
        path: 'basic/category',
        name: 'Category',
        component: () => import('@/views/basic/Category.vue'),
        meta: { title: '产品分类' }
      },
      {
        path: 'basic/brand',
        name: 'Brand',
        component: () => import('@/views/basic/Brand.vue'),
        meta: { title: '品牌管理' }
      },
      {
        path: 'basic/unit',
        name: 'Unit',
        component: () => import('@/views/basic/Unit.vue'),
        meta: { title: '计量单位' }
      },
      {
        path: 'basic/employee',
        name: 'Employee',
        component: () => import('@/views/basic/Employee.vue'),
        meta: { title: '职员管理' }
      },
      {
        path: 'basic/warehouse',
        name: 'Warehouse',
        component: () => import('@/views/basic/Warehouse.vue'),
        meta: { title: '仓库管理' }
      },
      // 采购管理
      {
        path: 'purchase/order',
        name: 'PurchaseOrder',
        component: () => import('@/views/purchase/Order.vue'),
        meta: { title: '采购订单' }
      },
      {
        path: 'purchase/inbound',
        name: 'PurchaseInbound',
        component: () => import('@/views/purchase/Inbound.vue'),
        meta: { title: '采购入库单' }
      },
      {
        path: 'purchase/return',
        name: 'PurchaseReturn',
        component: () => import('@/views/purchase/Return.vue'),
        meta: { title: '采购退货单' }
      },
      // 销售管理
      {
        path: 'sale/order',
        name: 'SaleOrder',
        component: () => import('@/views/sale/Order.vue'),
        meta: { title: '销售订单' }
      },
      {
        path: 'sale/delivery',
        name: 'SaleDelivery',
        component: () => import('@/views/sale/Delivery.vue'),
        meta: { title: '销售发货单' }
      },
      {
        path: 'sale/return',
        name: 'SaleReturn',
        component: () => import('@/views/sale/Return.vue'),
        meta: { title: '销售退货单' }
      },
      // 库存管理
      {
        path: 'inventory/stock',
        name: 'InventoryStock',
        component: () => import('@/views/inventory/Stock.vue'),
        meta: { title: '库存查询' }
      },
      {
        path: 'inventory/other-inbound',
        name: 'OtherInbound',
        component: () => import('@/views/inventory/OtherInbound.vue'),
        meta: { title: '其他入库' }
      },
      {
        path: 'inventory/other-outbound',
        name: 'OtherOutbound',
        component: () => import('@/views/inventory/OtherOutbound.vue'),
        meta: { title: '其他出库' }
      },
      {
        path: 'inventory/check',
        name: 'InventoryCheck',
        component: () => import('@/views/inventory/Check.vue'),
        meta: { title: '库存盘点' }
      },
      {
        path: 'inventory/transfer',
        name: 'InventoryTransfer',
        component: () => import('@/views/inventory/Transfer.vue'),
        meta: { title: '库存调拨' }
      },
      {
        path: 'inventory/log',
        name: 'InventoryLog',
        component: () => import('@/views/inventory/Log.vue'),
        meta: { title: '库存日志' }
      },
      // 资金账单
      {
        path: 'finance/payment',
        name: 'FinancePayment',
        component: () => import('@/views/finance/Payment.vue'),
        meta: { title: '采购付款单' }
      },
      {
        path: 'finance/receipt',
        name: 'FinanceReceipt',
        component: () => import('@/views/finance/Receipt.vue'),
        meta: { title: '销售收款单' }
      },
      // 数据报表
      {
        path: 'report/product-stock',
        name: 'ProductStockReport',
        component: () => import('@/views/report/ProductStock.vue'),
        meta: { title: '产品库存报表' }
      },
      {
        path: 'report/sale-delivery',
        name: 'SaleDeliveryReport',
        component: () => import('@/views/report/SaleDelivery.vue'),
        meta: { title: '销售发货报表' }
      },
      {
        path: 'report/purchase-inbound',
        name: 'PurchaseInboundReport',
        component: () => import('@/views/report/PurchaseInbound.vue'),
        meta: { title: '采购入库报表' }
      },
      {
        path: 'report/purchase-order',
        name: 'PurchaseOrderReport',
        component: () => import('@/views/report/PurchaseOrder.vue'),
        meta: { title: '采购订单报表' }
      },
      {
        path: 'report/sale-order',
        name: 'SaleOrderReport',
        component: () => import('@/views/report/SaleOrder.vue'),
        meta: { title: '销售订单报表' }
      },
      {
        path: 'report/sale-receipt',
        name: 'SaleReceiptReport',
        component: () => import('@/views/report/SaleReceipt.vue'),
        meta: { title: '销售收款报表' }
      },
      {
        path: 'report/purchase-payment',
        name: 'PurchasePaymentReport',
        component: () => import('@/views/report/PurchasePayment.vue'),
        meta: { title: '采购付款报表' }
      },
      // 客商管理
      {
        path: 'supplier/company',
        name: 'SupplierCompany',
        component: () => import('@/views/supplier/Company.vue'),
        meta: { title: '企业管理' }
      },
      {
        path: 'supplier/category',
        name: 'SupplierCategory',
        component: () => import('@/views/supplier/Category.vue'),
        meta: { title: '企业分类' }
      },
      // 系统配置
      {
        path: 'system/settings',
        name: 'SystemSettings',
        component: () => import('@/views/system/Settings.vue'),
        meta: { title: '系统设置' }
      },
      {
        path: 'system/admin',
        name: 'SystemAdmin',
        component: () => import('@/views/system/Admin.vue'),
        meta: { title: '管理员管理' }
      },
      {
        path: 'system/role',
        name: 'SystemRole',
        component: () => import('@/views/system/Role.vue'),
        meta: { title: '角色管理' }
      },
      {
        path: 'system/print-template',
        name: 'PrintTemplate',
        component: () => import('@/views/system/PrintTemplate.vue'),
        meta: { title: '打印模板' }
      },
      {
        path: 'system/operation-log',
        name: 'OperationLog',
        component: () => import('@/views/system/OperationLog.vue'),
        meta: { title: '操作日志' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.path === '/login') {
    if (token) {
      next('/')
    } else {
      next()
    }
  } else {
    if (!token) {
      next('/login')
    } else {
      next()
    }
  }
})

export default router
