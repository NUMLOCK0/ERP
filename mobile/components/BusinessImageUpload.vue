<template>
  <view class="business-image-upload">
    <view class="image-upload-header">
      <text class="image-upload-title">{{ title }}</text>
      <text class="image-upload-count">{{ modelValue.length }} / {{ limit }}</text>
    </view>
    <view class="image-upload-grid">
      <view class="image-upload-item" v-for="(url, index) in modelValue" :key="`${url}-${index}`">
        <image :src="url" mode="aspectFill" class="image-upload-img" @click="previewImage(index)" />
        <view v-if="!readonly" class="image-remove-btn" @click.stop="removeImage(index)">
          <u-icon name="close" size="12" color="#FFFFFF" />
        </view>
      </view>
      <view v-if="!readonly && modelValue.length < limit" class="image-upload-add" @click="chooseAndUpload">
        <u-icon name="plus" size="24" color="#909399" />
        <text class="image-upload-text">上传图片</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import http from '@/api/request'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: '单据图片'
  },
  limit: {
    type: Number,
    default: 10
  },
  readonly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const chooseAndUpload = () => {
  const count = props.limit - props.modelValue.length
  if (count <= 0) return
  uni.chooseImage({
    count,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (chooseRes) => {
      uni.showLoading({ title: '上传中...' })
      try {
        const next = [...props.modelValue]
        for (const filePath of chooseRes.tempFilePaths) {
          const res = await http.upload('/upload/file', filePath)
          if (res.code === 0 && res.data?.url) next.push(res.data.url)
        }
        emit('update:modelValue', next.slice(0, props.limit))
        uni.showToast({ title: '上传成功', icon: 'success' })
      } catch (err) {
        uni.showToast({ title: err.message || '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

const removeImage = (index) => {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

const previewImage = (index) => {
  uni.previewImage({
    urls: props.modelValue,
    current: props.modelValue[index]
  })
}
</script>

<style scoped lang="scss">
.business-image-upload {
  padding: 28rpx 0;
  border-bottom: 1rpx solid #F2F6FC;
}

.image-upload-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.image-upload-title {
  font-size: 28rpx;
  color: #606266;
}

.image-upload-count {
  font-size: 24rpx;
  color: #909399;
}

.image-upload-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-upload-item,
.image-upload-add {
  position: relative;
  width: 144rpx;
  height: 144rpx;
  border-radius: 14rpx;
  overflow: hidden;
  background: #F8FAFC;
}

.image-upload-img {
  width: 100%;
  height: 100%;
}

.image-upload-add {
  border: 1rpx dashed #D8DCE6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.image-upload-text {
  font-size: 22rpx;
  color: #909399;
}

.image-remove-btn {
  position: absolute;
  right: 8rpx;
  top: 8rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
