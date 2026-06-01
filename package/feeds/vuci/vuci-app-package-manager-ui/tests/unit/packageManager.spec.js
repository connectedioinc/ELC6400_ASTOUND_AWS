import PackageManager from '../../src/views/services/PackageManager.vue'
import createWrapper from '@tests/unit/mockFactory'
import { useNotifications } from '@/stores/messages'

vi.mock('../../src/views/services/composables/usePackageConstants', () => {
  return {
    usePackageConstants: () => ({
      packageTypes: {
        PENDING: 1,
        REMOVED: 9
      },
      runningPackageTypes: [5]
    })
  }
})

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: '/test/path' }))
  }
})

vi.mock('@ui-core/composables/useI18n', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    useTranslate: vi.fn(() => t => t)
  }
})

describe('PackageManager.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(PackageManager)
  })

  it('should open prompt with provided prompt context', () => {
    const context = { test: 'test' }
    wrapper.vm.openPrompt(context)
    expect(wrapper.vm.isPromptVisible).toBeTruthy()
    expect(wrapper.vm.promptContext).toEqual(context)
  })
  it('should reset prompt context and selected packages on prompt close', () => {
    wrapper.vm.closePrompt()
    expect(wrapper.vm.isPromptVisible).toBeFalsy()
    expect(wrapper.vm.resetSelectedPackages).toBeTruthy()
    expect(wrapper.vm.promptContext).toEqual({})
  })

  it('should set prompt context', () => {
    wrapper.vm.setPromptContext({ test: 'test' })
    expect(wrapper.vm.promptContext).toEqual({ test: 'test' })
  })
  it('should show notification', () => {
    const notification = useNotifications()
    const spy = vi.spyOn(notification, 'info')
    wrapper.vm.showNotification()
    expect(spy).toHaveBeenCalled()
  })
})
