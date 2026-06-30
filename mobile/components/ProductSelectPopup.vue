<template>
  <view class="product-popup" :class="{ show: show }">
    <!-- 遮罩层 -->
    <view class="popup-mask" @click="close"></view>

    <!-- 弹窗内容 (占屏幕3/4高度) -->
    <view class="popup-content">
      <!-- 头部 -->
      <view class="popup-header">
        <text class="popup-title">选择商品</text>
        <view class="close-btn" @click="close">
          <u-icon name="close" size="18" color="#909399"></u-icon>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view class="search-bar">
        <view class="search-input-wrap">
          <u-icon name="search" size="16" color="#909399" class="search-icon"></u-icon>
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索商品名称/编码/规格"
            confirm-type="search"
            @confirm="resetAndFetch"
          />
          <view v-if="keyword" class="clear-icon" @click="clearKeyword">
            <u-icon name="close-circle-fill" size="16" color="#C0C4CC"></u-icon>
          </view>
        </view>
        <button class="search-btn" @click="resetAndFetch">搜索</button>
      </view>

      <!-- 商品列表滚动区域 -->
      <scroll-view
        class="scroll-area"
        scroll-y
        @scrolltolower="onScrollToLower"
      >
        <view class="product-list" v-if="list.length > 0">
          <view
            v-for="item in list"
            :key="item.id"
            class="product-item"
            @click="toggleSelect(item)"
          >
            <!-- 左侧 Checkbox / 单选圈 -->
            <view class="item-left">
              <view
                class="custom-checkbox"
                :class="{
                  checked: isSelected(item.id),
                  radio: !multiple
                }"
              >
                <text v-if="isSelected(item.id)" class="check-mark">&#10003;</text>
              </view>
            </view>

            <!-- 中间 商品图片 + 信息 -->
            <view class="item-middle">
              <view class="product-img" :style="{ backgroundColor: getImgBg(item.id) }">
                <image v-if="item.image" class="img" :src="item.image" mode="aspectFill" />
                <text v-else class="img-placeholder">{{ getNameInit(item.name) }}</text>
              </view>
              <view class="product-info">
                <text class="prod-name">{{ item.name }}</text>
                <text class="prod-code" v-if="item.code">编码: {{ item.code }}</text>
                <text class="prod-spec" v-if="item.spec">规格: {{ item.spec }}</text>
                <text class="prod-price">¥{{ displayPrice(item) }}</text>
              </view>
            </view>

            <!-- 右侧 数量加减 -->
            <view class="item-right" @click.stop="">
              <view class="qty-counter">
                <view class="counter-btn minus" @click.stop="decreaseQty(item)">-</view>
                <input
                  class="counter-input"
                  type="number"
                  :value="quantities[item.id] || 0"
                  @input="onQtyInput($event, item)"
                  @blur="onQtyBlur($event, item)"
                />
                <view class="counter-btn plus" @click.stop="increaseQty(item)">+</view>
              </view>
            </view>
          </view>

          <!-- 加载更多状态 -->
          <view class="load-more-status">
            <text v-if="loading" class="status-text">加载中...</text>
            <text v-else-if="noMore" class="status-text">没有更多了</text>
          </view>
        </view>

        <!-- 空状态 -->
        <view class="empty-state" v-else-if="!loading">
          <u-icon name="gift" size="48" color="#DCDFE6"></u-icon>
          <text class="empty-text">暂无商品，可点击下方按钮添加</text>
        </view>
      </scroll-view>

      <!-- 底部操作栏 -->
      <view class="popup-footer">
        <!-- 左侧：全选 (仅在多选模式下显示) -->
        <view class="footer-left" v-if="multiple" @click="toggleAllSelect">
          <view class="custom-checkbox" :class="{ checked: isAllSelected }">
            <text v-if="isAllSelected" class="check-mark">&#10003;</text>
          </view>
          <text class="all-select-text">全选</text>
        </view>
        <view class="footer-left-placeholder" v-else></view>

        <!-- 右侧：按钮组 -->
        <view class="footer-right">
          <button class="footer-btn add-btn" @click="goToAddProduct">添加商品</button>
          <button class="footer-btn confirm-btn" @click="onConfirm">
            确认<text v-if="selectedIds.length > 0">({{ selectedIds.length }})</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { productApi } from '@/api/product'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  multiple: {
    type: Boolean,
    default: true
  },
  priceType: {
    type: String,
    default: 'sale_price' // 'sale_price' 或 'cost_price'
  },
  selectedProducts: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:show', 'confirm', 'close'])

// 搜索及分页状态
const keyword = ref('')
const page = ref(1)
const list = ref([])
const loading = ref(false)
const noMore = ref(false)

// 选择状态缓存
const selectedIds = ref([])
const quantities = ref({})

// 监听弹窗打开状态，初始化并拉取数据
watch(() => props.show, (newVal) => {
  if (newVal) {
    initSelected()
    resetAndFetch()
  }
})

