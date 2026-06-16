<template>
  <view v-if="show" class="popup-overlay" @click="close">
    <view class="popup-sheet" @click.stop>
      <!-- 头部 -->
      <view class="sheet-header">
        <text class="sheet-title">选择时间范围</text>
        <view class="close-btn" @click="close">
          <uni-icons type="closeempty" size="20" color="#999"></uni-icons>
        </view>
      </view>

      <view class="sheet-body">
        <!-- 快捷选择按钮组 -->
        <view class="radio-section">
          <view class="radio-row">
            <view
              v-for="item in presetsRow1"
              :key="item.value"
              class="radio-btn"
              :class="{ active: selectedPreset === item.value }"
              @click="selectPreset(item.value, item.label)"
            >{{ item.label }}</view>
          </view>
          <view class="radio-row">
            <view
              v-for="item in presetsRow2"
              :key="item.value"
              class="radio-btn"
              :class="{ active: selectedPreset === item.value }"
              @click="selectPreset(item.value, item.label)"
            >{{ item.label }}</view>
          </view>
          <view class="radio-row">
            <view
              v-for="item in presetsRow3"
              :key="item.value"
              class="radio-btn"
              :class="{ active: selectedPreset === item.value }"
              @click="selectPreset(item.value, item.label)"
            >{{ item.label }}</view>
          </view>
        </view>

        <!-- 自定义时间 -->
        <view class="custom-time">
          <view class="time-row">
            <text class="time-label">开始时间</text>
            <view class="picker-wrap">
              <picker
                mode="date"
                :value="startDate"
                :end="endDate || today"
                @change="onStartDateChange"
              >
                <view class="picker-box">{{ startDate || '选择日期' }}</view>
              </picker>
              <picker
                mode="time"
                :value="startTime"
                @change="onStartTimeChange"
              >
                <view class="picker-box">{{ startTime || '00:00' }}</view>
              </picker>
            </view>
          </view>
          <view class="time-row">
            <text class="time-label">结束时间</text>
            <view class="picker-wrap">
              <picker
                mode="date"
                :value="endDate"
                :start="startDate"
                :end="today"
                @change="onEndDateChange"
              >
                <view class="picker-box">{{ endDate || '选择日期' }}</view>
              </picker>
              <picker
                mode="time"
                :value="endTime"
                @change="onEndTimeChange"
              >
                <view class="picker-box">{{ endTime || '23:59' }}</view>
              </picker>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部查询按钮 -->
      <view class="sheet-footer">
        <view class="query-btn" @click="handleQuery">查 询</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show', 'query'])

