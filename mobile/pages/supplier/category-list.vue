<template>
  <view class="category-list">
    <!-- 列表 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="scroll-inner">
        <view v-if="list.length > 0">
          <view
            class="category-card"
            v-for="item in list"
            :key="item.id"
          >
            <view class="card-body">
              <view class="card-main">
                <text class="category-name">{{ item.name }}</text>
                <text class="category-desc" v-if="item.description">{{ item.description }}</text>
                <text class="category-desc empty" v-else>暂无描述信息</text>
              </view>
              <view class="card-actions">
                <view class="action-btn edit" @click="openEdit(item)">
                  <u-icon name="edit-pen" size="16" color="#1890FF"></u-icon>
                  <text>编辑</text>
                </view>
                <view class="action-btn delete" @click="handleDelete(item)">
                  <u-icon name="trash" size="16" color="#FF4D4F"></u-icon>
                  <text>删除</text>
                </view>
              </view>
            </view>
            <view class="card-footer" v-if="item.created_at || item.createdAt">
              <text class="footer-time">创建于: {{ formatDate(item.created_at || item.createdAt) }}</text>
            </view>
          </view>
        </view>
        <view v-else-if="!loading" class="empty-state">
          <u-icon name="list" size="60" color="#DCDFE6"></u-icon>
          <text class="empty-text">暂无企业分类</text>
        </view>

        <view v-if="loading" class="loading-more">
          <uni-load-more status="loading"></uni-load-more>
        </view>
      </view>
    </scroll-view>

    <!-- 浮动新增按钮 -->
    <view class="floating-btn" @click="openAdd">
      <u-icon name="plus" size="24" color="#FFFFFF"></u-icon>
    </view>

    <!-- 新增/编辑弹窗 -->
    <view v-if="showPopup" class="popup-overlay" @click="closePopup">
      <view class="popup-sheet" @click.stop>
        <view class="sheet-header">
          <text class="sheet-title">{{ isEdit ? '编辑分类' : '新增分类' }}</text>
          <view class="close-btn" @click="closePopup">
            <u-icon name="close" size="20" color="#999"></u-icon>
          </view>
        </view>

        <view class="sheet-body">
          <view class="form-item">
            <text class="form-label required">分类名称</text>
            <input class="form-input" v-model="form.name" placeholder="请输入分类名称" placeholder-style="color: #909399" maxlength="50" />
          </view>
          <view class="form-item block">
            <text class="form-label">描述信息</text>
            <textarea class="form-textarea" v-model="form.description" placeholder="请输入分类的描述说明(可选)" placeholder-style="color: #909399" :maxlength="200" />
          </view>
        </view>

        <view class="sheet-footer">
          <button class="btn-cancel" @click="closePopup">取消</button>
          <button class="btn-confirm" @click="submitForm">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { supplierApi } from '@/api/supplier'

const list = ref([])
const loading = ref(false)
const refreshing = ref(false)

const showPopup = ref(false)
const isEdit = ref(false)
const editId = ref(null)

const form = reactive({
  name: '',
  description: ''
})

const formatDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

const fetchList = async () => {
  if (loading.value) return
  loading.value = true

  try {
    const res = await supplierApi.getCategories()
    if (res.code === 0) {
      list.value = res.data || []
    }
  } catch (e) {
    // handled
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onRefresh = () => {
  refreshing.value = true
  fetchList()
}

const openAdd = () => {
  isEdit.value = false
  editId.value = null
  form.name = ''
  form.description = ''
  showPopup.value = true
}

const openEdit = (item) => {
  isEdit.value = true
  editId.value = item.id
  form.name = item.name || ''
  form.description = item.description || ''
  showPopup.value = true
}

const closePopup = () => {
  showPopup.value = false
}

const submitForm = async () => {
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入分类名称', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在提交...' })
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim()
    }
    
    let res
    if (isEdit.value) {
      res = await supplierApi.updateCategory(editId.value, payload)
    } else {
      res = await supplierApi.createCategory(payload)
    }

    if (res.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      closePopup()
      fetchList()
    }
  } catch (err) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

const handleDelete = (item) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除分类「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '正在删除...' })
        try {
          const ret = await supplierApi.deleteCategory(item.id)
          if (ret.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' })
            fetchList()
          }
        } catch (e) {
          // handled
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.category-list {
  height: calc(100vh - var(--window-top));
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
}

.list-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 20rpx;
}

.category-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  overflow: hidden;

  .card-body {
    padding: 24rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16rpx;

    .card-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6rpx;
      
      .category-name {
        font-size: 28rpx;
        font-weight: 700;
        color: #303133;
      }
      .category-desc {
        font-size: 24rpx;
        color: #606266;
        
        &.empty {
          color: #C0C4CC;
          font-style: italic;
        }
      }
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 20rpx;
      flex-shrink: 0;

      .action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4rpx;
        font-size: 20rpx;
        font-weight: 600;
        
        &.edit {
          color: #1890FF;
        }
        &.delete {
          color: #FF4D4F;
        }
        
        &:active {
          opacity: 0.7;
        }
      }
    }
  }

  .card-footer {
    padding: 10rpx 24rpx;
    background: #FAFAFA;
    border-top: 1rpx solid #F2F6FC;
    
    .footer-time {
      font-size: 20rpx;
      color: #909399;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 180rpx;

  .empty-text {
    font-size: 26rpx;
    color: #C0C4CC;
    margin-top: 16rpx;
  }
}

.loading-more {
  padding: 20rpx 0;
}

/* 浮动按钮 */
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

  &:active {
    opacity: 0.85;
  }
}

/* 弹出层 */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
  display: flex;
  align-items: flex-end;
}

.popup-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.sheet-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30rpx;
  position: relative;
  border-bottom: 1rpx solid #F2F6FC;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #303133;
}

.close-btn {
  position: absolute;
  right: 30rpx;
  top: 30rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-body {
  padding: 30rpx;
  
  .form-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #F2F6FC;

    &.block {
      flex-direction: column;
      align-items: flex-start;
      border-bottom: none;
      
      .form-label {
        margin-bottom: 16rpx;
      }
    }

    &:last-child {
      border-bottom: none;
    }
    
    .form-label {
      font-size: 26rpx;
      color: #606266;
      font-weight: 500;
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
      text-align: right;
      font-size: 28rpx;
      color: #303133;
    }
    
    .form-textarea {
      background: #F5F7FA;
      border-radius: 12rpx;
      height: 160rpx;
      padding: 20rpx 24rpx;
      font-size: 28rpx;
      color: #303133;
      width: 100%;
      box-sizing: border-box;
      text-align: left;
    }
  }
}

.sheet-footer {
  display: flex;
  gap: 20rpx;
  padding: 0 30rpx 20rpx;
  
  button {
    flex: 1;
    height: 88rpx;
    line-height: 88rpx;
    font-size: 28rpx;
    font-weight: 600;
    border-radius: 44rpx;
    margin: 0;
    
    &::after { border: none; }
    
    &.btn-cancel {
      background: #F4F4F5;
      color: #909399;
    }
    
    &.btn-confirm {
      background: #1890FF;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
    }
  }
}
</style>
