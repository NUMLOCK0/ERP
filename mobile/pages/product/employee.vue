<template>
  <view class="employee-page" @touchmove.stop.prevent="() => {}">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999"></u-icon>
        <input class="search-input" v-model="keyword" placeholder="搜索姓名/账号/电话" type="text" @confirm="onSearch" />
      </view>
      <view class="search-btn" @click="onSearch">搜索</view>
    </view>

    <!-- 职员列表 -->
    <scroll-view class="list-scroll" scroll-y>
      <view class="scroll-inner">
        <view v-if="listItems.length > 0" class="employee-list">
          <view class="employee-card" v-for="item in listItems" :key="item.id">
            <view class="card-left">
              <view class="avatar-box">
                <text class="avatar-text">{{ item.name ? item.name.charAt(0) : '职' }}</text>
              </view>
              <view class="info-box">
                <view class="name-row">
                  <text class="emp-name">{{ item.name }}</text>
                  <text v-if="item.department || item.position" class="dept-tag">
                    {{ [item.department, item.position].filter(Boolean).join(' - ') }}
                  </text>
                </view>
                <view class="details-row">
                  <text class="details-text">账号: {{ item.username || '未关联' }}</text>
                  <text v-if="item.phone" class="details-text">电话: {{ item.phone }}</text>
                </view>
              </view>
            </view>
            <view class="card-right">
              <view class="status-and-actions">
                <text class="status-badge" :class="Number(item.status) === 1 ? 'active' : 'inactive'">
                  {{ Number(item.status) === 1 ? '启用' : '禁用' }}
                </text>
                <view class="action-icons">
                  <view class="icon-btn edit" @click.stop="handleEdit(item)">
                    <u-icon name="edit-pen" size="16" color="#1890FF"></u-icon>
                  </view>
                  <view class="icon-btn delete" @click.stop="handleDelete(item)">
                    <u-icon name="trash" size="16" color="#F56C6C"></u-icon>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <u-icon name="grid" size="60" color="#DCDFE6"></u-icon>
          <text class="empty-text">暂无职员数据</text>
        </view>

        <view v-if="loading" class="loading-more">
          <uni-load-more status="loading"></uni-load-more>
        </view>
      </view>
    </scroll-view>

    <!-- 底部固定操作栏 -->
    <view class="bottom-bar">
      <view class="add-btn" @click="handleAdd">
        <u-icon name="plus-circle-fill" size="24" color="#FFFFFF"></u-icon>
        <text class="add-text">新增职员</text>
      </view>
    </view>

    <!-- 新增/编辑弹窗 -->
    <view v-if="renderDialog" class="dialog-overlay" :class="{ show: showDialog }" @click="closeDialog">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">{{ dialogTitle }}</text>
          <text class="dialog-close" @click="closeDialog">×</text>
        </view>
        <scroll-view class="dialog-body-scroll" scroll-y>
          <view class="dialog-body">
            <view class="form-group">
              <view class="form-item">
                <text class="form-label required">姓名</text>
                <input class="form-input" v-model="form.name" placeholder="请输入职员姓名" />
              </view>
              <view class="form-item">
                <text class="form-label">联系电话</text>
                <input class="form-input" v-model="form.phone" placeholder="请输入手机号码" />
              </view>
              <view class="form-item">
                <text class="form-label">所属部门</text>
                <input class="form-input" v-model="form.department" placeholder="如：财务部 / 销售部" />
              </view>
              <view class="form-item">
                <text class="form-label">担任职务</text>
                <input class="form-input" v-model="form.position" placeholder="如：经理 / 专员" />
              </view>
              <view class="form-item">
                <text class="form-label required">登录账号</text>
                <input class="form-input" v-model="form.username" placeholder="请输入系统登录账号" />
              </view>
              <view class="form-item">
                <text class="form-label" :class="{ required: !editId }">登录密码</text>
                <input class="form-input" type="password" v-model="form.password" :placeholder="editId ? '留空表示不修改密码' : '请输入至少6位密码'" />
              </view>
              <view class="form-item switch-item">
                <text class="form-label">启用状态</text>
                <switch :checked="form.status === 1" @change="onStatusChange" color="#1890FF" />
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="dialog-footer">
          <view class="footer-btn cancel" @click="closeDialog">取消</view>
          <view class="footer-btn confirm" @click="handleSubmit">确认</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { employeeApi } from '@/api/employee'

const keyword = ref('')
const loading = ref(false)
const listItems = ref([])

// Dialog States
const renderDialog = ref(false)
const showDialog = ref(false)
const dialogTitle = ref('新增职员')
const editId = ref(null)

