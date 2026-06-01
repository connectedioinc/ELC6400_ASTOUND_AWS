import Bacnet from '../../src/views/services/Bacnet.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Bacnet tests', () => {
  it.each([
    [
      [
        { success: true, data: [{ name: 'test', up: true }] },
        { success: true, data: { board: { serial: [{ devices: ['rs485'], test: 'test' }, { devices: ['rs243'] }] } } }
      ],
      ['test'],
      [{ devices: ['rs485'], test: 'test' }, { devices: ['rs243'] }]
    ],
    [[{ success: false, data: [{ name: 'test' }] }, { success: false, data: { board: { serial: [{ devices: ['rs485'], test: 'test' }, { devices: ['rs243'] }] } } }, { success: false }], [], []]
  ])('loads data', async (data, devices, serials) => {
    const wrapper = createWrapper(Bacnet)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(data)
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.deviceOptions).toEqual(devices)
    expect(wrapper.vm.formOptions.serial).toEqual(serials)
  })
  it('invokes error message', async () => {
    const wrapper = createWrapper(Bacnet)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
})
