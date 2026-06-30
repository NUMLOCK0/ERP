<template>
  <view class="business-item">
    <view class="item-header">
      <view class="header-main">
        <text v-if="meta" class="item-meta">{{ meta }}</text>
        <text class="item-title">{{ title || '-' }}</text>
        <text v-if="subtitle" class="item-subtitle">{{ subtitle }}</text>
      </view>
      <view class="header-extra">
        <slot name="header-extra">
          <uni-tag v-if="tagText" :text="tagText" size="small" :type="tagType || 'info'" />
        </slot>
      </view>
    </view>

    <view class="item-body" :class="{ expanded }">
      <view v-if="!expanded" class="content-shell summary-shell">
        <slot name="summary" />
      </view>
      <view v-else class="content-shell detail-shell">
        <slot name="detail" />
      </view>
    </view>

    <view v-if="showToggle" class="toggle-btn" @click="$emit('toggle')">
      <text class="toggle-text">{{ expanded ? collapseText : expandText }}</text>
      <u-icon :name="expanded ? 'arrow-up' : 'arrow-down'" size="16" color="#1890FF"  />
    </view>

    <view v-if="$slots.actions" class="item-actions">
      <slot name="actions" />
    </view>

    <view v-if="$slots.footer" class="item-footer">
      <slot name="footer" />
    </view>
  </view>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  meta: {
    type: String,
    default: ''
  },
  tagText: {
    type: String,
    default: ''
  },
  tagType: {
    type: String,
    default: 'info'
  },
  expanded: {
    type: Boolean,
    default: false
  },
  showToggle: {
    type: Boolean,
    default: false
  },
  expandText: {
    type: String,
    default: '展开'
  },
  collapseText: {
    type: String,
    default: '收起'
  }
})

defineEmits(['toggle'])
</script>

<style scoped lang="scss">
.business-item {
  overflow: hidden;
  background: #ffffff;
  border: 1rpx solid #eef2f6;
  border-radius: 16rpx;
  box-shadow: 0 6rpx 20rpx rgba(17, 24, 39, 0.05);
}

.item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding: 20rpx 24rpx 18rpx;
  border-bottom: 1rpx solid #f2f6fc;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.header-main {
  flex: 1;
  min-width: 0;
}

.item-meta {
  display: block;
  font-size: 22rpx;
  line-height: 1.4;
  color: #909399;
}

.item-title {
  display: block;
  margin-top: 8rpx;
  font-size: 30rpx;
  line-height: 1.35;
  font-weight: 700;
  color: #303133;
  word-break: break-all;
}

.item-subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.45;
  color: #606266;
  word-break: break-all;
}

.header-extra {
  flex-shrink: 0;
  padding-top: 2rpx;
}

.item-body {
  padding: 18rpx 24rpx 0;

  &.expanded {
    padding-top: 16rpx;
  }
}

.content-shell {
  border-radius: 12rpx;
}

.summary-shell {
  padding: 16rpx 20rpx;
  background: #f8fafc;
}

.detail-shell {
  padding: 18rpx 20rpx;
  background: #f8fafc;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 18rpx;
  padding: 12rpx 24rpx 14rpx;
}

.toggle-text {
  font-size: 24rpx;
  color: #1890ff;
  font-weight: 600;
}

.item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  padding: 0 24rpx 24rpx;
}

.item-footer {
  padding: 0 24rpx 20rpx;
  color: #909399;
}
</style>
