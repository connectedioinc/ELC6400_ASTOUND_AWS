import { flushPromises } from '@vue/test-utils'
import PortSettings from '../../src/views/network/PortSettings.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('PortSettings.vue', () => {
  const wrapperOptions = { global: { Ports: { template: '<div />' } } }
  const configData = [{ id: '_lan1', duplex: 'full', autoneg: 'on' }]
  const statusData = [
    { id: '_lan1', name: 'LAN', num: '2', position: '1', state: 'up' },
    { id: '_lan4', name: 'WAN', num: '5', position: '4', state: 'up' }
  ]
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(PortSettings, wrapperOptions)
  })
  it('loads data and starts timer', async () => {
    await flushPromises()
    expect(wrapper.vm.$timer.start).toBeCalled()
  })

  describe('loadData()', () => {
    it('loads data on success', async () => {
      vi.spyOn(wrapper.vm.$axios, 'bulkGet').mockResolvedValue([
        { success: true, data: configData },
        { success: true, data: statusData }
      ])
      await wrapper.vm.getData()
      expect(wrapper.vm.portConfig).toEqual(configData)
      expect(wrapper.vm.portStatus).toEqual(statusData)
    })
    it('shows error', async () => {
      vi.spyOn(wrapper.vm.$axios, 'bulkGet').mockResolvedValue([{ success: false }, { success: false }])
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.getData()
      expect(spy).toBeCalledTimes(2)
    })
    it('shows error', async () => {
      vi.spyOn(wrapper.vm.$axios, 'bulkGet').mockRejectedValue()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.getData()
      expect(spy).toBeCalledWith('An unexpected error occurred')
    })
  })

  describe('getStatusData()', () => {
    it('loads status data on success when data is $data and dsa is $dsa', async () => {
      vi.spyOn(wrapper.vm.$axios, 'get').mockResolvedValue({ data: statusData })
      await wrapper.vm.getStatusData()
      expect(wrapper.vm.portStatus).toEqual(statusData)
    })
    it('shows error', async () => {
      vi.spyOn(wrapper.vm.$axios, 'get').mockRejectedValue()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.getStatusData()
      expect(spy).toBeCalledWith('Failed to load ports status')
    })
  })

  it.each`
    portStatus                          | isPoe    | expectedResult
    ${[{ id: '_lan1', budget: '0' }]}   | ${true}  | ${'-'}
    ${[{ id: '_lan1', budget: '0' }]}   | ${false} | ${''}
    ${[{ id: '_lan1', budget: '100' }]} | ${true}  | ${'0.1 W'}
  `('returns port PoE status text #%#', ({ portStatus, isPoe, expectedResult }) => {
    wrapper.vm.portStatus = portStatus
    vi.spyOn(wrapper.vm.$store, 'isPoe').mockReturnValue(isPoe)
    expect(wrapper.vm.getPortPoePower('_lan1')).toEqual(expectedResult)
  })

  it('returns port data #1', () => {
    const hintData = {
      title: 'LAN1',
      info: 'Enabled'
    }
    wrapper.vm.portStatus = [{ id: '_lan1', speed: '10', power: '1', enabled: '1' }]
    wrapper.vm.$store.isPoe.mockReturnValue(true)
    vi.spyOn(wrapper.vm.$ports, 'getRutPortHint').mockReturnValue(hintData)
    expect(wrapper.vm.getPortData('_lan1')).toEqual({
      hint: hintData,
      type: 'up',
      speed: '10',
      poe: 'active',
      error: null
    })
  })
  it('returns port data #2', () => {
    const hintData = {
      title: 'LAN1',
      info: 'Enabled'
    }
    wrapper.vm.portStatus = [{ id: '_lan1', speed: '1000', power: '0', enabled: '1' }]
    vi.spyOn(wrapper.vm.$ports, 'getRutPortHint').mockReturnValue(hintData)
    wrapper.vm.$store.isPoe.mockReturnValue(false)
    expect(wrapper.vm.getPortData('_lan1')).toEqual({
      hint: hintData,
      type: 'up',
      speed: '1000',
      poe: 'none',
      error: null
    })
  })

  describe('tableData()', () => {
    it.each`
      status                                                                                                               | config               | res
      ${[]}                                                                                                                | ${[]}                | ${[]}
      ${[{ id: '_lan1', enabled: '1', num: 1, state: 'up', name: 'LAN', position: '1', duplex: 'true', speed: '1000' }]}   | ${[{ id: '_lan1' }]} | ${[{ duplex: 'Full-Duplex', id: '_lan1', link: 'Connected', name: 'LAN', speed: 'GbE' }]}
      ${[{ id: '_wan5', enabled: '1', num: 1, state: 'down', name: 'WAN', position: '5', duplex: 'false', speed: '100' }]} | ${[{ id: '_wan5' }]} | ${[{ duplex: '-', id: '_wan5', link: 'Disconnected', name: 'LAN', speed: 'FE' }]}
      ${[{ id: '_lan1', enabled: '0', num: 1, state: 'up', name: 'LAN', duplex: 'false', speed: '10' }]}                   | ${[{ id: '_lan1' }]} | ${[{ duplex: 'Half-Duplex', id: '_lan1', link: 'Disabled', name: 'LAN', speed: 'E' }]}
    `('computes table data when status is $status and config is $config #%#', ({ status, config, res }) => {
      vi.spyOn(wrapper.vm.$ports, 'getPrettyPortId').mockReturnValue('LAN')
      wrapper.vm.portStatus = status
      wrapper.vm.portConfig = config
      expect(wrapper.vm.tableData).toEqual(res)
    })
  })
})
