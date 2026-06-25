<template>
  <view class="unit-page" @touchmove.stop.prevent="() => {}">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="20" color="#999"></uni-icons>
        <input class="search-input" v-model="keyword" placeholder="搜索单位名称" type="text" @confirm="onSearch" />
      </view>
      <view class="search-btn" @click="onSearch">搜索</view>
    </view>

    <!-- 单位列表 -->
    <scroll-view class="list-scroll" scroll-y>
      <view class="scroll-inner">
        <view v-if="listItems.length > 0" class="unit-list">
          <view class="unit-card" v-for="item in listItems" :key="item.id">
            <view class="card-left">
              <uni-icons type="circle" size="18" color="#1890FF"></uni-icons>
              <view class="name-box">
                <text class="unit-name">{{ item.name }}</text>
                <text v-if="Number(item.is_default) === 1" class="default-tag">默认</text>
              </view>
            </view>
            <view class="card-right">
              <view class="action-icons">
                <view class="icon-btn edit" @click.stop="handleEdit(item)">
                  <uni-icons type="compose" size="16" color="#1890FF"></uni-icons>
                </view>
                <view class="icon-btn delete" @click.stop="handleDelete(item)">
                  <uni-icons type="trash" size="16" color="#F56C6C"></uni-icons>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <uni-icons type="box" size="60" color="#DCDFE6"></uni-icons>
          <text class="empty-text">暂无单位数据</text>
        </view>

        <view v-if="loading" class="loading-more">
          <uni-load-more status="loading"></uni-load-more>
        </view>
      </view>
    </scroll-view>

    <!-- 底部固定操作栏 -->
    <view class="bottom-bar">
      <view class="add-btn" @click="handleAdd">
        <uni-icons type="plus-filled" size="24" color="#FFFFFF"></uni-icons>
        <text class="add-text">新增单位</text>
      </view>
    </view>

    <!-- 新增/编辑弹窗 -->
    <view v-if="renderDialog" class="dialog-overlay" :class="{ show: showDialog }" @click="closeDialog">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">{{ dialogTitle }}</text>
          <text class="dialog-close" @click="closeDialog">×</text>
        </view>
        <view class="dialog-body">
          <view class="form-group">
            <view class="form-item">
              <text class="form-label required">单位名称</text>
              <input class="form-input" v-model="form.name" placeholder="请输入单位名称" />
            </view>
            <view class="form-item switch-item">
              <text class="form-label">默认单位</text>
              <switch :checked="form.is_default === 1" @change="onDefaultChange" color="#1890FF" />
            </view>
          </view>
        </view>
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
import { unitApi } from '@/api/unit'

const keyword = ref('')
const loading = ref(false)
const listItems = ref([])

// Dialog States
const renderDialog = ref(false)
const showDialog = ref(false)
const dialogTitle = ref('新增单位')
const editId = ref(null)

const form = reactive({
  name: '',
  is_default: 0
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await unitApi.getList({ keyword: keyword.value.trim() })
    if (res.code === 0) {
      listItems.value = res.data || []
    }
  } catch (e) {
    uni.showToast({ title: '加载数据失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  fetchData()
}

const handleAdd = () => {
  editId.value = null
  dialogTitle.value = '新增单位'
  resetForm()
  renderDialog.value = true
  setTimeout(() => {
    showDialog.value = true
  }, 30)
}

const handleEdit = (item) => {
  editId.value = item.id
  dialogTitle.value = '编辑单位'
  form.name = item.name
  form.is_default = Number(item.is_default || 0)
  renderDialog.value = true
  setTimeout(() => {
    showDialog.value = true
  }, 30)
}

const handleDelete = (item) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除单位「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const deleteRes = await unitApi.delete(item.id)
          if (deleteRes.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' })
            fetchData()
          }
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

const onDefaultChange = (e) => {
  form.is_default = e.detail.value ? 1 : 0
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
  form.is_default = 0
}

const handleSubmit = async () => {
  if (!form.name || form.name.trim() === '') {
    uni.showToast({ title: '请输入单位名称', icon: 'none' })
    return
  }
  
  const payload = {
    name: form.name.trim(),
    is_default: Number(form.is_default || 0)
  }
  
  try {
    let res
    if (editId.value) {
      res = await unitApi.update(editId.value, payload)
    } else {
      res = await unitApi.create(payload)
    }
    
    if (res.code === 0) {
      uni.showToast({ title: editId.value ? '更新成功' : '创建成功', icon: 'success' })
      closeDialog()
      fetchData()
    }
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
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
.unit-page {
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

.unit-list {
  padding-bottom: 20rpx;
}

/* 单位卡片 */
.unit-card {
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
  gap: 12rpx;
  flex: 1;
  overflow: hidden;
}

.name-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  overflow: hidden;
}

.unit-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.default-tag {
  font-size: 20rpx;
  color: #67C23A;
  background: #E8F5E9;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.card-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
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
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
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
  padding: 24rpx 36rpx 40rpx;
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
