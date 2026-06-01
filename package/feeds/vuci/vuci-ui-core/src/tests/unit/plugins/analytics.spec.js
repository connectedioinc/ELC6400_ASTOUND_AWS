describe('analytics plugin', () => {
  let analytics = null
  beforeEach(async () => {
    const module = await import('@/plugins/analytics')
    analytics = module.analytics
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('loads analytics modules', async () => {
    vi.spyOn(analytics, 'importModules').mockResolvedValue([{}, {}])
    await analytics.loadModules()
    expect(analytics.sentry).toBeTruthy()
    expect(analytics.integrations).toBeTruthy()
  })

  it('enables analytics', async () => {
    window.__SENTRY_ENVIRONMENT__ = 'test'
    window.__SENTRY_ENABLED__ = true
    analytics.sentry = { init: vi.fn(), browserTracingIntegration: vi.fn(), createTracingMixins: vi.fn(), attachErrorHandler: vi.fn() }
    analytics.integrations = { HttpClient: vi.fn() }
    analytics.app = { mixin: vi.fn() }
    vi.spyOn(analytics, 'loadModules').mockResolvedValue()
    await analytics.enable()
    expect(analytics.state.loaded).toBe(true)
    expect(analytics.sentry.init).toHaveBeenCalled()
  })

  it('does not enable analytics when __SENTRY_ENABLED__ define is false', () => {
    window.__SENTRY_ENABLED__ = false
    analytics.enable()
    expect(analytics.state.enabled).toBeFalsy()
  })

  it('fails to enable analytics', async () => {
    window.__SENTRY_ENVIRONMENT__ = 'test'
    window.__SENTRY_ENABLED__ = true
    vi.spyOn(analytics, 'loadModules').mockRejectedValue()
    expect(analytics.state.enabled).toBeFalsy()
  })

  it('disables analytics', () => {
    const options = { enabled: true }
    analytics.state.loaded = true
    analytics.sentry = { close: vi.fn(), getClient: vi.fn(() => ({ getOptions: vi.fn(() => options) })) }
    analytics.disable()
    expect(analytics.sentry.getClient().getOptions().enabled).toBeFalsy()
  })

  it('adds data to analytics', () => {
    analytics.state.loaded = true
    analytics.sentry = { setTags: vi.fn() }
    analytics.addData({ key: 'value' })
    expect(analytics.sentry.setTags).toHaveBeenCalledWith({ key: 'value' })
  })

  it('hides analytics message', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    analytics.hideMessage()
    expect(analytics.state.showMessage).toBe(false)
    expect(spy).toHaveBeenCalledWith('analyticsMessageShown', false)
  })
})
