import type { App } from 'vue'

export function log(message: string, error = false) {
  if (!import.meta.env.DEV) return
  const method = error ? 'trace' : 'log'
  console[method](message)
}

export default {
  install(app: App) {
    app.config.globalProperties.$log = log
  }
}