const form = reactive({
  name: '',
  phone: '',
  department: '',
  position: '',
  username: '',
  password: '',
  status: 1
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await employeeApi.getList({
      page: 1,
      pageSize: 1000,
      keyword: keyword.value.trim()
    })
    if (res.code === 0) {
      listItems.value = res.data?.list || res.data || []
    }
  } catch (e) {
    // API will toast error message on rejection automatically
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  fetchData()
}

const handleAdd = () => {
  editId.value = null
  dialogTitle.value = '新增职员'
  resetForm()
  renderDialog.value = true
  setTimeout(() => {
    showDialog.value = true
  }, 30)
}

const handleEdit = (item) => {
  editId.value = item.id
  dialogTitle.value = '编辑职员'
  form.name = item.name || ''
  form.phone = item.phone || ''
  form.department = item.department || ''
  form.position = item.position || ''
  form.username = item.username || ''
  form.password = ''
  form.status = Number(item.status ?? 1)
  
  renderDialog.value = true
  setTimeout(() => {
    showDialog.value = true
  }, 30)
}

const handleDelete = (item) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除职员「${item.name}」及其关联账号吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const deleteRes = await employeeApi.delete(item.id)
          if (deleteRes.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' })
            fetchData()
          }
        } catch (e) {
          // Toast managed by interceptor
        }
      }
    }
  })
}

const onStatusChange = (e) => {
  form.status = e.detail.value ? 1 : 0
}

const closeDialog = () => {
  showDialog.value = false
  setTimeout(() => {
    renderDialog.value = false
    resetForm()
  }, 280)
}

const resetForm = () => {
  form.name = ''
  form.phone = ''
  form.department = ''
  form.position = ''
  form.username = ''
  form.password = ''
  form.status = 1
}

const handleSubmit = async () => {
  if (!form.name || form.name.trim() === '') {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }
  if (!form.username || form.username.trim() === '') {
    uni.showToast({ title: '请输入登录账号', icon: 'none' })
    return
  }
  
  if (!editId.value) {
    if (!form.password || form.password.length < 6) {
      uni.showToast({ title: '密码不能少于6位', icon: 'none' })
      return
    }
  } else {
    if (form.password && form.password.length < 6) {
      uni.showToast({ title: '修改密码不能少于6位', icon: 'none' })
      return
    }
  }
  
  const payload = {
    name: form.name.trim(),
    phone: form.phone.trim(),
    department: form.department.trim(),
    position: form.position.trim(),
    username: form.username.trim(),
    status: Number(form.status ?? 1)
  }
  
  if (form.password) {
    payload.password = form.password
  }
  
  try {
    let res
    if (editId.value) {
      res = await employeeApi.update(editId.value, payload)
    } else {
      res = await employeeApi.create(payload)
    }
    
    if (res.code === 0) {
      uni.showToast({ title: editId.value ? '更新成功' : '创建成功', icon: 'success' })
      closeDialog()
      fetchData()
    }
  } catch (e) {
    // Interceptor auto toasts on failure
  }
}

onShow(() => {
  uni.hideTabBar()
})

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.employee-page {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
}

/* 搜索栏 */
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

  &:active {
    opacity: 0.85;
  }
}

/* 列表滚动 */
.list-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 16rpx 20rpx;
}

.employee-list {
  padding-bottom: 20rpx;
}

/* 职员卡片 */
.employee-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  padding: 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  box-sizing: border-box;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
  overflow: hidden;
}

.avatar-box {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #1890FF, #40a9ff);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
}

.info-box {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  overflow: hidden;
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.emp-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
}

.dept-tag {
  font-size: 20rpx;
  color: #1890FF;
  background: #E8F4FF;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  white-space: nowrap;
}

.details-row {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.details-text {
  font-size: 22rpx;
  color: #909399;
}

.card-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.status-and-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.status-badge {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  font-weight: 600;

  &.active {
    color: #67C23A;
    background: #E8F5E9;
  }

  &.inactive {
    color: #F56C6C;
    background: #FEEFEF;
  }
}

.action-icons {
  display: flex;
  gap: 12rpx;
}

.icon-btn {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #F2F6FC;

  &.edit {
    background: #E8F4FF;
  }

  &.delete {
    background: #FEEFEF;
  }

  &:active {
    opacity: 0.75;
  }
}

/* 底部按钮栏 */
.bottom-bar {
  flex-shrink: 0;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10rpx);
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.add-btn {
  width: 100%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: #1890FF;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.3);

  &:active {
    opacity: 0.85;
  }
}

.add-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
}

/* 弹窗遮罩 */
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
  }
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

  .show & {
    transform: translateY(0);
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 36rpx;
  border-bottom: 1rpx solid #F0F0F0;
  flex-shrink: 0;
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
  overflow: hidden;
}

.dialog-body {
  padding: 24rpx 36rpx;
}

/* 弹窗表单 */
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
  width: 160rpx;

  &.required::after {
    content: '*';
    color: #F56C6C;
    margin-left: 4rpx;
  }
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #303133;
  text-align: right;
}

/* 弹窗底部 */
.dialog-footer {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 36rpx calc(24rpx + constant(safe-area-inset-bottom));
  padding: 24rpx 36rpx calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #F0F0F0;
  flex-shrink: 0;
}

.footer-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;

  &.cancel {
    background: #F4F4F5;
    color: #909399;
  }

  &.confirm {
    background: #1890FF;
    color: #FFFFFF;
    box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
  }

  &:active {
    opacity: 0.85;
  }
}

/* 空状态 */
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
</style>
