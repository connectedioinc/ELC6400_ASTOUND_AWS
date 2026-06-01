import { FilterXSS, whiteList, type IFilterXSSOptions } from 'xss'
import { getCurrentInstance, type App } from 'vue'

export function useXss() {
  return getCurrentInstance()?.appContext.config.globalProperties.$xss!
}

export default {
  install(app: App, options: IFilterXSSOptions = {}) {
    const xss = new FilterXSS({ ...options, whiteList: { ...whiteList, ...options.whiteList } })
    app.config.globalProperties.$xss = xss.process.bind(xss)
  }
}
