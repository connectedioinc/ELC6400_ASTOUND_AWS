import NetworkUsage from '../../src/views/status/NetworkUsage.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('NetworkUsage tests', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(NetworkUsage)
  })
  it.each`
    interfaces                                                                            | result
    ${[]}                                                                                 | ${[]}
    ${[{ status: true, ip: '192.168.1.1/32' }]}                                           | ${[{ status: true, ip: '192.168.1.1/32' }]}
    ${[{ status: false, ip: '192.168.1.1/32' }]}                                          | ${[]}
    ${[{ status: true, ip: '192.168.1.1/32' }, { status: true, ip: '192.168.1.2/32' }]}   | ${[{ status: true, ip: '192.168.1.1/32' }, { status: true, ip: '192.168.1.2/32' }]}
    ${[{ status: true, ip: '192.168.1.1/32' }, { status: false, ip: '192.168.1.2/32' }]}  | ${[{ status: true, ip: '192.168.1.1/32' }]}
    ${[{ status: false, ip: '192.168.1.1/32' }, { status: false, ip: '192.168.1.2/32' }]} | ${[]}
  `('activeInterfaces computed test', ({ interfaces, result }) => {
    wrapper.vm.interfaces = interfaces
    expect(wrapper.vm.activeInterfaces).toEqual(result)
  })
  it.each`
    interfaces                                                                                                                                    | result
    ${[]}                                                                                                                                         | ${[]}
    ${[{ status: true, ip: '192.168.1.1/32' }]}                                                                                                   | ${['192.168.1.1']}
    ${[{ status: true, ipv6: '0:0:0:0:0:0:0:0/32' }]}                                                                                             | ${['0:0:0:0:0:0:0:0']}
    ${[{ status: true, ipv6: '0:0:0:0:0:0:0:0/32', ip: '192.168.1.1/32' }]}                                                                       | ${['192.168.1.1', '0:0:0:0:0:0:0:0']}
    ${[{ status: true, ipv6: '0:0:0:0:0:0:0:0/32', ip: '192.168.1.1/32' }, { status: true, ipv6: '1:0:0:0:0:0:0:0/32', ip: '192.168.1.2/32' }]}   | ${['192.168.1.1', '0:0:0:0:0:0:0:0', '192.168.1.2', '1:0:0:0:0:0:0:0']}
    ${[{ status: false, ip: '192.168.1.1/32' }]}                                                                                                  | ${[]}
    ${[{ status: false, ip: '192.168.1.1/32' }, { status: true, ip: '192.168.1.2/32' }]}                                                          | ${['192.168.1.2']}
    ${[{ status: false, ip: '192.168.1.1/32' }, { status: false, ip: '192.168.1.2/32' }]}                                                         | ${[]}
    ${[{ status: false, ip: '192.168.1.1/32' }]}                                                                                                  | ${[]}
    ${[{ status: true, ipv6: '0:0:0:0:0:0:0:0/32', ip: '192.168.1.1/32' }, { status: true, ip: '192.168.1.2/32' }]}                               | ${['192.168.1.1', '0:0:0:0:0:0:0:0', '192.168.1.2']}
    ${[{ status: false, ipv6: '0:0:0:0:0:0:0:0/32', ip: '192.168.1.1/32' }, { status: false, ipv6: '1:0:0:0:0:0:0:0/32', ip: '192.168.1.2/32' }]} | ${[]}
  `('interfacesIp computed test', ({ interfaces, result }) => {
    wrapper.vm.interfaces = interfaces
    expect(wrapper.vm.interfacesIp).toEqual(result)
  })
  it.each`
    topologyScanned | data                                                                                                                                                                                | commonFields | fieldsToSum  | result
    ${true}         | ${[{ src_ip: '192.168.1.1', key1: 'val1', key2: 'val2', bytes: 1, hostname: 'hostname1' }]}                                                                                         | ${['key1']}  | ${['bytes']} | ${[{ src_ip: '192.168.1.1', bytes: 1, key1: 'val1', key2: 'val2', active: '1', hostname: 'hostname1' }]}
    ${true}         | ${[{ src_ip: '192.168.1.1', key1: 'val1', key2: 'val2', bytes: 1 }, { src_ip: '192.168.1.1', key1: 'val1', key2: 'val2', bytes: 1, hostname: 'hostname1' }]}                        | ${['key1']}  | ${['bytes']} | ${[{ src_ip: '192.168.1.1', bytes: 2, key1: 'val1', key2: 'val2', active: '1' }]}
    ${false}        | ${[{ src_ip: '192.168.1.1', key1: 'val1', key2: 'val2', bytes: 1, hostname: 'hostname1' }, { src_ip: '192.168.1.1', key1: 'val1', key2: 'val2', bytes: 1, hostname: 'hostname1' }]} | ${['key1']}  | ${['bytes']} | ${[{ src_ip: '192.168.1.1', bytes: 2, key1: 'val1', key2: 'val2', active: '1', hostname: 'hostname1' }]}
    ${true}         | ${[{ src_ip: '192.168.1.2', key1: 'val1', key2: 'val2', bytes: 1 }, { src_ip: '192.168.1.2', key1: 'val1', key2: 'val2', bytes: 1 }]}                                               | ${['key1']}  | ${['bytes']} | ${[{ src_ip: '192.168.1.2', bytes: 2, key1: 'val1', key2: 'val2' }]}
    ${false}        | ${[{ src_ip: '192.168.1.2', key1: 'val1', key2: 'val2', bytes: 1 }, { src_ip: '192.168.1.2', key1: 'val1', key2: 'val2', bytes: 1 }]}                                               | ${['key1']}  | ${['bytes']} | ${[{ src_ip: '192.168.1.2', bytes: 2, key1: 'val1', key2: 'val2', active: '2' }]}
    ${true}         | ${[{ src_ip: '192.168.1.2', key1: 'val1', key2: 'val2', bytes: 1 }, { src_ip: '192.168.1.2', key1: 'val1', key2: 'val2', bytes: 1 }]}                                               | ${['key1']}  | ${['bytes']} | ${[{ src_ip: '192.168.1.2', bytes: 2, key1: 'val1', key2: 'val2' }]}
    ${true}         | ${[{ src_ip: '192.168.1.2', key1: 'val1', key2: 'val2', bytes: 1, active: '0' }, { src_ip: '192.168.1.2', key1: 'val1', key2: 'val2', bytes: 1 }]}                                  | ${['key1']}  | ${['bytes']} | ${[{ src_ip: '192.168.1.2', bytes: 2, key1: 'val1', key2: 'val2', active: '0' }]}
  `('formatData method test', ({ topologyScanned, data, commonFields, fieldsToSum, result }) => {
    wrapper.vm.interfaces = [{ status: true, ip: '192.168.1.1/32' }]
    wrapper.vm.topologyScanned = topologyScanned
    wrapper.vm.devices = [{ ip: '192.168.1.1', mac: '0:0:0:0' }]
    const res = wrapper.vm.formatData(data, commonFields, fieldsToSum)
    expect(res).toEqual(result)
  })
  it.each`
    globalSettingsRes                                 | scanHistoryRes                 | topologyStatusRes              | error
    ${{ success: true, data: {} }}                    | ${{ success: true, data: {} }} | ${{ success: true, data: {} }} | ${false}
    ${{ success: true, data: { save_history: '0' } }} | ${{ success: true, data: {} }} | ${{ success: true, data: {} }} | ${false}
    ${{ success: true, data: { save_history: '1' } }} | ${{ success: true, data: {} }} | ${{ success: true, data: {} }} | ${false}
    ${{ success: false }}                             | ${{ success: true, data: {} }} | ${{ success: true, data: {} }} | ${'Failed to load global settings data'}
    ${{ success: true, data: {} }}                    | ${{ success: false }}          | ${{ success: true, data: {} }} | ${'Failed to load topology scan data'}
    ${{ success: true, data: {} }}                    | ${{ success: true, data: {} }} | ${{ success: false }}          | ${'Failed to load topology status data'}
  `('initLoad method errors test', async ({ globalSettingsRes, scanHistoryRes, topologyStatusRes, error }) => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValue([globalSettingsRes, scanHistoryRes, topologyStatusRes])
    await wrapper.vm.initLoad()
    if (!error) expect(spy).not.toHaveBeenCalledWith(error)
    else expect(spy).toHaveBeenCalledWith(error)
  })
  it.each`
    globalSettingsRes                                               | scanHistoryRes                               | topologyStatusRes              | totalUsageIntervalDisabled | globalSettingsForm                     | topologyScanned
    ${{ success: true, data: { enabled: '1', save_history: '0' } }} | ${{ success: true, data: [] }}               | ${{ success: true, data: {} }} | ${true}                    | ${{ enabled: '1', save_history: '0' }} | ${false}
    ${{ success: true, data: { enabled: '1', save_history: '1' } }} | ${{ success: true, data: [] }}               | ${{ success: true, data: {} }} | ${false}                   | ${{ enabled: '1', save_history: '1' }} | ${false}
    ${{ success: true, data: { enabled: '0', save_history: '0' } }} | ${{ success: true, data: [] }}               | ${{ success: true, data: {} }} | ${true}                    | ${{ enabled: '0', save_history: '0' }} | ${false}
    ${{ success: true, data: { enabled: '0', save_history: '1' } }} | ${{ success: true, data: [] }}               | ${{ success: true, data: {} }} | ${false}                   | ${{ enabled: '0', save_history: '1' }} | ${false}
    ${{ success: true, data: {} }}                                  | ${{ success: true, data: ['res1', 'res2'] }} | ${{ success: true, data: {} }} | ${false}                   | ${{}}                                  | ${true}
  `('initLoad method data assignments test', async ({ globalSettingsRes, scanHistoryRes, topologyStatusRes, totalUsageIntervalDisabled, globalSettingsForm, topologyScanned }) => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValue([globalSettingsRes, scanHistoryRes, topologyStatusRes])
    wrapper.vm.totalUsageIntervalDisabled = false
    await wrapper.vm.initLoad()
    expect(wrapper.vm.totalUsageIntervalDisabled).toBe(totalUsageIntervalDisabled)
    expect(wrapper.vm.globalSettingsForm).toEqual(globalSettingsForm)
    expect(wrapper.vm.topologyScanned).toEqual(topologyScanned)
  })
  it.each`
    connectionsRes                 | usageRes                       | error
    ${{ success: true, data: {} }} | ${{ success: true, data: {} }} | ${false}
    ${{ success: false }}          | ${{ success: true, data: {} }} | ${'Failed to load connections data'}
    ${{ success: true, data: {} }} | ${{ success: false }}          | ${'Failed to load data usage data'}
  `('getConnectionsAndUsage method test', async ({ connectionsRes, usageRes, error }) => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValue([connectionsRes, usageRes])
    await wrapper.vm.getConnectionsAndUsage()
    if (!error) expect(spy).not.toHaveBeenCalledWith(error)
    else expect(spy).toHaveBeenCalledWith(error)
  })
  it.each`
    connectionsRes                 | usageRes                       | error
    ${{ success: true, data: {} }} | ${{ success: true, data: {} }} | ${false}
    ${{ success: false }}          | ${{ success: true, data: {} }} | ${'Failed to load connections data'}
    ${{ success: true, data: {} }} | ${{ success: false }}          | ${'Failed to load data usage data'}
  `('getConnectionsAndUsage method test', async ({ connectionsRes, usageRes, error }) => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValue([connectionsRes, usageRes])
    await wrapper.vm.getConnectionsAndUsage()
    if (!error) expect(spy).not.toHaveBeenCalledWith(error)
    else expect(spy).toHaveBeenCalledWith(error)
  })
  it.each`
    connectionsRes                                           | usageRes                       | firstLoad | connectionsHistory                        | res
    ${{ success: true, data: { 1: ['res1'] } }}              | ${{ success: true, data: {} }} | ${true}   | ${{ last: ['res1'], previous: ['res2'] }} | ${{ last: ['res1'], previous: ['res2'] }}
    ${{ success: true, data: { 1: ['res1'], 2: ['res2'] } }} | ${{ success: true, data: {} }} | ${false}  | ${{ last: ['res1'], previous: ['res2'] }} | ${{ last: ['res2'], previous: ['res1'] }}
  `('getConnectionsAndUsage method data assignments test', async ({ connectionsRes, usageRes, firstLoad, connectionsHistory, res }) => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValue([connectionsRes, usageRes])
    wrapper.vm.firstLoad = firstLoad
    wrapper.vm.connectionsHistory = connectionsHistory
    await wrapper.vm.getConnectionsAndUsage()
    expect(wrapper.vm.connectionsHistory).toEqual(res)
  })
  it.each`
    globalSettingsForm                     | mockResolvedRejected   | response                                                        | totalUsageIntervalDisabled | totalUsageInterval
    ${{ enabled: '1', save_history: '0' }} | ${'mockResolvedValue'} | ${{ success: true, data: { enabled: '1', save_history: '0' } }} | ${true}                    | ${'day'}
    ${{ enabled: '1', save_history: '1' }} | ${'mockResolvedValue'} | ${{ success: true, data: { enabled: '1', save_history: '1' } }} | ${false}                   | ${'month'}
    ${{ enabled: '1', save_history: '1' }} | ${'mockRejectedValue'} | ${{ success: false }}                                           | ${false}                   | ${'month'}
  `('saveGlobalSettings method data assignments test', async ({ globalSettingsForm, mockResolvedRejected, response, totalUsageIntervalDisabled, totalUsageInterval }) => {
    const spySuccess = vi.spyOn(wrapper.vm.$message, 'success')
    const spyError = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$timer.restart = vi.fn()
    wrapper.vm.globalSettingsForm = globalSettingsForm
    wrapper.vm.$axios.put = vi.fn()
    wrapper.vm.$axios.put[mockResolvedRejected](response)
    wrapper.vm.totalUsageInterval = 'month'
    await wrapper.vm.saveGlobalSettings()
    expect(wrapper.vm.totalUsageInterval).toEqual(totalUsageInterval)
    expect(wrapper.vm.totalUsageIntervalDisabled).toEqual(totalUsageIntervalDisabled)
    if (response.success) {
      expect(spyError).toBeCalledTimes(0)
      expect(spySuccess).toBeCalledTimes(1)
      expect(spySuccess).toHaveBeenCalledWith('Configuration has been applied')
    } else {
      expect(spySuccess).toBeCalledTimes(0)
      expect(spyError).toBeCalledTimes(1)
      expect(spyError).toHaveBeenCalledWith('Failed to edit configuration')
    }
  })
  it.each`
    devices                                                                                         | result
    ${[]}                                                                                           | ${[]}
    ${[{ ip: '192.168.1.1' }]}                                                                      | ${[{ ip: '192.168.1.1' }]}
    ${[{ ip: '192.168.1.1' }, { ip: '192.168.1.2' }]}                                               | ${[{ ip: '192.168.1.1' }, { ip: '192.168.1.2' }]}
    ${[{ ip: '192.168.1.1' }, { ip: '192.168.1.1' }]}                                               | ${[{ ip: '192.168.1.1' }]}
    ${[{ ip: '192.168.1.1' }, { ip: '192.168.1.1' }, { ip: '192.168.1.2' }, { ip: '192.168.1.2' }]} | ${[{ ip: '192.168.1.1' }, { ip: '192.168.1.2' }]}
  `('mapDevices method test', ({ devices, result }) => {
    const res = wrapper.vm.mapDevices(devices)
    expect(res).toEqual(result)
  })
})
