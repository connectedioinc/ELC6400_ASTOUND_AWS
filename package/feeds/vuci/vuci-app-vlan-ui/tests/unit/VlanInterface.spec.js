import VlanInterface from '../../src/views/network/VlanInterface.vue'
import createWrapper from '@tests/unit/mockFactory'
describe('VlanInterfaces.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(VlanInterface)
  })
  it.each([
    { input: '8021ad', result: '802.1AD' },
    { input: '8021q', result: '802.1Q' },
    { input: 'ss', result: '-' }
  ])('change type display value', ({ input, result }) => {
    expect(wrapper.vm.displayType(input)).toEqual(result)
  })
  it.each([
    { input: 'test', result: 'test' },
    { input: 'l2v3_test', result: 'L2TPv3_test' }
  ])('change interface display value', ({ input, result }) => {
    expect(wrapper.vm.displayInterface(input)).toEqual(result)
  })
  it.each([
    { name: 'test', sections: [{ name: 'test' }], expectedResult: { isValid: false, message: "Name 'test' is already in use" } },
    { name: 'test', sections: [], expectedResult: { isValid: true } },
    { name: 'eth', sections: [{ name: 'test' }], expectedResult: { isValid: false, message: "Name 'eth' is already in use" } },
    { name: 'test2', sections: [{ name: 'test' }], expectedResult: { isValid: true } },
    { name: '100', sections: [{ name: 'test' }], expectedResult: { isValid: false, message: 'Value must contain a single letter' } }
  ])('validate add section ', ({ name, sections, expectedResult }) => {
    wrapper.setData({
      formData: {
        device: sections
      },
      formOptions: {
        networkDevices: [{ name: 'eth' }],
        QinQDevices: [{ name: '1' }]
      }
    })
    const result = wrapper.vm.validateName(name)
    expect(result).toEqual(expectedResult)
  })

  it('fail then loading data', async () => {
    const form = { device: [] }
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData(form)
    expect(spy).toHaveBeenCalled()
  })
  it('fail on device and l2tpv3 loads', async () => {
    const form = { device: [] }
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([{}, {}, { success: true, data: [] }, { success: true, data: ['test'] }])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData(form)
    expect(spy).toBeCalledTimes(2)
  })
  it('fail on Q-in-Q devices load', async () => {
    const form = { device: [{ id: 'test' }] }
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: true, data: [] }, { success: true, data: [] }, { success: true, data: [] }, {}])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData(form)
    expect(spy).toBeCalledTimes(1)
  })
  it('successfully load data', async () => {
    const form = { device: [{ id: 'test' }] }
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: ['test'] }
    ])
    const result = await wrapper.vm.loadData(form)
    expect(result).toEqual({ test_qDevices: ['test'] })
  })
  it('remove Q-in-Q devices from uciData on parent device delete', () => {
    wrapper.setData({
      formData: {
        test_qDevices: [
          { test: 'test', name: 'q1' },
          { test: 'test', name: 'q2' }
        ]
      },
      formOptions: {
        networkDevices: [
          { type: '8021q', name: 'q1' },
          { type: '8021ad', name: 'q2' },
          { type: '8021ad', name: 'q3' },
          { type: '8021ad', name: 'lan' },
          { type: '8021q', name: 'lo' }
        ]
      }
    })
    const section = { id: 'test', name: 'q3' }
    wrapper.vm.deleteQnQ(section)
    expect(wrapper.vm.formOptions.networkDevices).toEqual([
      { type: '8021ad', name: 'lan' },
      { type: '8021q', name: 'lo' }
    ])
    expect(wrapper.vm.formData).toEqual({})
  })
  it('invoke used parent interface create error ', () => {
    const res = wrapper.vm.handleCreateErrors({
      data: { errors: [{ code: 106 }] }
    })
    expect(res).toBe("Can't create interface based VLAN. All parent interfaces are used")
  })
  it('invoke default create error ', () => {
    const res = wrapper.vm.handleCreateErrors({
      data: {}
    })
    expect(res).toBe('Failed to create configuration')
  })
})
