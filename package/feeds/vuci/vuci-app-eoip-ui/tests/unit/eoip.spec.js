import Eoip from '../../src/views/services/Eoip.vue'
import EoipEdit from '../../src/views/services/EoipEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
import { ref } from 'vue'
import { axios } from '@ui-core/plugins/axios'

describe('Eoip.vue', () => {
  const responseSuccess = { success: true, data: [{ test: 'test' }] }

  it('afterLoad response error', async () => {
    const wrapper = createWrapper(Eoip)
    vi.spyOn(axios, 'get').mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load bridge options')
  })
  it('afterLoad response success', async () => {
    const wrapper = createWrapper(Eoip)
    vi.spyOn(axios, 'get').mockResolvedValueOnce(responseSuccess)
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.bridges).toEqual([{ test: 'test' }])
  })
})
describe('EoipEdit.vue', () => {
  it.each`
    bridges                                                                           | result
    ${[{ id: 'i1', name: 'd1', bridge: '1' }]}                                        | ${[['none', 'None'], ['i1', 'd1']]}
    ${[{ id: 'i1', name: 'd1', bridge: '1' }, { id: 'i2', name: 'd2', bridge: '1' }]} | ${[['none', 'None'], ['i1', 'd1'], ['i2', 'd2']]}
    ${[]}                                                                             | ${[['none', 'None']]}
  `('bridgeOptions computed', ({ bridges, result }) => {
    const wrapper = createWrapper(EoipEdit, {
      global: {
        provide: {
          bridges: ref(bridges)
        }
      },
      props: { section: {} }
    })
    expect(wrapper.vm.bridgeOptions).toEqual(result)
  })
})
