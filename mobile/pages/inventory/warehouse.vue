<template>
  <view class="warehouse-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="20" color="#999" />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索仓库名称/负责人/地址"
          type="text"
          confirm-type="search"
          @confirm="reload"
        />
      </view>
      <view class="search-btn" @click="reload">搜索</view>
    </view>

    <scroll-view class="list-scroll" scroll-y refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scrolltolower="loadMore">
      <view class="scroll-inner">
        <view v-if="listItems.length > 0">
          <view v-for="item in listItems" :key="item.id" class="warehouse-card">
            <view class="card-main">
              <view class="card-left">
                <view class="avatar-box">
                  <uni-icons type="home-filled" size="24" color="#FFFFFF" />
                </view>
                <view class="info-box">
                  <text class="wh-name">{{ item.name }}</text>
                  <text class="details-text" v-if="item.manager || item.phone">
                    负责人：{{ item.manager || '--' }}<text v-if="item.phone" class="phone-text">电话：{{ item.phone }}</text>
                  </text>
                  <text class="details-text address-text" v-if="item.address">地址：{{ item.address }}</text>
                </view>
              </view>
              <text class="status-badge" :class="Number(item.status) === 1 ? 'active' : 'inactive'">
                {{ Number(item.status) === 1 ? '启用' : '禁用' }}
              </text>
            </view>

            <view class="card-footer">
              <view class="action-btn edit" @click.stop="handleEdit(item)">
                <uni-icons type="compose" size="16" color="#1890FF" />
                <text>编辑</text>
              </view>
              <view class="action-btn delete" @click.stop="handleDelete(item)">
                <uni-icons type="trash" size="16" color="#F56C6C" />
                <text>删除</text>
              </view>
            </view>
          </view>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <uni-icons type="box" size="60" color="#DCDFE6" />
          <text class="empty-text">暂无仓库数据</text>
        </view>

        <view v-if="loading" class="loading-more">
          <uni-load-more status="loading" />
        </view>
      </view>
    </scroll-view>

    <view class="floating-btn" @click="handleAdd">
      <uni-icons type="plus" size="24" color="#FFFFFF" />
    </view>

    <view v-if="renderDialog" class="dialog-overlay" :class="{ show: showDialog }" @click="closeDialog">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">{{ dialogTitle }}</text>
          <text class="dialog-close" @click="closeDialog">×</text>
        </view>
        <scroll-view class="dialog-body-scroll" scroll-y>
          <view class="dialog-body">
            <view class="form-item">
              <text class="form-label required">仓库名称</text>
              <input v-model="form.name" class="form-input" placeholder="请输入仓库名称" />
            </view>
            <view class="form-item">
              <text class="form-label">负责人</text>
              <input v-model="form.manager" class="form-input" placeholder="请输入负责人姓名" />
            </view>
            <view class="form-item">
              <text class="form-label">联系电话</text>
              <input v-model="form.phone" class="form-input" placeholder="请输入联系电话" />
            </view>
            <view class="form-item">
              <text class="form-label">仓库地址</text>
              <input v-model="form.address" class="form-input" placeholder="请输入仓库地址" />
            </view>
            <view class="form-item switch-item">
              <text class="form-label">启用状态</text>
              <switch :checked="form.status === 1" @change="onStatusChange" color="#1890FF" />
            </view>
          </view>
        </scroll-view>
        <view class="dialog-footer">
          <view class="footer-btn cancel" @click="closeDialog">取消</view>
          <view class="footer-btn confirm" @click="handleSubmit">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { warehouseApi } from '@/api/warehouse'

const keyword = ref('')
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const listItems = ref([])

const renderDialog = ref(false)
const showDialog = ref(false)
const dialogTitle = ref('新增仓库')
const editId = ref(null)

const form = reactive({
  name: '',
  manager: '',
  phone: '',
  address: '',
  status: 1
})

async function fetchData(reset = false) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await warehouseApi.getList({ keyword: keyword.value.trim(), page: 1, pageSize: 1000 })
    const data = res.data?.list || res.data || []
    listItems.value = data
    noMore.value = true
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function reload() {
  fetchData(true)
}

function onRefresh() {
  refreshing.value = true
  reload()
}

function loadMore() {
  if (!noMore.value && !loading.value) fetchData()
}

function handleAdd() {
  editId.value = null
  dialogTitle.value = '新增仓库'
  resetForm()
  renderDialog.value = true
  setTimeout(() => {
    showDialog.value = true
  }, 20)
}

