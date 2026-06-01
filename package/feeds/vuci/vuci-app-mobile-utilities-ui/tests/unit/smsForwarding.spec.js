import createWrapper from '@tests/unit/mockFactory'
import SMSForwarding from '../../src/views/services/SMSForwarding.vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

vi.mock('@/plugins/mobile', () => ({
  mobile: {
    modemsOptions: () => [
      ['3-1', 'Internal'],
      ['3-2', 'External']
    ],
    parseModems: data => data
  }
}))

describe('SMSForwarding.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(SMSForwarding)
  })

  it('loads modems, phone groups, and email users with success', async () => {
    axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: [{ name: 'ptest1' }, { name: 'ptest2' }] },
      { success: true, data: [{ name: 'etest1' }, { name: 'etest2' }] },
      {
        success: true,
        data: [
          { id: '3-1', name: 'Internal' },
          { id: '3-2', name: 'External' }
        ]
      }
    ])
    await wrapper.vm.loadData()
    expect(wrapper.vm.modems).toEqual([
      { id: '3-1', name: 'Internal' },
      { id: '3-2', name: 'External' }
    ])
    expect(wrapper.vm.userGroups).toEqual([{ name: 'ptest1' }, { name: 'ptest2' }])
    expect(wrapper.vm.emailGroups).toEqual([{ name: 'etest1' }, { name: 'etest2' }])
  })

  it('invokes phone group error message when phone group request fails', async () => {
    axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: false },
      { success: true, data: [{ name: 'etest1' }, { name: 'etest2' }] },
      {
        success: true,
        data: [
          { id: '3-1', name: 'Internal' },
          { id: '3-2', name: 'External' }
        ]
      }
    ])
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(wrapper.vm.userGroups).toEqual([])
    expect(wrapper.vm.emailGroups).toEqual([{ name: 'etest1' }, { name: 'etest2' }])
    expect(spy).toHaveBeenCalledWith('Failed to load phone groups')
    vi.clearAllMocks()
  })

  it('invokes email user error message when email user request fails', async () => {
    axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: [{ name: 'ptest1' }, { name: 'ptest2' }] },
      { success: false },
      {
        success: true,
        data: [
          { id: '3-1', name: 'Internal' },
          { id: '3-2', name: 'External' }
        ]
      }
    ])
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(wrapper.vm.userGroups).toEqual([{ name: 'ptest1' }, { name: 'ptest2' }])
    expect(wrapper.vm.emailGroups).toEqual([])
    expect(spy).toHaveBeenCalledWith('Failed to load email users')
    vi.clearAllMocks()
  })

  it('invokes error messages when all bulk requests fail', async () => {
    axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: false }, { success: false }, { success: false }])
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(wrapper.vm.modems).toEqual([])
    expect(wrapper.vm.userGroups).toEqual([])
    expect(wrapper.vm.emailGroups).toEqual([])
    expect(spy).toHaveBeenCalledTimes(3)
    vi.clearAllMocks()
  })

  it('invokes error message when bulk request fails', async () => {
    axios.bulkGet = vi.fn().mockRejectedValueOnce({})
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    vi.clearAllMocks()
  })

  it.each([
    ['extra_data_pair_1', { extra_data_pair_1: ['foo', 'bar'] }, { $data: { modelValues: [['foo', 'bar']] }, name: 'extra_data_pair_1' }, { extra_name1: 'foo', extra_value1: 'bar' }],
    ['extra_data_pair_2', { extra_data_pair_2: ['baz', 'qux'] }, { $data: { modelValues: [['baz', 'qux']] }, name: 'extra_data_pair_2' }, { extra_name2: 'baz', extra_value2: 'qux' }]
  ])('calls saveExtraDataPair for %s', (pairName, section, self, expected) => {
    wrapper.vm.saveExtraDataPair(self, section)
    Object.entries(expected).forEach(([key, value]) => {
      expect(section[key]).toBe(value)
    })
    expect(section[pairName]).toBeUndefined()
  })

  it.each([
    ['1', { fwd_to_http: [{ extra_name1: 'foo', extra_value1: 'bar' }] }, ['foo', 'bar']],
    ['2', { fwd_to_http: [{ extra_name2: 'baz', extra_value2: 'qux' }] }, ['baz', 'qux']]
  ])('calls loadExtraDataPair for componentNumber "%s"', (componentNumber, formData, expected) => {
    wrapper.vm.formData = formData
    const result = wrapper.vm.loadExtraDataPair(componentNumber)
    expect(result).toEqual(expected)
  })
})
