<template>
  <view class="member-edit-page">
    <scroll-view class="form-scroll" scroll-y>
      <view class="scroll-inner">
        <!-- 会员等级信息 -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">会员等级信息</text>
          </view>
          <view class="form-group">
            <view class="form-item">
              <text class="form-label required">等级名称</text>
              <input class="form-input" v-model="form.name" placeholder="名称(1-30个字符)" maxlength="30" />
            </view>
            <view class="form-item block">
              <text class="form-label">描述说明</text>
              <textarea class="form-textarea" v-model="form.description" placeholder="等级描述(最多230个字符)" :maxlength="230" />
            </view>
            <view class="form-item">
              <text class="form-label">排序顺序</text>
              <input class="form-input" type="number" v-model="form.sort_order" placeholder="数值越小越靠前" />
            </view>
            <view class="form-item">
              <text class="form-label">是否启用</text>
              <switch :checked="form.status === 1" @change="onStatusChange" color="#1890FF" />
            </view>
          </view>
        </view>

        <!-- 会员等级图标 -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">专属图标</text>
          </view>
          <view class="icon-uploader-container">
            <view class="uploader-box" @click="chooseAndUploadIcon">
              <image v-if="form.icon_url" :src="getAssetUrl(form.icon_url)" mode="aspectFit" class="upload-preview" />
              <view v-else class="upload-placeholder">
                <uni-icons type="plus" size="32" color="#909399"></uni-icons>
                <text class="uploader-text">选择图标</text>
              </view>
            </view>
            <view class="remove-btn-wrap" v-if="form.icon_url" @click="removeIcon">
              <button class="btn-remove">删除图标</button>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view class="bottom-btn outline" @click="goCancel">取消</view>
      <view class="bottom-btn primary" @click="handleSave">保存登记</view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { supplierApi } from '@/api/supplier'
import { useUserStore } from '@/store/user'

const isEdit = ref(false)
const editId = ref(null)

const form = reactive({
  name: '',
  description: '',
  icon_url: '',
  sort_order: 0,
  status: 1
})

const getAssetUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `http://localhost:3000${url}`
}

const onStatusChange = (e) => {
  form.status = e.detail.value ? 1 : 0
}

const loadDetail = async (id) => {
  uni.showLoading({ title: '加载中...' })
  try {
    const res = await supplierApi.getMemberLevelDetail(id)
    if (res.code === 0 && res.data) {
      const data = res.data
      form.name = data.name || ''
      form.description = data.description || ''
      form.icon_url = data.icon_url || ''
      form.sort_order = data.sort_order ?? 0
      form.status = data.status ?? 1
    }
  } catch (err) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

const chooseAndUploadIcon = () => {
  uni.chooseImage({
    count: 1,
    success: (chooseRes) => {
      const filePath = chooseRes.tempFilePaths[0]
      uni.showLoading({ title: '上传中...' })
      const userStore = useUserStore()
      uni.uploadFile({
        url: 'http://localhost:3000/api/upload/file',
        filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${userStore.token}`
        },
        success: (uploadRes) => {
          try {
            const resData = JSON.parse(uploadRes.data)
            if (resData.code === 0) {
              form.icon_url = resData.data.url
              uni.showToast({ title: '上传成功', icon: 'success' })
            } else {
              uni.showToast({ title: resData.message || '上传失败', icon: 'none' })
            }
          } catch (err) {
            uni.showToast({ title: '解析失败', icon: 'none' })
          }
        },
        fail: () => {
          uni.showToast({ title: '上传失败', icon: 'none' })
        },
        complete: () => {
          uni.hideLoading()
        }
      })
    }
  })
}

const removeIcon = () => {
  form.icon_url = ''
}

const handleSave = async () => {
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入登记名称', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在保存...' })
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      icon_url: form.icon_url,
      sort_order: Number(form.sort_order || 0),
      status: Number(form.status)
    }

    let res
    if (isEdit.value) {
      res = await supplierApi.updateMemberLevel(editId.value, payload)
    } else {
      res = await supplierApi.createMemberLevel(payload)
    }

    if (res.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1000)
    }
  } catch (e) {
    // handled
  } finally {
    uni.hideLoading()
  }
}

const goCancel = () => {
  uni.navigateBack()
}

onMounted(() => {
  const pages = getCurrentPages()
  const id = pages[pages.length - 1].$page?.options?.id
  if (id) {
    isEdit.value = true
    editId.value = id
    loadDetail(id)
  }
})
</script>

<style lang="scss" scoped>
.member-edit-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F5F7FA;
  box-sizing: border-box;
}

.form-scroll {
  flex: 1;
  height: 0;
  width: 100%;
}

.scroll-inner {
  padding: 20rpx;
}

.section {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #303133;
}

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
}

.form-label {
  font-size: 28rpx;
  color: #606266;
  flex-shrink: 0;
  width: 180rpx;

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

.icon-uploader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
  gap: 20rpx;
}

.uploader-box {
  width: 160rpx;
  height: 160rpx;
  border-radius: 20rpx;
  border: 2rpx dashed #DCDFE6;
  background: #FAFAFA;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  .upload-preview {
    width: 100%;
    height: 100%;
  }

  .upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    
    .uploader-text {
      font-size: 20rpx;
      color: #909399;
    }
  }
}

.remove-btn-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  
  .btn-remove {
    font-size: 24rpx;
    color: #FF4D4F;
    background: #FFF0F6;
    border: 1rpx solid #FFD6E7;
    height: 60rpx;
    line-height: 60rpx;
    border-radius: 30rpx;
    padding: 0 30rpx;
    
    &::after { border: none; }
  }
}

/* 底部操作栏 */
.bottom-bar {
  flex-shrink: 0;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10rpx);
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 16rpx;
  z-index: 99;
}

.bottom-btn {
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
</style>
