import App from './App.vue'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import uviewPlus from 'uview-plus'
import {createPinia} from 'pinia'
import AppIcon from './components/AppIcon.vue'
import UniTag from '@dcloudio/uni-ui/lib/uni-tag/uni-tag.vue'
import UniLoadMore from '@dcloudio/uni-ui/lib/uni-load-more/uni-load-more.vue'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(uviewPlus)
  app.use(pinia)
  app.component('u-icon', AppIcon)
  app.component('up-icon', AppIcon)
  app.component('uni-tag', UniTag)
  app.component('uni-load-more', UniLoadMore)
  
  return {
    app
  }
}
// #endif
