import HTTPS from '../../src/views/services/HTTPS'
import createWrapper from '@tests/unit/mockFactory'

const gpioTavlRule = {
  id: 'one',
  type: 'gpio',
  enabled: '0',
  direction: 'in',
  name_with_pins: 'One (1)'
}

const adcTavlRule = {
  id: 'two',
  type: 'adc',
  enabled: '0',
  direction: 'out',
  name_with_pins: 'Two (2)'
}

const aclTavlRule = {
  id: 'three',
  type: 'acl',
  enabled: '1',
  state: 'active',
  name_with_pins: 'Three (3)'
}

const ioResponse = [gpioTavlRule, adcTavlRule, aclTavlRule]

describe('HTTPS.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(HTTPS)
  })
  it('skips api call', async () => {
    wrapper.vm.$store.board.hwinfo.ios = false
    const spy = vi.spyOn(wrapper.vm.$axios, 'get')
    expect(spy).toHaveBeenCalledTimes(0)
  })
  it('loads name form names array, otherwise capitalizes it', () => {
    wrapper.setData({ ioInfo: [{ id: 'name', name_with_pins: 'Beauty' }] })
    wrapper.vm.$capitalize = () => 'Aaa'
    expect(wrapper.vm.loadName('name')).toEqual('Beauty')
    expect(wrapper.vm.loadName('aaa')).toEqual('Aaa')
  })
  it('displays error message when request fails', async () => {
    wrapper.vm.$store.board.hwinfo.ios = true
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load I/O data')
  })
  it('returns TavlType in uppercase', () => {
    expect(wrapper.vm.loadTavlType('word')).toEqual('WORD')
  })

  describe('isTavlReadonly()', () => {
    it('check if adc is readonly', async () => {
      const readonly = wrapper.vm.isTavlReadonly(ioResponse, adcTavlRule)
      expect(readonly).toEqual(true)
    })
    it('check if adc is NOT readonly', async () => {
      aclTavlRule.status = 'inactive'
      const readonly = wrapper.vm.isTavlReadonly(ioResponse, adcTavlRule)
      expect(readonly).toEqual(true)
    })
  })
})