function handleEdit(item) {
  editId.value = item.id
  dialogTitle.value = '编辑仓库'
  form.name = item.name || ''
  form.manager = item.manager || ''
  form.phone = item.phone || ''
  form.address = item.address || ''
  form.status = Number(item.status ?? 1)
  renderDialog.value = true
  setTimeout(() => {
    showDialog.value = true
  }, 20)
}

function handleDelete(item) {
  uni.showModal({
    title: '删除仓库',
    content: `确认删除仓库「${item.name}」吗？`,
    success: async (res) => {
      if (!res.confirm) return
      await warehouseApi.delete(item.id)
      uni.showToast({ title: '删除成功', icon: 'success' })
      reload()
    }
  })
}

function onStatusChange(e) {
  form.status = e.detail.value ? 1 : 0
}

function closeDialog() {
  showDialog.value = false
  setTimeout(() => {
    renderDialog.value = false
    resetForm()
  }, 220)
}

function resetForm() {
  form.name = ''
  form.manager = ''
  form.phone = ''
  form.address = ''
  form.status = 1
}

async function handleSubmit() {
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入仓库名称', icon: 'none' })
    return
  }

  const payload = {
    name: form.name.trim(),
    manager: form.manager.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    status: Number(form.status ?? 1)
  }

  if (editId.value) {
    await warehouseApi.update(editId.value, payload)
  } else {
    await warehouseApi.create(payload)
  }

  uni.showToast({ title: editId.value ? '更新成功' : '创建成功', icon: 'success' })
  closeDialog()
  reload()
}

onShow(() => {
  uni.hideTabBar()
})

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.warehouse-page {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
}

.search-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #FFFFFF;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.02);
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #F2F4F6;
  border-radius: 12rpx;
  padding: 0 16rpx;
  height: 72rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  margin-left: 10rpx;
}

.search-btn {
  flex-shrink: 0;
  background: #1890FF;
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 600;
  padding: 0 24rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 12rpx;
  white-space: nowrap;
}

.list-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 16rpx 20rpx 20rpx;
}

.warehouse-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

.card-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20rpx 24rpx 16rpx;
}

.card-left {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.avatar-box {
  width: 72rpx;
  height: 72rpx;
  border-radius: 14rpx;
  background: linear-gradient(135deg, #409EFF, #67C23A);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-box {
  flex: 1;
  min-width: 0;
}

.wh-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
}

.details-text {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #909399;
}

.phone-text {
  margin-left: 12rpx;
}

.address-text {
  color: #606266;
}

.status-badge {
  flex-shrink: 0;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  font-weight: 600;
}

.status-badge.active {
  color: #67C23A;
  background: #E8F5E9;
}

.status-badge.inactive {
  color: #F56C6C;
  background: #FEEFEF;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  padding: 12rpx 24rpx 16rpx;
  border-top: 1rpx solid #F2F6FC;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 16rpx;
  border-radius: 10rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.action-btn.edit {
  background: #E8F4FF;
  color: #1890FF;
}

.action-btn.delete {
  background: #FEEFEF;
  color: #F56C6C;
}

.floating-btn {
  position: fixed;
  right: 40rpx;
  bottom: 40rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #1890FF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(24, 144, 255, 0.4);
  z-index: 99;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #C0C4CC;
  margin-top: 16rpx;
}

.loading-more {
  padding: 20rpx 0;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0);
  display: flex;
  align-items: flex-end;
  pointer-events: none;
  visibility: hidden;
  transition: all 0.24s ease-out;
}

.dialog-overlay.show {
  background: rgba(0, 0, 0, 0.4);
  pointer-events: auto;
  visibility: visible;
}

.dialog-content {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 85vh;
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.dialog-overlay.show .dialog-content {
  transform: translateY(0);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 36rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
}

.dialog-close {
  font-size: 44rpx;
  color: #909399;
  line-height: 1;
}

.dialog-body-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.dialog-body {
  padding: 24rpx 36rpx;
}

.form-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F2F6FC;
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  font-size: 28rpx;
  color: #606266;
  width: 160rpx;
  flex-shrink: 0;
}

.form-label.required::after {
  content: '*';
  color: #F56C6C;
  margin-left: 4rpx;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #303133;
  text-align: right;
}

.switch-item {
  justify-content: space-between;
}

.dialog-footer {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 36rpx calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #F0F0F0;
}

.footer-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.footer-btn.cancel {
  background: #F4F4F5;
  color: #909399;
}

.footer-btn.confirm {
  background: #1890FF;
  color: #FFFFFF;
  box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
}
</style>
