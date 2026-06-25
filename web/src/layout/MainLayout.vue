<template>
  <el-container class="main-layout">
    <el-aside :width="appStore.sidebarCollapsed ? '64px' : '220px'" class="aside">
      <div class="logo">
        <span v-if="!appStore.sidebarCollapsed" class="logo-text">进销存管理系统</span>
        <span v-else class="logo-text-short">进销存</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="appStore.sidebarCollapsed"
        :collapse-transition="false"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
        class="side-menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <template #title>首页仪表盘</template>
        </el-menu-item>

        <el-sub-menu index="basic">
          <template #title>
            <el-icon><Box /></el-icon>
            <span>基础数据</span>
          </template>
          <el-menu-item index="/basic/product">产品管理</el-menu-item>
          <el-menu-item index="/basic/category">产品分类</el-menu-item>
          <el-menu-item index="/basic/brand">品牌管理</el-menu-item>
          <el-menu-item index="/basic/unit">计量单位</el-menu-item>
          <el-menu-item v-if="canManageEmployees" index="/basic/employee">职员管理</el-menu-item>
          <el-menu-item index="/basic/warehouse">仓库管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="purchase">
          <template #title>
            <el-icon><ShoppingCart /></el-icon>
            <span>采购管理</span>
          </template>
          <el-menu-item index="/purchase/order">采购订单</el-menu-item>
          <el-menu-item index="/purchase/inbound">采购入库单</el-menu-item>
          <el-menu-item index="/purchase/return">采购退货单</el-menu-item>
          <el-menu-item index="/purchase/payment">采购付款单</el-menu-item>
          <el-menu-item index="/purchase/invoice">采购发票登记</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="sale">
          <template #title>
            <el-icon><Sell /></el-icon>
            <span>销售管理</span>
          </template>
          <el-menu-item index="/sale/order">销售订单</el-menu-item>
          <el-menu-item index="/sale/delivery">销售发货单</el-menu-item>
          <el-menu-item index="/sale/return">发货退货单</el-menu-item>
          <el-menu-item index="/sale/receipt">销售收款单</el-menu-item>
          <el-menu-item index="/sale/invoice">销售发票登记</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="processing">
          <template #title>
            <el-icon><SetUp /></el-icon>
            <span>加工管理</span>
          </template>
          <el-menu-item index="/processing/order">药材加工批次</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="inventory">
          <template #title>
            <el-icon><Coin /></el-icon>
            <span>库存管理</span>
          </template>
          <el-menu-item index="/inventory/other-inbound">其他入库</el-menu-item>
          <el-menu-item index="/inventory/other-outbound">其他出库</el-menu-item>
          <el-menu-item index="/inventory/check">库存盘点</el-menu-item>
          <el-menu-item index="/inventory/log">库存日志</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="report">
          <template #title>
            <el-icon><TrendCharts /></el-icon>
            <span>数据报表</span>
          </template>
          <el-menu-item index="/report/product-stock">产品库存</el-menu-item>
          <el-menu-item index="/report/purchase-order">采购订单</el-menu-item>
          <el-menu-item index="/report/purchase-inbound">采购入库</el-menu-item>
          <el-menu-item index="/report/purchase-payment">采购付款</el-menu-item>
          <el-menu-item index="/report/other-inbound">其他入库</el-menu-item>
          <el-menu-item index="/report/sale-order">销售订单</el-menu-item>
          <el-menu-item index="/report/sale-delivery">销售发货</el-menu-item>
          <el-menu-item index="/report/sale-receipt">销售收款</el-menu-item>
          <el-menu-item index="/report/other-outbound">其他出库</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="supplier">
          <template #title>
            <el-icon><OfficeBuilding /></el-icon>
            <span>客商管理</span>
          </template>
          <el-menu-item index="/supplier/company">企业管理</el-menu-item>
          <el-menu-item index="/supplier/category">企业分类</el-menu-item>
          <el-menu-item index="/supplier/member-level">会员等级</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="system">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统配置</span>
          </template>
          <el-menu-item index="/system/settings">系统设置</el-menu-item>
          <el-menu-item index="/system/admin">管理员</el-menu-item>
          <el-menu-item index="/system/role">角色</el-menu-item>
          <el-menu-item index="/system/print-template">打印模板</el-menu-item>
          <el-menu-item index="/system/operation-log">操作日志</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="appStore.toggleSidebar" :size="22">
            <Fold v-if="!appStore.sidebarCollapsed" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="activeMeta">{{ activeMeta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click">
            <span class="user-info">
              <el-avatar :size="32" style="background-color: #409EFF;">
                {{ userStore.userInfo?.real_name?.charAt(0) || 'U' }}
              </el-avatar>
              <span class="username">{{ userStore.userInfo?.real_name || '管理员' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DataBoard, Box, ShoppingCart, Sell, Coin,
  TrendCharts, OfficeBuilding, Setting, Fold, Expand, ArrowDown, SetUp
} from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { isSystemAdmin } from '@/utils/systemAdmin'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

const activeMenu = computed(() => String(route.meta.activeMenu || route.path))
const activeMeta = computed(() => route.meta as any)
const canManageEmployees = computed(() => isSystemAdmin(userStore.userInfo))

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
}
.aside {
  background-color: #304156;
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.3s;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.logo-text-short {
  font-size: 14px;
}
.side-menu {
  border-right: none;
}
.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 20px;
  height: 60px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.collapse-btn {
  cursor: pointer;
  color: #666;
}
.collapse-btn:hover {
  color: #409EFF;
}
.header-right {
  display: flex;
  align-items: center;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.username {
  font-size: 14px;
  color: #333;
}
.main-content {
  background: #f0f2f5;
  padding: 20px;
  min-height: calc(100vh - 60px);
}
</style>
