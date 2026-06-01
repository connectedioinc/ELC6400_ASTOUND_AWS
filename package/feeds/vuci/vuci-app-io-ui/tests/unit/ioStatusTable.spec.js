import IoStatusTable from '../../src/components/services/IoStatusTable.vue'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('../../src/components/services/useIoStatusContext', () => ({
  useIoStatusContext: vi.fn(() => ({
    handleDataLoad: vi.fn()
  }))
}))

describe('IoStatusTable.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(IoStatusTable, {
      props: {
        ioData: [
          { id: '1', type: 'acl', direction: 'in', invert_input: '1', custom_name: 'Custom 1' },
          { id: '2', type: 'adc', direction: 'out', invert_input: '0' }
        ]
      }
    })
  })

  it.each([
    [{ direction: 'out', type: 'gpio', invert_input: '1' }, '-'],
    [{ direction: 'out', type: 'adc', invert_input: '0' }, '-'],
    [{ direction: 'in', type: 'gpio', invert_input: '1' }, 'On'],
    [{ direction: 'in', type: 'gpio', invert_input: '0' }, 'Off'],
    [{ direction: 'in', type: 'gpio', invert_input: undefined }, 'Off'],
    [{ direction: 'out', type: 'dwi', invert_input: '1' }, 'On'],
    [{ direction: 'out', type: 'dwi', invert_input: '0' }, 'Off']
  ])('returns %s for io %j', (io, expected) => {
    expect(wrapper.vm.getInversionValue(io)).toBe(expected)
  })

  it('closeEdit sets isEditOpen to false, editSection to null, and emits "edit-close"', () => {
    wrapper.vm.closeEdit()

    expect(wrapper.vm.isEditOpen).toBe(false)
    expect(wrapper.vm.editSection).toBeNull()
  })

  it('openEdit sets isEditOpen to true, editSection to io, and emits "edit-open"', () => {
    const io = { id: '123', type: 'gpio' }

    wrapper.vm.editSection = null
    wrapper.vm.isEditOpen = false

    wrapper.vm.openEdit(io)

    expect(wrapper.vm.isEditOpen).toBe(true)
    expect(wrapper.vm.editSection).toEqual(io)
  })
})