// 快捷预设
const presetsRow1 = [
  { label: '近3天', value: '3days' },
  { label: '近7天', value: '7days' },
  { label: '近15天', value: '15days' },
  { label: '近30天', value: '30days' }
]
const presetsRow2 = [
  { label: '近半年', value: '180days' },
  { label: '近1年', value: '365days' }
]
const presetsRow3 = [
  { label: '当月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
  { label: '今年', value: 'thisYear' },
  { label: '去年', value: 'lastYear' }
]

const selectedPreset = ref('30days')
const startDate = ref('')
const startTime = ref('')
const endDate = ref('')
const endTime = ref('')

// 今天日期 YYYY-MM-DD
const today = getDateString(new Date())

function getDateString(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 根据预设计算起止时间
function calcPresetDate(value) {
  const now = new Date()
  const end = getDateString(now)
  let start = end

  switch (value) {
    case '3days': {
      const d = new Date(now.getTime() - 2 * 24 * 3600 * 1000)
      start = getDateString(d)
      break
    }
    case '7days': {
      const d = new Date(now.getTime() - 6 * 24 * 3600 * 1000)
      start = getDateString(d)
      break
    }
    case '15days': {
      const d = new Date(now.getTime() - 14 * 24 * 3600 * 1000)
      start = getDateString(d)
      break
    }
    case '30days': {
      const d = new Date(now.getTime() - 29 * 24 * 3600 * 1000)
      start = getDateString(d)
      break
    }
    case '180days': {
      const d = new Date(now.getTime() - 179 * 24 * 3600 * 1000)
      start = getDateString(d)
      break
    }
    case '365days': {
      const d = new Date(now.getTime() - 364 * 24 * 3600 * 1000)
      start = getDateString(d)
      break
    }
    case 'thisMonth': {
      start = getDateString(new Date(now.getFullYear(), now.getMonth(), 1))
      break
    }
    case 'lastMonth': {
      const sd = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      start = getDateString(sd)
      const ed = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start, end: getDateString(ed) }
    }
    case 'thisYear': {
      start = getDateString(new Date(now.getFullYear(), 0, 1))
      break
    }
    case 'lastYear': {
      const sd = new Date(now.getFullYear() - 1, 0, 1)
      start = getDateString(sd)
      const ed = new Date(now.getFullYear() - 1, 11, 31)
      return { start, end: getDateString(ed) }
    }
  }
  return { start, end }
}

function selectPreset(value, label) {
  selectedPreset.value = value
  const { start, end: calcEnd } = calcPresetDate(value)
  startDate.value = start
  startTime.value = '00:00'
  endDate.value = calcEnd
  endTime.value = '23:59'
}

// 手动修改日期时间时清除预设
function clearPreset() {
  selectedPreset.value = ''
}

function onStartDateChange(e) {
  startDate.value = e.detail.value
  clearPreset()
}

function onStartTimeChange(e) {
  startTime.value = e.detail.value
  clearPreset()
}

function onEndDateChange(e) {
  endDate.value = e.detail.value
  clearPreset()
}

function onEndTimeChange(e) {
  endTime.value = e.detail.value
  clearPreset()
}

function close() {
  emit('update:show', false)
}

function handleQuery() {
  const labelMap = {}
  ;[...presetsRow1, ...presetsRow2, ...presetsRow3].forEach(p => {
    labelMap[p.value] = p.label
  })

  const result = {
    preset: selectedPreset.value,
    presetLabel: labelMap[selectedPreset.value] || '自定义',
    startDate: startDate.value,
    startTime: startTime.value,
    endDate: endDate.value,
    endTime: endTime.value
  }

  emit('query', result)
  close()
}

// 弹出时初始化默认值
watch(() => props.show, (val) => {
  if (val && !startDate.value) {
    selectPreset('30days', '近30天')
  }
})
</script>

<style lang="scss" scoped>
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
  max-height: 85vh;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.sheet-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 28rpx 30rpx 0;
  position: relative;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #303133;
}

.close-btn {
  position: absolute;
  right: 30rpx;
  top: 28rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-body {
  flex: 1;
  padding: 24rpx 30rpx 0;
  overflow-y: auto;
}

/* 单选按钮组 */
.radio-section {
  margin-bottom: 28rpx;
}

.radio-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 16rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.radio-btn {
  padding: 12rpx 24rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #606266;
  background: #F5F7FA;
  border: 2rpx solid transparent;
  transition: all 0.2s;

  &.active {
    color: #409EFF;
    background: #ECF5FF;
    border-color: #409EFF;
    font-weight: 600;
  }
}

/* 自定义时间 */
.custom-time {
  margin-top: 8rpx;
}

.time-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.time-label {
  font-size: 28rpx;
  color: #303133;
  font-weight: 500;
  width: 140rpx;
  flex-shrink: 0;
}

.picker-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.picker-box {
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F7FA;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #303133;
  text-align: center;
}

/* 查询按钮 */
.sheet-footer {
  padding: 24rpx 30rpx 20rpx;
}

.query-btn {
  width: 100%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #409EFF, #66B1FF);
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 8rpx;

  &:active {
    opacity: 0.85;
  }
}
</style>
