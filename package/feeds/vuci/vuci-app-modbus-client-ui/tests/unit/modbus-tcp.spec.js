import ModbusTCP from '../../src/views/services/ModbusTCP.vue'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

describe('ModbusTCP overview tests', () => {
  it('returns form options', () => {
    const wrapper = createWrapper(ModbusTCP)
    const val = wrapper.vm.getFormOptions()
    expect(val).toEqual({ io: [], certificates: [], deviceList: [], phoneGroups: [], emailUsers: [], mounts: [], sourcedRegisters: [], tagStatus: {}, dbSizesInPages: {} })
  })
  const fakeSponse = [
    {
      success: true,
      data: ['io']
    },
    {
      success: true,
      data: { generated: ['1'] }
    },
    {
      success: true,
      data: ['test2']
    },
    {
      success: true,
      data: { enabled: '1' }
    },
    {
      success: true,
      data: [{}]
    },
    {
      success: true,
      data: []
    },
    {
      success: true,
      data: ['test2']
    },
    {
      success: true,
      data: []
    },
    {
      success: true,
      data: {}
    },
    {
      success: true,
      data: ['1']
    },
    {
      success: true,
      data: ['2']
    }
  ]
  const fakeSponseFalse = [
    {
      success: false,
      data: ['io']
    },
    {
      success: false,
      data: { enabled: '1' }
    },
    {
      success: false,
      data: [{}]
    },
    {
      success: false,
      data: []
    },
    {
      success: false,
      data: ['test2']
    },
    {
      success: false,
      data: []
    },
    {
      success: false,
      data: {}
    },
    {
      success: false,
      data: ['1']
    },
    {
      success: false,
      data: ['2']
    }
  ]
  it.each([
    [{ modbusTcpClient: [{ id: 'test' }] }, fakeSponse, { test_alarm: ['1'], test_request: ['2'] }, 0],
    [{ modbusTcpClient: [{ id: 'test' }] }, fakeSponseFalse, {}, 9]
  ])('loads data', async (value, response, uciData, error) => {
    const wrapper = createWrapper(ModbusTCP)
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce(response)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const val = await wrapper.vm.loadData(value)
    expect(val).toEqual(uciData)
    expect(spy).toHaveBeenCalledTimes(error)
  })
  it('check if first load is set', async () => {
    const wrapper = createWrapper(ModbusTCP)
    wrapper.vm.$options.watch['globalEnabled.globalStatus'].call(wrapper.vm, true)
    expect(wrapper.vm.stateChanged).toBe(true)
  })
  it('check if state change is not set during first load', async () => {
    const wrapper = createWrapper(ModbusTCP)
    wrapper.vm.$options.watch['globalEnabled.globalStatus'].call(wrapper.vm, true, 'firstLoad')
    expect(wrapper.vm.stateChanged).toBe(false)
  })
  it('check if message is shown', async () => {
    const wrapper = createWrapper(ModbusTCP)
    const spyOn = vi.spyOn(wrapper.vm.$notification, 'info')
    wrapper.vm.stateChanged = true
    wrapper.vm.globalEnabled.globalStatus = false
    wrapper.vm.$options.watch.modalOpen.call(wrapper.vm, false)
    expect(spyOn).toHaveBeenCalledTimes(1)
  })
  it('check if message is removed', async () => {
    const wrapper = createWrapper(ModbusTCP)
    const spyOn = vi.spyOn(wrapper.vm.$notification, 'remove')
    wrapper.vm.stateChanged = true
    wrapper.vm.globalEnabled.globalStatus = true
    wrapper.vm.$options.watch.modalOpen.call(wrapper.vm, false)
    expect(spyOn).toHaveBeenCalledTimes(1)
  })
  it('invokes error message', async () => {
    const wrapper = createWrapper(ModbusTCP)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData({ modbusTcpClient: [{ '.name': 'test' }] })
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('deletes local storage after parent delete', () => {
    const wrapper = createWrapper(ModbusTCP)
    wrapper.vm.formData = { '1_request': ['test'], '1_alarm': ['test'] }
    wrapper.vm.removeChildren({ id: '1' })
    expect(wrapper.vm.formData).toEqual({ '1_request': [], '1_alarm': [] })
  })
  it.each([
    [{}, '-'],
    [{ frequency: 'period', period: '10' }, '10'],
    [{ frequency: 'schedule', schedule: ['1:1:1'] }, '1:1:1'],
    [{ frequency: 'schedule', period: '10', schedule: ['1:1:1'] }, '1:1:1'],
    [{ frequency: 'schedule', schedule: ['1:1:1', '2:2:2'] }, '1:1:1, 2:2:2'],
    [{ frequency: 'schedule', schedule: ['1:1:1', '2:2:2', '3:3:3'] }, '1:1:1, 2:2:2, ...']
  ])('returns correct display frequency', (section, expected) => {
    const wrapper = createWrapper(ModbusTCP)
    expect(wrapper.vm.displayFrequency(section)).toEqual(expected)
  })
})
