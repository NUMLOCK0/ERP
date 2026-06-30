import path from 'node:path'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  resolve: {
    alias: {
      components: path.resolve(__dirname, 'components'),
      uni_modules: path.resolve(__dirname, 'uni_modules')
    }
  },
  plugins: [uni()],
  build: {
    assetsInlineLimit: 102400
  }
})
