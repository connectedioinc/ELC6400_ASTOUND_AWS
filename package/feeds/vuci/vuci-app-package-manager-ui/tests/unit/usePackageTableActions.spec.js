import createWrapper from '@tests/unit/mockFactory'
import { usePackageTableActions } from '../../src/components/services/composables/actions/usePackageTableActions'
import { defineComponent } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { useMainStore } from '@/stores/main'
import { useMessages } from '@/stores/messages'

vi.mock('@ui-core/composables/useI18n', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    useTranslate: vi.fn(() => t => t)
  }
})

describe('useFollowUpActions', () => {
  let wrapper
  const TestComponent = defineComponent({
    setup(_, { emit }) {
      return {
        ...usePackageTableActions(emit)
      }
    }
  })

  beforeEach(() => {
    wrapper = createWrapper(TestComponent)
  })

  it('handleAction should call axios.post, emit events, and show success message on success', async () => {
    const message = useMessages()
    const store = useMainStore()
    const packageData = [{ package: 'pkg1' }, { package: 'pkg2' }]
    const actionOptions = {
      successMessage: 'Success!',
      errorMessage: 'Error!',
      endpoint: '/api/packages',
      handleCallback: vi.fn()
    }
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({})
    const messageSpy = vi.spyOn(message, 'success')
    const spinSpy = vi.spyOn(store, 'spin')

    await wrapper.vm.handleAction(packageData, actionOptions)

    expect(spinSpy).toHaveBeenCalled()
    expect(postSpy).toHaveBeenCalledWith('/api/packages', { data: { packages: ['pkg1', 'pkg2'] } })
    expect(actionOptions.handleCallback).toHaveBeenCalledWith(packageData)
    expect(messageSpy).toHaveBeenCalledWith('Success!')
    expect(spinSpy).toHaveBeenCalledWith(false)
  })

  it('handleAction should show error message on error response', async () => {
    const message = useMessages()
    const store = useMainStore()
    const packageData = [{ package: 'pkg1' }]
    const actionOptions = {
      successMessage: 'Success!',
      errorMessage: 'Error!',
      endpoint: '/api/packages',
      handleCallback: vi.fn()
    }
    const errorResponse = { data: { errors: [{ code: 42 }] } }
    vi.spyOn(axios, 'post').mockRejectedValueOnce(errorResponse)
    const messageSpy = vi.spyOn(message, 'error')
    const spinSpy = vi.spyOn(store, 'spin')

    await wrapper.vm.handleAction(packageData, actionOptions)

    expect(messageSpy).toHaveBeenCalledWith('Package installation failed. Check your internet connection or try to update package list.')
    expect(spinSpy).toHaveBeenCalledWith(false)
  })

  it.each([
    ['success', 'install', 'Package install action started successfully'],
    ['error', 'remove', 'Package remove action failed']
  ])('getMessageTemplate(%s, %s) should return "%s"', (type, action, expected) => {
    expect(wrapper.vm.getMessageTemplate(type, action)).toEqual(expected)
  })

  it('handleAction should show generic error message if no error code', async () => {
    const message = useMessages()
    const store = useMainStore()
    const packageData = [{ package: 'pkg1' }]
    const actionOptions = {
      successMessage: 'Success!',
      errorMessage: 'Generic error!',
      endpoint: '/api/packages',
      handleCallback: vi.fn()
    }
    vi.spyOn(axios, 'post').mockRejectedValueOnce({})
    const messageSpy = vi.spyOn(message, 'error')
    const spinSpy = vi.spyOn(store, 'spin')

    await wrapper.vm.handleAction(packageData, actionOptions)

    expect(messageSpy).toHaveBeenCalledWith('Generic error!')
    expect(spinSpy).toHaveBeenCalledWith(false)
  })

  it.each`
    scenario               | initialSearches                                                 | itemsToRemove           | expectedResult
    ${'single item'}       | ${[{ path: '/path1' }, { path: '/path2' }, { path: '/path3' }]} | ${['/path2']}           | ${[{ path: '/path1' }, { path: '/path3' }]}
    ${'multiple items'}    | ${[{ path: '/path1' }, { path: '/path2' }, { path: '/path3' }]} | ${['/path1', '/path3']} | ${[{ path: '/path2' }]}
    ${'non-existent item'} | ${[{ path: '/path1' }, { path: '/path2' }]}                     | ${'/path3'}             | ${[{ path: '/path1' }, { path: '/path2' }]}
    ${'all items'}         | ${[{ path: '/path1' }, { path: '/path2' }]}                     | ${['/path1', '/path2']} | ${[]}
  `('removes $scenario from localStorage', ({ initialSearches, itemsToRemove, expectedResult }) => {
    localStorage.setItem('recent-searches', JSON.stringify(initialSearches))
    wrapper.vm.removeSearchItem(itemsToRemove)
    expect(localStorage.getItem('recent-searches')).toEqual(JSON.stringify(expectedResult))
  })
})
