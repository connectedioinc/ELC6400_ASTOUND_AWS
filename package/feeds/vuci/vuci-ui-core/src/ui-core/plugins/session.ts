import type { App } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { i18n } from '@ui-core/plugins/i18n'
import { useMainStore } from '@/stores/main'
import router from '@/router'
import { debounce } from '@ui-core/utils/vue-helpers'
import { useAlerts, useMessages, useNotifications } from '@/stores/messages'
import { useCertificatesStore } from '@/stores/certificates'

type Permissions = 'read' | 'write'

export interface Acls {
  'access-group': Record<string, Permissions[]>
  api: Record<string, Permissions[]>
  file: Record<string, Permissions[]>
  ubus: Record<string, Permissions[]>
  uci: Record<string, Permissions[]>
  hide_sensitive: '1' | '0'
}

const debouncedResetTimeout = debounce(resetTimeout, 300)
let sessionTimeout: ReturnType<typeof setTimeout> | undefined
function resetTimeout() {
  const store = useMainStore()
  const timeout = store.sessionTimeout
  if (!timeout) return
  sessionTimeout = setTimeout(() => {
    session.loginError = i18n.t('Your session has expired, please log in again.')
    session.logout()
  }, timeout)
}

function handleInput() {
  clearTimeout(sessionTimeout)
  sessionTimeout = undefined
  debouncedResetTimeout()
}

export const session = {
  aclCache: null as Acls | null,
  _isAuthenticated: null as boolean | null,
  async isAuthenticated() {
    if (this._isAuthenticated === null) {
      this._isAuthenticated = await this.isAlive()
    }
    return this._isAuthenticated
  },
  get group(): string | null {
    return localStorage.getItem('group')
  },
  set group(group: string) {
    localStorage.setItem('group', group)
  },
  loginError: '',
  startSessionTimeout() {
    const store = useMainStore()
    const timeout = store.sessionTimeout
    if (!timeout) return
    debouncedResetTimeout()
    addEventListener('mouseover', handleInput)
    addEventListener('scroll', handleInput)
    addEventListener('keydown', handleInput)
  },
  stopSessionTimeout() {
    clearTimeout(sessionTimeout)
    sessionTimeout = undefined

    removeEventListener('mouseover', handleInput)
    removeEventListener('scroll', handleInput)
    removeEventListener('keydown', handleInput)
  },
  sessionTimeoutStarted() {
    return sessionTimeout !== undefined
  },
  async login(username: string, password: string) {
    if (!password) password = ''
    if (!username) username = ''
    // when changing device without turning off webui, response takes longer due to cache invalidation (probably)
    try {
      this.stopSessionTimeout()
      const response = await axios.post<{ username: string; group: string; token: string; expires: number }>('/api/login', { username, password }, { timeout: 1000 * 40 })
      if (!response.success) return false
      this.startHeartbeat()
      sessionStorage.removeItem('packages')
      const store = useMainStore()
      store.username = response.data.username
      this.group = response.data.group
      this._isAuthenticated = true
      return !!response
    } catch (err) {
      if (!axios.isAxiosError(err)) throw err
      if (err?.response?.status === 401) return false
      throw err
    }
  },
  async _logout() {
    try {
      await axios.post('/api/logout', { preventCancel: true })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) return
      else throw error
    }
  },
  async logout(options: { next?: Function; message?: string; spinnerReset: boolean } = { spinnerReset: false }) {
    const store = useMainStore()
    const messageStore = useMessages()
    const alertStore = useAlerts()
    const notificationsStore = useNotifications()
    const certificateStore = useCertificatesStore()

    this.stopHeartbeat()
    this.stopSessionTimeout()
    try {
      await this._logout()
      this._isAuthenticated = false
      if (options.message) this.loginError = options.message
      options.next ? options.next('/login') : await router.push('/login')
    } finally {
      store.clearStore(options.spinnerReset)
      if (options.spinnerReset) sessionStorage.removeItem('redirect-path')
      messageStore.$reset()
      alertStore.$reset()
      notificationsStore.$reset()
      certificateStore.$reset()
    }
  },
  async isAlive() {
    const store = useMainStore()
    try {
      return (
        store.formLoading ||
        (await axios.get('/api/session/status', { preventCancel: true }).then((res: { success: boolean; data: { username: string } }) => {
          store.username = res.data.username
          return true
        }))
      )
    } catch {
      return false
    }
  },
  _hearbeatInterval: undefined as ReturnType<typeof setInterval> | undefined,
  startHeartbeat() {
    const store = useMainStore()
    // ATT - If it's performance test then prevent any heartBeat as it bad for request results and don't impact performance too bad
    if (store.performanceTest) {
      this.stopHeartbeat()
      return
    }
    if (this._hearbeatInterval !== undefined) return
    this._hearbeatInterval = setInterval(async () => {
      const alive = await this.isAlive()
      if (alive) return
      this.logout()
      document.location = '/'
    }, 1000 * 30)
  },
  stopHeartbeat() {
    if (this._hearbeatInterval === undefined) return
    clearInterval(this._hearbeatInterval)
    delete this._hearbeatInterval
  },
  async updateACLs() {
    const res = await axios.get<Acls>('/api/users/acls/options')
    this.aclCache = res.data || {}
  },
  /**
   * Checks whether user has read/write access on specified endpoint
   * @param endpoint - Endpoint to check access
   * @param type - Type of access. Can be `read`, `write` or `undefined` for both
   * @returns true if has access, false if not
   */
  hasAccess(endpoint: string, type?: Permissions) {
    if (!session.aclCache) return false
    const access = session.aclCache['access-group'][endpoint]
    if (!access) return false
    return type ? access.includes(type) : access.includes('read') && access.includes('write')
  },
  hideSensitive() {
    return session.aclCache?.hide_sensitive === '1' || false
  }
}

export default {
  install(app: App) {
    app.config.globalProperties.$session = session
  }
}
