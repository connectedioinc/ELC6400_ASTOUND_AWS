import CustomRules from '../../src/views/network/CustomRules.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

describe('CustomRules.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(CustomRules)
  })
  it('tests that custom rules sets area value when information is received', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { custom_rules: 'text_custom_rule' } })
    await wrapper.vm.getCustomRules()
    expect(wrapper.vm.areaValue).toEqual('text_custom_rule')
  })
  it('resets current area value in the config and the areaValue', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { custom_rules: 'text_custom_rule' } })
    await wrapper.vm.reset()
    expect(wrapper.vm.areaValue).toEqual('text_custom_rule')
  })
  it('sends modified rules data to endpoint and shows success message', async () => {
    vi.spyOn(axios, 'put').mockResolvedValue()
    const spy = vi.spyOn(wrapper.vm.message, 'success')
    await wrapper.vm.modifyCustomRules()
    expect(spy).toHaveBeenCalledWith('Configuration has been applied')
  })
})
