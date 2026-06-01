import type { App } from 'vue'
import { createPinia } from 'pinia'
import { useMainStore } from './main'

export const pinia = createPinia()

export default {
  install(app: App) {
    app.use(pinia)
    const store = useMainStore()
    app.config.globalProperties.$store = store
  }
}
