<template>
  <view class="content">
    <CustomTabbar current="index" @open-kaidan="showKaidenPopup = true" />
    <KaidenPopup v-model:show="showKaidenPopup" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import CustomTabbar from '@/components/CustomTabbar.vue'
import KaidenPopup from '@/components/KaidenPopup.vue'

const showKaidenPopup = ref(false)
</script>

<style lang="scss" scoped>
.content {
  min-height: 100vh;
  background: #F5F7FA;
  padding-bottom: 120rpx;
}
</style>
