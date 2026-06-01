import MqttPub from '../../src/views/services/MqttPub.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('MqttPub.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MqttPub)
  })

  it('afterLoad invokes error message', async () => {
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load modem options.')
  })
  it('afterLoad sets correct data', async () => {
    const form = { mqtt: [{ password: 'set', psk: 'set' }] }
    wrapper.vm.$axios.get = vi.fn().mockResolvedValue({ data: ['modems'] })
    const res = await wrapper.vm.afterLoad(form)
    expect(res).toEqual({ mqtt: [{ password: 'set', psk: 'set' }] })
    expect(wrapper.vm.modems).toEqual(['modems'])
  })
  it.each`
    isValid  | val
    ${false} | ${'ab#cd+'}
    ${false} | ${'ab#cd'}
    ${true}  | ${'abcd'}
  `('returns isValid $isValid when validating prefix with value $val', ({ isValid, val }) => {
    const wrapper = createWrapper(MqttPub)
    const res = wrapper.vm.validatePrefix(val)
    expect(res.isValid).toBe(isValid)
  })
})
