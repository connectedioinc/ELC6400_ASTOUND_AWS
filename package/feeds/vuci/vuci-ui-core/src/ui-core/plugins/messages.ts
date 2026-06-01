import type { App } from 'vue'
import { useAlerts, useMessages, useNotifications, usePrompt } from '@/stores/messages'

export default {
  install(app: App) {
    app.config.globalProperties.$prompt = usePrompt()
    app.config.globalProperties.$message = useMessages()
    app.config.globalProperties.$alert = useAlerts()
    app.config.globalProperties.$notification = useNotifications()
  }
}
