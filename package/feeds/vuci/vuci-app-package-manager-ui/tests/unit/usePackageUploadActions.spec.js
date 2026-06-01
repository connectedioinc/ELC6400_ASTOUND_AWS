import createWrapper from '@tests/unit/mockFactory'
import { usePackageUploadActions } from '../../src/components/services/composables/actions/usePackageUploadActions'
import { defineComponent } from 'vue'
import { useMainStore } from '@/stores/main'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'

vi.mock('../../src/views/services/composables/actions/usePackageFollowUpActions', () => {
  return {
    usePackageFollowUpActions: () => ({
      getFollowUpAction: vi.fn(() => 'network_restart')
    })
  }
})

describe('usePackageUploadActions', () => {
  let wrapper
  const emit = vi.fn()
  const handleModalClose = vi.fn()
  const setPromptContext = vi.fn()
  const TestComponent = defineComponent({
    setup() {
      return {
        ...usePackageUploadActions(emit, handleModalClose, setPromptContext)
      }
    }
  })

  beforeEach(() => {
    wrapper = createWrapper(TestComponent)
  })

  it('should call axios.post, emit event, show success message, handle follow up action, and stop spinner', async () => {
    const store = useMainStore()
    const message = useMessages()

    vi.spyOn(axios, 'post').mockResolvedValueOnce({ data: { package: 'pkg1' } })
    const emitSpy = emit
    const messageSpy = vi.spyOn(message, 'success')

    const promptContext = {
      package: 'pkg1'
    }

    await wrapper.vm.handlePackageInstall(promptContext)

    expect(store.spin).toHaveBeenCalledWith('Installing package')
    expect(axios.post).toHaveBeenCalledWith('/api/package_manager/actions/install_package', { data: { package: 'pkg1', custom: '1' } })
    expect(emitSpy).toHaveBeenCalledWith('package-installed', { package: 'pkg1' })
    expect(messageSpy).toHaveBeenCalledWith('Package installed successfully')
    expect(store.spin).toHaveBeenCalledWith(false)
  })

  it('should handle error and call setPromptContext with appropriate props', async () => {
    const store = useMainStore()

    const error = {
      response: {
        data: {
          errors: [{ code: 42 }]
        }
      }
    }
    vi.spyOn(axios, 'post').mockRejectedValueOnce(error)
    const setPromptContextSpy = setPromptContext

    const promptContext = {
      package: 'pkg1'
    }

    await wrapper.vm.handlePackageInstall(promptContext)

    expect(store.spin).toHaveBeenCalledWith('Installing package')
    expect(axios.post).toHaveBeenCalledWith('/api/package_manager/actions/install_package', { data: { package: 'pkg1', custom: '1' } })
    expect(setPromptContextSpy).toHaveBeenCalledWith('uploadError', promptContext, 42)
    expect(store.spin).toHaveBeenCalledWith(false)
  })
})
