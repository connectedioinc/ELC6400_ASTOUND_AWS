import IoStatus from '../../src/views/services/IoStatus.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

describe('IoStatus.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(IoStatus)
  })

  it.each([
    [{ type: 'acl' }, true],
    [{ type: 'adc' }, false],
    [{ type: 'gpio' }, true]
  ])('returns %s for io.type "%s"', (io, expected) => {
    wrapper.vm.ioStatusData = [
      { type: 'acl', state: 'active' },
      { type: 'adc', state: 'inactive' }
    ]
    expect(wrapper.vm.getMultiStateIoFilters(io)).toBe(expected)
  })

  it('loads io status data successfully', async () => {
    const mockData = [{ type: 'acl', state: 'active' }]
    axios.get = vi.fn().mockResolvedValue({ data: mockData })
    await wrapper.vm.handleIoStatusLoad()
    expect(wrapper.vm.ioStatusData).toEqual(mockData)
  })

  it('shows error message on load failure', async () => {
    axios.get = vi.fn().mockRejectedValue()
    await wrapper.vm.handleIoStatusLoad()
    expect(wrapper.vm.message.error).toHaveBeenCalledWith('Failed to load I/O status')
  })
})