// 初始化回显数据
const initSelected = () => {
  selectedIds.value = []
  quantities.value = {}
  if (props.selectedProducts && props.selectedProducts.length) {
    props.selectedProducts.forEach(item => {
      const id = item.product_id || item.id
      if (id) {
        selectedIds.value.push(id)
        quantities.value[id] = item.quantity || item.select_qty || 1
      }
    })
  }
}

// 重置并重新拉取商品列表
const resetAndFetch = () => {
  page.value = 1
  list.value = []
  noMore.value = false
  fetchData()
}

// 清除关键词
const clearKeyword = () => {
  keyword.value = ''
  resetAndFetch()
}

// 异步读取商品数据
const fetchData = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const res = await productApi.getList({
      page: page.value,
      pageSize: 20,
      keyword: keyword.value,
      status: 1 // 仅启用状态的商品
    })
    if (res.code === 0) {
      const data = res.data?.list || res.data || []
      if (page.value === 1) {
        list.value = data
      } else {
        list.value = [...list.value, ...data]
      }
      if (data.length < 20) {
        noMore.value = true
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 滚动到底部触发加载更多
const onScrollToLower = () => {
  if (!noMore.value && !loading.value) {
    page.value++
    fetchData()
  }
}

// 判断商品是否被选中
const isSelected = (id) => {
  return selectedIds.value.includes(id)
}

// 切换选择
const toggleSelect = (item) => {
  const id = item.id
  if (isSelected(id)) {
    const idx = selectedIds.value.indexOf(id)
    selectedIds.value.splice(idx, 1)
    // 扣减状态设为 0
    quantities.value[id] = 0
  } else {
    if (!props.multiple) {
      selectedIds.value = [id]
      quantities.value = { [id]: 1 }
    } else {
      selectedIds.value.push(id)
      if (!quantities.value[id] || quantities.value[id] < 1) {
        quantities.value[id] = 1
      }
    }
  }
}

// 全选 / 取消全选逻辑
const isAllSelected = computed(() => {
  if (!list.value.length) return false
  return list.value.every(item => isSelected(item.id))
})

const toggleAllSelect = () => {
  if (isAllSelected.value) {
    list.value.forEach(item => {
      const idx = selectedIds.value.indexOf(item.id)
      if (idx > -1) {
        selectedIds.value.splice(idx, 1)
      }
      quantities.value[item.id] = 0
    })
  } else {
    list.value.forEach(item => {
      if (!isSelected(item.id)) {
        selectedIds.value.push(item.id)
      }
      if (!quantities.value[item.id] || quantities.value[item.id] < 1) {
        quantities.value[item.id] = 1
      }
    })
  }
}

// 增加数量
const increaseQty = (item) => {
  const id = item.id
  const current = quantities.value[id] || 0
  quantities.value[id] = current + 1
  if (!isSelected(id)) {
    if (!props.multiple) {
      selectedIds.value = [id]
    } else {
      selectedIds.value.push(id)
    }
  }
}

// 减少数量
const decreaseQty = (item) => {
  const id = item.id
  const current = quantities.value[id] || 0
  if (current <= 1) {
    // 数量减为 0 时，自动反选/取消选中该商品
    quantities.value[id] = 0
    const idx = selectedIds.value.indexOf(id)
    if (idx > -1) {
      selectedIds.value.splice(idx, 1)
    }
  } else {
    quantities.value[id] = current - 1
  }
}

// 数量键盘输入
const onQtyInput = (e, item) => {
  let val = parseInt(e.detail.value, 10)
  if (isNaN(val)) val = 0
  quantities.value[item.id] = val
}

const onQtyBlur = (e, item) => {
  let val = parseInt(e.detail.value, 10)
  if (isNaN(val) || val <= 0) {
    val = 0
    const idx = selectedIds.value.indexOf(item.id)
    if (idx > -1) {
      selectedIds.value.splice(idx, 1)
    }
  } else {
    if (!isSelected(item.id)) {
      if (!props.multiple) {
        selectedIds.value = [item.id]
      } else {
        selectedIds.value.push(item.id)
      }
    }
  }
  quantities.value[item.id] = val
}

// 跳转到添加商品
const goToAddProduct = () => {
  uni.navigateTo({
    url: '/pages/product/edit'
  })
}

// 确认选中并保存
const onConfirm = () => {
  const result = selectedIds.value.map(id => {
    // 首先从当前列表里找商品对象
    let product = list.value.find(p => p.id === id)
    // 如果不在当前分页加载的列表中，从初始传入的回显列表里寻找
    if (!product && props.selectedProducts) {
      const original = props.selectedProducts.find(p => (p.product_id || p.id) === id)
      if (original) {
        product = original
      }
    }
    if (!product) return null

    return {
      ...product,
      product_id: product.id || product.product_id,
      product_name: product.name || product.product_name,
      quantity: quantities.value[id] || 1,
      price: product.price ?? (props.priceType === 'cost_price' ? product.cost_price : product.sale_price) ?? 0
    }
  }).filter(Boolean)

  emit('confirm', result)
  close()
}

// 关闭弹窗
const close = () => {
  emit('update:show', false)
  emit('close')
}

// 辅助方法
const displayPrice = (item) => {
  const val = item[props.priceType] ?? item.sale_price ?? item.cost_price ?? 0
  return Number(val).toFixed(2)
}

const getNameInit = (name) => {
  return name ? name.charAt(0) : '品'
}

const getImgBg = (id) => {
  const bgs = ['#EBF5FF', '#F0F9EB', '#FDF6EC', '#FEF0F0']
  return bgs[id % bgs.length]
}
</script>

<style scoped>
.product-popup {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  z-index: 999;
  visibility: hidden;
  transition: visibility 0.3s;
}
.product-popup.show {
  visibility: visible;
}
.popup-mask {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.3s;
}
.product-popup.show .popup-mask {
  opacity: 1;
}
.popup-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 75vh; /* 4分之3屏幕高度 */
  background-color: #ffffff;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}
.product-popup.show .popup-content {
  transform: translateY(0);
}

/* 头部样式 */
.popup-header {
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #f2f6fc;
}
.popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
}
.close-btn {
  padding: 10rpx;
}

/* 搜索栏 */
.search-bar {
  padding: 20rpx 30rpx;
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f2f6fc;
}
.search-input-wrap {
  flex: 1;
  height: 72rpx;
  background-color: #f5f7fa;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  position: relative;
}
.search-icon {
  margin-right: 12rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #303133;
}
.clear-icon {
  position: absolute;
  right: 20rpx;
  padding: 10rpx;
  z-index: 10;
}
.search-btn {
  margin-left: 20rpx;
  width: 120rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #1890ff;
  color: #ffffff;
  font-size: 28rpx;
  border-radius: 36rpx;
  padding: 0;
  border: none;
}
.search-btn::after {
  border: none;
}

/* 滚动商品列表 */
.scroll-area {
  flex: 1;
  overflow: hidden;
  background-color: #f8f9fa;
}
.product-list {
  padding: 20rpx;
}
.product-item {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

/* 复选框样式 */
.item-left {
  padding-right: 20rpx;
}
.custom-checkbox {
  width: 42rpx;
  height: 42rpx;
  border: 3rpx solid #dcdfe6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  background-color: #ffffff;
  box-sizing: border-box;
}
.custom-checkbox.radio {
  border-radius: 50%;
}
.custom-checkbox.checked {
  border-color: #1890ff;
  background-color: #1890ff;
}
.check-mark {
  color: #ffffff;
  font-size: 26rpx;
  font-weight: bold;
}

/* 中间商品信息 */
.item-middle {
  flex: 1;
  display: flex;
  align-items: center;
}
.product-img {
  width: 110rpx;
  height: 110rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  overflow: hidden;
}
.product-img .img {
  width: 100%;
  height: 100%;
}
.img-placeholder {
  font-size: 36rpx;
  font-weight: bold;
  color: #1890ff;
}
.product-info {
  display: flex;
  flex-direction: column;
  max-width: 280rpx;
}
.prod-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #303133;
  line-height: 1.4;
  margin-bottom: 6rpx;
  word-break: break-all;
}
.prod-code,
.prod-spec {
  font-size: 22rpx;
  color: #909399;
  margin-bottom: 4rpx;
}
.prod-price {
  font-size: 28rpx;
  color: #ff4949;
  font-weight: bold;
  margin-top: 4rpx;
}

/* 数量加减 */
.item-right {
  padding-left: 10rpx;
}
.qty-counter {
  display: flex;
  align-items: center;
  background-color: #f5f7fa;
  border-radius: 28rpx;
  height: 56rpx;
  padding: 0 4rpx;
  border: 1rpx solid #e4e7ed;
}
.counter-btn {
  width: 48rpx;
  height: 48rpx;
  line-height: 44rpx;
  text-align: center;
  font-size: 32rpx;
  color: #606266;
  font-weight: bold;
}
.counter-input {
  width: 60rpx;
  height: 48rpx;
  text-align: center;
  font-size: 26rpx;
  color: #303133;
  font-weight: 500;
}

/* 加载状态与空状态 */
.load-more-status {
  padding: 20rpx 0;
  text-align: center;
}
.status-text {
  font-size: 24rpx;
  color: #909399;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}
.empty-text {
  font-size: 26rpx;
  color: #909399;
  margin-top: 20rpx;
}

/* 底部操作栏 */
.popup-footer {
  padding: 20rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1rpx solid #f2f6fc;
  background-color: #ffffff;
}
.footer-left {
  display: flex;
  align-items: center;
  padding: 10rpx 0;
}
.all-select-text {
  font-size: 28rpx;
  color: #606266;
  margin-left: 12rpx;
}
.footer-left-placeholder {
  width: 80rpx;
}
.footer-right {
  display: flex;
  align-items: center;
}
.footer-btn {
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 500;
  border: none;
  padding: 0 40rpx;
  margin: 0;
}
.footer-btn::after {
  border: none;
}
.add-btn {
  background-color: #f2f6fc;
  color: #1890ff;
  margin-right: 20rpx;
  border: 1rpx solid #dcdfe6;
}
.confirm-btn {
  background-color: #1890ff;
  color: #ffffff;
  min-width: 180rpx;
  text-align: center;
}
</style>
