<template>
  <view class="category-page" @touchmove.stop.prevent="() => {}">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="20" color="#999"></u-icon>
        <input class="search-input" v-model="keyword" placeholder="搜索分类名称" type="text" @confirm="onSearch" />
      </view>
      <view class="search-btn" @click="onSearch">搜索</view>
    </view>

    <!-- 分类树/列表 -->
    <scroll-view class="list-scroll" scroll-y>
      <view class="scroll-inner">
        <view v-if="listItems.length > 0" class="category-list">
          <view 
            class="category-card" 
            v-for="item in listItems" 
            :key="item.id"
            :style="{ marginLeft: (item.depth * 28) + 'rpx' }"
            :class="{ 'child-card': item.depth > 0 }"
          >
            <view class="card-left">
              <u-icon v-if="item.depth > 0" type="forward" size="12" color="#C0C4CC" class="depth-arrow"></u-icon>
              <u-icon :type="item.depth > 0 ? 'folder' : 'folder-filled'" size="18" :color="item.depth > 0 ? '#909399' : '#1890FF'"></u-icon>
              <view class="name-box">
                <text class="cat-name" :class="{ 'child-name': item.depth > 0 }">{{ item.name }}</text>
                <text v-if="keyword.trim() !== '' && item.parent_id" class="parent-tip">
                  上级: {{ getParentName(item.parent_id) }}
                </text>
              </view>
            </view>
            <view class="card-right">
              <text class="sort-badge">排序: {{ item.sort_order || 0 }}</text>
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

        <view v-else-if="!loading" class="empty-state">
          <u-icon name="grid" size="60" color="#DCDFE6"></u-icon>
          <text class="empty-text">暂无分类数据</text>
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
        <text class="add-text">新增分类</text>
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
              <text class="form-label required">分类名称</text>
              <input class="form-input" v-model="form.name" placeholder="请输入分类名称" />
            </view>
            <view class="form-item">
              <text class="form-label">上级分类</text>
              <picker class="form-picker" @change="onParentChange" :value="parentIndex" :range="parentOptions" range-key="name">
                <view class="picker-inner">
                  <text class="picker-value" :class="{ placeholder: parentIndex === -1 }">
                    {{ parentOptions[parentIndex]?.name || '无上级（作为根分类）' }}
                  </text>
                  <u-icon name="arrow-down" size="14" color="#909399"></u-icon>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">排序值</text>
              <input class="form-input" type="number" v-model="form.sort_order" placeholder="越小越靠前" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { categoryApi } from '@/api/category'

const keyword = ref('')
const loading = ref(false)
const listItems = ref([])      // Categories to render (flat search results or flattened tree)
const categories = ref([])     // Global flat list of categories

// Dialog States
const renderDialog = ref(false)
const showDialog = ref(false)
const dialogTitle = ref('新增分类')
const editId = ref(null)

const form = reactive({
  parent_id: 0,
  name: '',
  sort_order: 0
})

const parentIndex = ref(-1)

// Prevent recursion loop when choosing parent: a category cannot set itself or its descendants as its parent
const isDescendantOf = (catId, targetId) => {
  if (!catId || !targetId) return false
  if (catId === targetId) return true
  const cat = categories.value.find(c => c.id === catId)
  if (!cat || !cat.parent_id) return false
  return isDescendantOf(cat.parent_id, targetId)
}

const parentOptions = computed(() => {
  if (!editId.value) return categories.value
  return categories.value.filter(c => !isDescendantOf(c.id, editId.value))
})

const flattenTree = (nodes, depth = 0) => {
  let result = []
  for (const node of nodes) {
    result.push({ ...node, depth })
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1))
    }
  }
  return result
}

const getParentName = (parentId) => {
  if (!parentId) return ''
  const parent = categories.value.find(c => c.id === parentId)
  return parent ? parent.name : ''
}

const fetchData = async () => {
  loading.value = true
  try {
    // 1. Fetch flat category list for lookup & options
    const flatRes = await categoryApi.getList()
    if (flatRes.code === 0) {
      categories.value = flatRes.data || []
    }
    
    // 2. Fetch list items to render
    if (keyword.value.trim() !== '') {
      const res = await categoryApi.getList({ keyword: keyword.value.trim() })
      if (res.code === 0) {
        listItems.value = (res.data || []).map(item => ({ ...item, depth: 0 }))
      }
    } else {
      const treeRes = await categoryApi.getTree()
      if (treeRes.code === 0) {
        listItems.value = flattenTree(treeRes.data || [])
      }
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
  dialogTitle.value = '新增分类'
  resetForm()
  renderDialog.value = true
  setTimeout(() => {
    showDialog.value = true
  }, 30)
}

const handleEdit = (item) => {
  editId.value = item.id
  dialogTitle.value = '编辑分类'
  form.name = item.name
  form.parent_id = item.parent_id || 0
  form.sort_order = item.sort_order || 0
  
  // Find index in parentOptions synchronously
  const options = categories.value.filter(c => !isDescendantOf(c.id, item.id))
  parentIndex.value = options.findIndex(o => o.id === form.parent_id)
  
  renderDialog.value = true
  setTimeout(() => {
    showDialog.value = true
  }, 30)
}

const handleDelete = (item) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除分类「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const deleteRes = await categoryApi.delete(item.id)
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

const onParentChange = (e) => {
  parentIndex.value = e.detail.value
  form.parent_id = parentOptions.value[parentIndex.value]?.id || 0
}

const closeDialog = () => {
  showDialog.value = false
  setTimeout(() => {
    renderDialog.value = false
    resetForm()
  }, 280)
}

const resetForm = () => {
  form.parent_id = 0
  form.name = ''
  form.sort_order = 0
  parentIndex.value = -1
}

const handleSubmit = async () => {
  if (!form.name || form.name.trim() === '') {
    uni.showToast({ title: '请输入分类名称', icon: 'none' })
    return
  }
  
  const payload = {
    name: form.name.trim(),
    parent_id: Number(form.parent_id || 0),
    sort_order: Number(form.sort_order || 0)
  }
  
  try {
    let res
    if (editId.value) {
      res = await categoryApi.update(editId.value, payload)
    } else {
      res = await categoryApi.create(payload)
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
.category-page {
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

.category-list {
  padding-bottom: 20rpx;
}

/* 分类卡片 */
.category-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  padding: 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
  box-sizing: border-box;

  &.child-card {
    border-left: 4rpx solid #E4E7ED;
    background: #FCFDFE;
  }
}

.card-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  overflow: hidden;
}

.depth-arrow {
  margin-right: -4rpx;
}

.name-box {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cat-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;

  &.child-name {
    font-weight: 500;
    color: #606266;
  }
}

.parent-tip {
  font-size: 20rpx;
  color: #909399;
  margin-top: 4rpx;
}

.card-right {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex-shrink: 0;
}

.sort-badge {
  font-size: 22rpx;
  color: #909399;
  background: #F4F4F5;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
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
  font-size: 28rpx;
  color: #303133;

  &.placeholder {
    color: #C0C4CC;
  }
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
