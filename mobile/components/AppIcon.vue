<template>
  <view class="app-icon" :style="wrapStyle" @click="handleClick">
    <svg
      class="app-icon__svg"
      :width="iconSize"
      :height="iconSize"
      viewBox="0 0 24 24"
      fill="none"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path v-for="(path, index) in iconPaths" :key="index" :d="path" />
    </svg>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#303133'
  },
  size: {
    type: [Number, String],
    default: 16
  },
  customStyle: {
    type: [Object, String],
    default: ''
  }
})

const emit = defineEmits(['click'])

const icons = {
  account: ['M20 21a8 8 0 0 0-16 0', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8'],
  'account-fill': ['M20 21a8 8 0 0 0-16 0', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8'],
  'arrow-down': ['M12 5v14', 'M19 12l-7 7-7-7'],
  'arrow-right': ['M5 12h14', 'M12 5l7 7-7 7'],
  'arrow-up': ['M12 19V5', 'M5 12l7-7 7 7'],
  'arrow-upward': ['M7 17L17 7', 'M8 7h9v9'],
  attach: ['M21 12.8 12 21a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5'],
  bag: ['M6 8h12l-1 13H7L6 8Z', 'M9 8a3 3 0 0 1 6 0'],
  car: ['M5 17h14l-1.5-6h-11L5 17Z', 'M7 17v2', 'M17 17v2', 'M8 11l2-4h4l2 4'],
  'checkmark-circle': ['M22 11.1V12a10 10 0 1 1-5.9-9.1', 'M22 4 12 14.01l-3-3'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  'close-circle': ['M15 9l-6 6', 'M9 9l6 6', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'],
  'edit-pen': ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z'],
  'file-text': ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M8 13h8', 'M8 17h6'],
  folder: ['M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z'],
  'folder-filled': ['M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z'],
  forward: ['M9 18l6-6-6-6'],
  gift: ['M20 12v10H4V12', 'M2 7h20v5H2Z', 'M12 22V7', 'M12 7H8a2 2 0 1 1 2-2c0 2 2 2 2 2Z', 'M12 7h4a2 2 0 1 0-2-2c0 2-2 2-2 2Z'],
  grid: ['M3 3h7v7H3Z', 'M14 3h7v7h-7Z', 'M14 14h7v7h-7Z', 'M3 14h7v7H3Z'],
  home: ['M3 11 12 3l9 8', 'M5 10v11h14V10', 'M9 21v-6h6v6'],
  'home-fill': ['M3 11 12 3l9 8', 'M5 10v11h14V10', 'M9 21v-6h6v6'],
  'info-circle': ['M12 16v-4', 'M12 8h.01', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],
  integral: ['M12 2l3 6 6 .9-4.5 4.4 1.1 6.2L12 16.5 6.4 19.5l1.1-6.2L3 8.9 9 8l3-6Z'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  plus: ['M12 5v14', 'M5 12h14'],
  'plus-circle-fill': ['M12 8v8', 'M8 12h8', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],
  reload: ['M21 12a9 9 0 0 1-15 6.7', 'M3 12A9 9 0 0 1 18 5.3', 'M18 2v4h-4', 'M6 22v-4h4'],
  'rewind-left': ['M11 19 2 12l9-7v14Z', 'M22 19l-9-7 9-7v14Z'],
  'rmb-circle': ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M8 7l4 5 4-5', 'M12 12v5', 'M9 12h6', 'M9 15h6'],
  search: ['M21 21l-4.3-4.3', 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z'],
  setting: ['M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 0 1 7.2 4l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.2a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1Z'],
  'shopping-cart': ['M6 6h15l-1.5 8h-12L6 6Z', 'M6 6 5 2H2', 'M8 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z', 'M18 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z'],
  star: ['M12 2l3 6 6 .9-4.5 4.4 1.1 6.2L12 16.5 6.4 19.5l1.1-6.2L3 8.9 9 8l3-6Z'],
  'star-fill': ['M12 2l3 6 6 .9-4.5 4.4 1.1 6.2L12 16.5 6.4 19.5l1.1-6.2L3 8.9 9 8l3-6Z'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 15H6L5 6', 'M10 11v6', 'M14 11v6']
}

const iconSize = computed(() => {
  const size = String(props.size || 16)
  return /^\d+(\.\d+)?$/.test(size) ? `${size}px` : size
})

const iconName = computed(() => props.name || props.type || 'info-circle')
const iconPaths = computed(() => icons[iconName.value] || icons['info-circle'])

const wrapStyle = computed(() => {
  const style = {
    width: iconSize.value,
    height: iconSize.value,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  }
  return typeof props.customStyle === 'object' && props.customStyle ? { ...style, ...props.customStyle } : style
})

const handleClick = (event) => {
  emit('click', event)
}
</script>

<style scoped>
.app-icon {
  vertical-align: middle;
  line-height: 1;
}

.app-icon__svg {
  display: block;
  overflow: visible;
}
</style>
