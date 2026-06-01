import { flushPromises } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import sessionPlugin, { session } from '@ui-core/plugins/session'
import { axios } from '@ui-core/plugins/axios'
import i18n from '@ui-core/plugins/i18n'
import { useMainStore } from '@/stores/main'

vi.mock('@/router')

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({
    path: ''
  })
}))

describe('session.js', () => {
  const methods = Object.keys(session)
  let app
  vi.useFakeTimers()

  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
    app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    sessionPlugin.install(app)
    i18n.install(app)
  })

  it('export default install. Assign exported plugin functions to $session', () => {
    expect(app.config.globalProperties.$session).toEqual(session)
  })

  it.each`
    method
    ${'startSessionTimeout'}
    ${'stopSessionTimeout'}
    ${'sessionTimeoutStarted'}
    ${'login'}
    ${'logout'}
    ${'isAlive'}
    ${'startHeartbeat'}
    ${'stopHeartbeat'}
    ${'updateACLs'}
    ${'hasAccess'}
  `('plugin contain and export $method method', ({ method }) => {
    expect(methods.includes(method)).toBe(true)
  })

  describe('startSessionTimeout', () => {
    it('Exits if timeout is not provided.', () => {
      const store = useMainStore()
      store.sessionTimeout = 0
      const spy = vi.spyOn(window, 'addEventListener')
      session.startSessionTimeout()
      expect(spy).not.toHaveBeenCalled()
    })
    it('Session timeouts.', async () => {
      const store = useMainStore()
      const message = 'Your session has expired, please log in again.'
      store.sessionTimeout = 10
      vi.spyOn(session, 'logout').mockResolvedValue()
      vi.spyOn(window, 'addEventListener').mockImplementationOnce((_event, handler) => {
        handler()
        vi.advanceTimersByTime(1000)
      })
      session.startSessionTimeout()
      await flushPromises()
      expect(session.sessionTimeoutStarted()).toBe(true)
      expect(session.loginError).toBe(message)
    })
  })
  describe('stopSessionTimeout', () => {
    it('Exits if timeout is not provided.', () => {
      const store = useMainStore()
      store.sessionTimeout = 10
      const spy = vi.spyOn(window, 'removeEventListener')
      session.stopSessionTimeout()
      expect(spy).toHaveBeenCalled()
    })
    it('Stops session timeout.', () => {
      const store = useMainStore()
      store.sessionTimeout = 10
      const spy = vi.spyOn(window, 'removeEventListener')
      const spyTimeout = vi.spyOn(global, 'clearTimeout')
      session.stopSessionTimeout()
      expect(spyTimeout).toHaveBeenCalled()
      expect(spy).toHaveBeenCalledTimes(3)
    })
  })

  describe('method login', () => {
    it('fails with status: 401', async () => {
      const response = {
        response: {
          status: 401
        }
      }
      axios.post = vi.fn()
      axios.post.mockRejectedValueOnce(response)
      axios.isAxiosError = vi.fn().mockReturnValueOnce(true)
      const loginStatus = await session.login()
      expect(loginStatus).toBe(false)
    })
    it('resolves with response status: 400', async () => {
      const response = {
        success: false
      }
      axios.post = vi.fn()
      axios.post.mockResolvedValueOnce(response)
      const loginStatus = await session.login('user', 'pass')
      expect(loginStatus).toBe(false)
    })
    it('successfully logs in with response data', async () => {
      const response = {
        success: true,
        data: {
          username: 'user'
        }
      }
      vi.spyOn(session, 'startHeartbeat').mockReturnValue()
      vi.spyOn(session, 'startSessionTimeout').mockReturnValue()
      axios.post = vi.fn()
      axios.post.mockResolvedValueOnce(response)
      const loginStatus = await session.login('user', 'pass')
      expect(loginStatus).toBe(true)
    })
  })
  it.each`
    state
    ${true}
    ${false}
  `('method isAlive. Check if alive when store state is: $state', async ({ state }) => {
    const store = useMainStore()
    store.formLoading = state
    axios.get = vi.fn().mockRejectedValueOnce()
    const isAlive = await session.isAlive()
    expect(isAlive).toBe(state)
  })

  it('method stopHeartbeat. Heartbeat interval is not started.', () => {
    const spyTimeout = vi.spyOn(global, 'clearInterval')
    session.stopHeartbeat()
    expect(spyTimeout).not.toHaveBeenCalled()
  })

  it('method startHeartbeat. Started heartbeat session is alive.', () => {
    const spy = vi.spyOn(session, 'logout')
    vi.spyOn(session, 'isAlive').mockResolvedValueOnce(true)
    session.startHeartbeat()
    vi.advanceTimersByTime(15000)
    expect(spy).not.toHaveBeenCalled()
  })

  it('method startHeartbeat, stopHeartbeat. Heartbeat started with dead session and stopped.', () => {
    vi.spyOn(session, 'isAlive').mockResolvedValueOnce(false)
    vi.spyOn(session, 'logout').mockReturnValue()
    const spyTimeout = vi.spyOn(global, 'clearInterval')
    session.startHeartbeat()
    vi.advanceTimersByTime(15000)
    session.startHeartbeat()
    session.stopHeartbeat()
    expect(spyTimeout).toHaveBeenCalled()
  })

  it.each`
    acls                                      | result
    ${{ admin: { core: ['read', 'write'] } }} | ${{ admin: { core: ['read', 'write'] } }}
    ${null}                                   | ${{}}
  `('method updateACLs. ACLs are updated.', async ({ acls, result }) => {
    axios.get = vi.fn().mockResolvedValueOnce({ data: acls })
    await session.updateACLs()
    expect(session.aclCache).toEqual(result)
  })
  describe('method hasAccess', () => {
    it('returns false when acl is not cached', () => {
      session.aclCache = undefined
      expect(session.hasAccess()).toBeFalsy()
    })
    it('return false when acl not found', () => {
      session.aclCache = { 'access-group': { test: ['read', 'write'] } }
      expect(session.hasAccess('ttest')).toBeFalsy()
    })
    it.each([
      ['endpoint not found', { 'access-group': { ttest: ['read', 'write'] } }, undefined, false],
      ['endpoint is read only', { 'access-group': { test: ['read'] } }, 'read', true],
      ['endpoint is read and write', { 'access-group': { test: ['read', 'write'] } }, undefined, true],
      ['check fails', { 'access-group': { test: ['read', 'write'] } }, 'asdf', false]
    ])('checks acl access when %s', (_text, cache, type, expected) => {
      session.aclCache = cache
      expect(session.hasAccess('test', type)).toBe(expected)
    })
  })
})
