import createWrapper from '@tests/unit/mockFactory'
import MultiWanRule from '../../src/views/network/MultiWanRule.vue'
import MultiWanRuleEdit from '../../src/views/network/MultiWanRuleEdit.vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

const policies = [
  {
    id: 'mwan_default',
    '.type': 'policy',
    '.index': '0',
    name: 'default',
    use_member: ['wan', 'mob1s1a1', 'mob1s2a1']
  },
  {
    id: 'balance_newRule',
    '.type': 'policy',
    '.index': '1',
    name: 'newRule',
    use_member: ['wan', 'mob1s1a1', 'mob1s2a1']
  }
]
const staticPolicyOpts = [
  ['unreachable', 'Unreachable (Reject)'],
  ['blackhole', 'Blackhole (Drop)'],
  ['default', 'Default (Use main routing table)']
]

describe('MultiWanRule.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MultiWanRule)
  })
  it('loads afterLoad data', async () => {
    axios.get = vi.fn().mockResolvedValue({ success: true, data: policies })
    const data = await wrapper.vm.afterLoad()
    expect(data.mwanPolicies).toEqual(policies)
  })
  it('checks if afterLoad returns error message', async () => {
    const message = useMessages()
    axios.get = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load policies')
  })
})

describe('MultiWanRuleEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MultiWanRuleEdit, {
      props: { section: {} }
    })
  })
  it('loads policy options', async () => {
    wrapper.vm.formData.mwanPolicies = policies
    const expectedValue = wrapper.vm.policyOptions
    const result = [
      ['mwan_default', 'default'],
      ['balance_newRule', 'newRule']
    ]
    result.push(...staticPolicyOpts)
    expect(expectedValue).toEqual(result)
  })
  it.each`
    value             | res
    ${'mwan_default'} | ${{ isValid: true, message: 'Specified policy should have at least one member before being assigned to the rule' }}
    ${'balance'}      | ${{ isValid: false, message: 'Specified policy should have at least one member before being assigned to the rule' }}
  `('checks if $value has members assigned', ({ value, res }) => {
    wrapper.vm.formData.mwanPolicies = policies
    expect(wrapper.vm.checkPolicyMembers(value)).toEqual(res)
  })
})
