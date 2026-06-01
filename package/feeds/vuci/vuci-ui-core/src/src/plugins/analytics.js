import { reactive } from 'vue'
import { brand } from '@ui-core/plugins/brand'
import router from '@/router'
import { axios } from '@ui-core/plugins/axios'

export const analytics = {
  state: reactive({ loaded: false, enabled: null, showMessage: localStorage.getItem('analyticsMessageShown') === 'true' }),
  sentry: null,
  integrations: null,
  app: null,

  importModules() {
    return Promise.all([import('https://cdn.jsdelivr.net/npm/@sentry/vue@7/+esm'), import('https://cdn.jsdelivr.net/npm/@sentry/integrations@7/+esm')])
  },

  async loadModules() {
    if (this.sentry && this.integrations && this.state.loaded) return
    const [sentry, integrations] = await this.importModules()
    this.sentry = sentry
    this.integrations = integrations
  },

  initSentry() {
    this.sentry.init({
      // Using dynamic initialization to allow sentry to be enabled/disabled at runtime
      // https://docs.sentry.io/platforms/javascript/guides/vue/features/multiple-apps/#dynamic-initialization
      app: [],
      dsn: brand.text('sentryDSN'),
      tunnel: '/cgi-bin/sentry',
      // eslint-disable-next-line no-undef
      environment: __SENTRY_ENVIRONMENT__,
      integrations: [this.sentry.browserTracingIntegration({ router }), new this.integrations.HttpClient()],
      attachStacktrace: true,
      transport: options => this.sentry.createTransport(options, request => axios.post(options.url, request.body)),
      beforeSend(event) {
        return JSON.parse(JSON.stringify(event).replaceAll(location.hostname, '[IP]'))
      },
      beforeBreadcrumb(breadcrumb, hint) {
        if (breadcrumb.category === 'xhr' && hint && hint.xhr.status >= 500 && hint.xhr.status <= 599) {
          const response = JSON.parse(hint.xhr.response)
          const data = {
            errors: response?.errors
          }
          breadcrumb.data = { ...breadcrumb.data, ...data }
        }
        return breadcrumb
      }
    })
  },

  async enable() {
    try {
      // eslint-disable-next-line no-undef
      if (!__SENTRY_ENABLED__) return
      if (!this.state.loaded) {
        await this.loadModules()
        this.initSentry()
        this.app.mixin(this.sentry.createTracingMixins({ trackComponents: false }))
        this.sentry.attachErrorHandler(this.app, {})
        this.state.loaded = true
      } else this.sentry.getClient().getOptions().enabled = true
    } catch {
      console.error('Failed to load analytics modules.')
    } finally {
      this.hideMessage()
    }
  },

  disable() {
    if (!this.state.loaded) return
    this.sentry.getClient().getOptions().enabled = false
  },

  addData(data) {
    if (!this.state.loaded) return
    this.sentry.setTags(data)
  },

  hideMessage() {
    this.state.showMessage = false
    localStorage.setItem('analyticsMessageShown', false)
  }
}

export default {
  install(app) {
    if (localStorage.getItem('analyticsMessageShown') === null) {
      localStorage.setItem('analyticsMessageShown', true)
      analytics.state.showMessage = true
    }
    analytics.app = app
    app.config.globalProperties.$analytics = analytics
  }
}
