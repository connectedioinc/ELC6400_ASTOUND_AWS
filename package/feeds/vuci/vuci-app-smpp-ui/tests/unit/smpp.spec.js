import Smpp from '../../src/views/services/Smpp.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Smpp.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Smpp)
  })
  const form = { smpp: [{ password: 'set' }] }

  it('loadData loads modem data', async () => {
    wrapper.vm.$mobile.modemsOptions = vi.fn(val => val)
    wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ success: true, data: ['modems'] })
    const res = await wrapper.vm.loadData(form)
    expect(wrapper.vm.modemList).toEqual(['modems'])
    expect(res).toEqual({ smpp: [{ password: 'set' }] })
  })

  it('invokes error message', async () => {
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load modem options.')
  })
})
