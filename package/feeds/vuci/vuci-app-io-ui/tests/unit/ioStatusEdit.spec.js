import IoStatusEdit from '../../src/views/services/IoStatusEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: '/test/path' }))
  }
})

vi.mock('../../src/components/services/useIoStatusContext', () => ({
  useIoStatusContext: vi.fn(() => ({
    handleIoStatusLoad: vi.fn(),
    aclSection: {},
    adcSection: {}
  }))
}))

describe('IoStatusEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(IoStatusEdit, {
      props: { initialSection: { type: 'adc' } }
    })
  })

  it.each([
    [{ type: 'adc' }, { type: 'adc', analogSectionType: 'adc' }],
    [{ type: 'acl' }, { type: 'acl', analogSectionType: 'acl' }],
    [{ type: 'gpio' }, { type: 'gpio' }]
  ])('sets form correctly for initialSection %s', (initialSection, expectedForm) => {
    wrapper = createWrapper(IoStatusEdit, {
      props: { initialSection }
    })
    wrapper.vm.setForm()
    expect(wrapper.vm.form).toEqual(expectedForm)
  })

  it('shows prompt and emits close on ok in handleModalClose', () => {
    wrapper.vm.handleModalClose()

    expect(wrapper.vm.prompt.show).toHaveBeenCalledWith({
      title: 'Go back?',
      content: 'Unsaved changes will be discarded',
      okText: 'Discard',
      cancelText: 'Cancel',
      onOk: expect.any(Function)
    })
  })
})
