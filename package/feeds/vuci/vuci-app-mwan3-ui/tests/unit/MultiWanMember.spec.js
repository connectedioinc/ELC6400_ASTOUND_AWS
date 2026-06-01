import createWrapper from '@tests/unit/mockFactory'
import MultiWanMember from '../../src/views/network/MultiWanMember.vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

const interfaces = [
  {
    id: 'mob1s1a1',
    name: 'mob1s1a1'
  },
  {
    id: 'mob1s2a1',
    name: 'mob1s2a1'
  },
  {
    id: 'wan',
    name: 'wan'
  }
]

const networkIfaceStatus = [
  {
    id: 'mob1s1a1',
    name: 'mob1s1a1'
  },
  {
    id: 'mob1s2a1',
    name: 'mob1s2a1'
  },
  {
    id: 'wan',
    name: 'wan'
  }
]

const policies = [
  {
    '.index': '0',
    id: 'mwan_default',
    '.type': 'policy',
    use_member: ['wan', 'mob1s1a1', 'mob1s2a1']
  }
]

describe('MultiWanMember.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MultiWanMember)
  })

  it('loads afterLoad data', async () => {
    axios.bulkGet = vi.fn().mockResolvedValue([
      { success: true, data: interfaces },
      { success: true, data: policies }
    ])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.ifaces).toEqual(interfaces)
  })

  it('checks if afterLoad returns error message', async () => {
    const message = useMessages()
    axios.bulkGet = vi.fn().mockResolvedValue([{ success: false }, { success: false }])
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenNthCalledWith(1, 'Failed to load interfaces')
    expect(spy).toHaveBeenNthCalledWith(2, 'Failed to load policies')
  })

  it('checks if afterLoad returns unexpected error message', async () => {
    const message = useMessages()
    axios.bulkGet = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toBeCalledWith('An unexpected error occurred')
  })

  it('computes available interface options', () => {
    const res = [
      ['', '-- Select an interface --'],
      ['mob1s1a1', 'mob1s1a1'],
      ['mob1s2a1', 'mob1s2a1'],
      ['wan', 'wan']
    ]
    wrapper.vm.networkIfaceStatus = networkIfaceStatus
    wrapper.vm.ifaces = interfaces
    console.log(wrapper.vm.ifaceOptions)
    expect(wrapper.vm.ifaceOptions).toEqual(res)
  })
})
