import PackagePrompt from '../../src/views/services/PackagePrompt.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'
import { useMainStore } from '@/stores/main'
import { useMessages } from '@/stores/messages'

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

describe('PackagePrompt.vue', () => {
  let wrapper

  beforeEach(() => {
    wrapper = createWrapper(PackagePrompt, {
      global: {
        stubs: {
          ListLayout: { template: '<div />' },
          'tlt-modal': { template: '<div />' },
          'tlt-collapse-transition': { template: '<div />' },
          confirm: { template: '<div />' }
        }
      },
      computed: { ...PackagePrompt.computed }
    })
  })

  it.each`
    code  | err                                                                | expectedResult                   | shouldCallResetInput
    ${1}  | ${{}}                                                              | ${'Invalid file'}                | ${false}
    ${21} | ${{}}                                                              | ${'Package installation failed'} | ${false}
    ${2}  | ${{ response: { data: { errors: [{ value: 'Prompt error' }] } } }} | ${undefined}                     | ${true}
  `('should handle upload error with code $code and return $expectedResult', ({ code, err, expectedResult, shouldCallResetInput }) => {
    if (shouldCallResetInput) {
      wrapper.vm.uploadPackageRef = {
        resetInput: vi.fn()
      }
    }

    const result = wrapper.vm.handleUploadError(code, err)

    if (expectedResult) {
      expect(result).toBe(expectedResult)
    }

    if (shouldCallResetInput) {
      expect(wrapper.vm.uploadPackageRef.resetInput).toHaveBeenCalled()
    }
  })

  it.each`
    promptContext                | actions                                      | expectedResult
    ${{ actionName: 'install' }} | ${{ install: () => ({ prompt: 'testas' }) }} | ${'testas'}
    ${{}}                        | ${{ install: () => ({ prompt: 'testas' }) }} | ${undefined}
  `('should get prompt data with context $promptContext', ({ promptContext, actions, expectedResult }) => {
    wrapper = createWrapper(PackagePrompt, {
      props: {
        promptContext
      }
    })

    expect(wrapper.vm.getPrompt(actions)).toEqual(expectedResult)
  })

  it('should call axios.post and spin, show error on failure, and stop spinner when handleInstallReset is called', async () => {
    const store = useMainStore()
    const message = useMessages()
    vi.spyOn(axios, 'post').mockResolvedValueOnce({})

    await wrapper.vm.handleInstallReset()

    expect(store.spin).toHaveBeenCalledWith('Removing package install files')
    expect(axios.post).toHaveBeenCalledWith('/api/package_manager/actions/delete_install_files')
    expect(store.spin).toHaveBeenCalledWith(false)
    expect(message.error).not.toHaveBeenCalled()
  })

  it('should show error message if axios.post fails in handleInstallReset', async () => {
    const store = useMainStore()
    const message = useMessages()
    vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('fail'))

    await wrapper.vm.handleInstallReset()

    expect(store.spin).toHaveBeenCalledWith('Removing package install files')
    expect(axios.post).toHaveBeenCalledWith('/api/package_manager/actions/delete_install_files')
    expect(message.error).toHaveBeenCalledWith('Failed to remove installation files')
    expect(store.spin).toHaveBeenCalledWith(false)
  })
})
