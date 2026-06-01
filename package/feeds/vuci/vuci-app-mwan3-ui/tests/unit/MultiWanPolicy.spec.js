/* eslint-disable camelcase */
import createWrapper from '@tests/unit/mockFactory'
import MultiWanPolicy from '../../src/views/network/MultiWanPolicy.vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

const policies = [
  {
    '.index': '0',
    id: 'mwan_default',
    '.type': 'policy',
    use_member: ['wan', 'mob1s1a1', 'mob1s2a1']
  }
]
const members = [
  { id: 'wan', name: 'wan' },
  { id: 'mob1s1a1', name: 'mob1s1a1' },
  { id: 'mob1s2a1', name: 'mob1s2a1' }
]

describe('MultiWanPolicy.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MultiWanPolicy)
  })

  it('loads afterLoad data', async () => {
    axios.get = vi.fn().mockResolvedValue({ success: true, data: policies })
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.members).toEqual(policies)
  })

  it('checks if afterLoad returns error message', async () => {
    const message = useMessages()
    axios.get = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load failover members')
  })

  it('computes available member options', () => {
    const res = [
      ['wan', 'wan'],
      ['mob1s1a1', 'mob1s1a1'],
      ['mob1s2a1', 'mob1s2a1']
    ]
    wrapper.vm.members = members
    expect(wrapper.vm.memberOptions).toEqual(res)
  })

  it.each`
    self                         | res
    ${{ id: 'mwan_default' }}    | ${true}
    ${{ id: 'balance_default' }} | ${true}
    ${{ id: 'policy' }}          | ${false}
  `('checks if $self.id is readonly', ({ self, res }) => {
    expect(wrapper.vm.isReadOnly(self)).toBe(res)
  })

  it.each`
    value              | members                                                                                                                          | res
    ${['member_mwan']} | ${[{ id: 'member_mwan', interface: 'wan' }]}                                                                                     | ${[]}
    ${['member_mwan']} | ${[{ id: 'member_mwan', interface: 'wan' }, { id: 'member_mwan2', interface: 'wan' }, { id: 'member_wifi', interface: 'wifi' }]} | ${['member_mwan2']}
    ${['member_wifi']} | ${[{ id: 'member_mwan', interface: 'wan' }, { id: 'member_mwan2', interface: 'wan' }, { id: 'member_wifi', interface: 'wifi' }]} | ${[]}
  `('returns dublicate members', ({ value, members, res }) => {
    wrapper.vm.members = members
    expect(wrapper.vm.dublicateMembers(value)).toEqual(res)
  })
})
