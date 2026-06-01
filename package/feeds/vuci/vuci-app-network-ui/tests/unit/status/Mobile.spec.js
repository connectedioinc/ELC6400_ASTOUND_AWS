import createWrapper from '@tests/unit/mockFactory'
import Mobile from '../../../src/views/status/Mobile.vue'

describe('Mobile.vue', () => {
  const mocks = {
    $mobile: {
      limitedService: () => false,
      connectedTo3g: () => false,
      connectedTo4g5g: () => true,
      modemOffline: () => false,
      getFrequencyName: () => 'EARFCN',
      getSimstate: () => {},
      getOperatorState: () => {},
      getMobileStage: () => {},
      getConntype: () => {},
      getCA: () => {},
      getBandName: () => 'B1',
      badgeColors: () => {}
    }
  }
  let wrapper
  beforeEach(() => {
    const mockMixin = {
      methods: {
        timer: () => {}
      }
    }
    const MockedTestComponent = { ...Mobile, mixins: [mockMixin] }
    wrapper = createWrapper(MockedTestComponent, {
      global: {
        stubs: {
          'tlt-table': { template: '<div />' },
          NavigationTabs: { template: '<div />' },
          GridLayout: { template: '<div />' }
        },
        mocks
      }
    })
    wrapper.vm.$store.hasPackages = vi.fn().mockReturnValue(true)
    const na = vi.fn().mockImplementation(value => {
      return value || 'N/A'
    })
    wrapper.vm.$mobile.getOperatorState = na
    wrapper.vm.$mobile.getConntype = na
    wrapper.vm.$mobile.getDataConnState = na
    wrapper.vm.$mobile.getCA = vi.fn().mockReturnValue('Inactive')
    wrapper.vm.$mobile.getSimstate = na
    wrapper.vm.$mobile.getPinstate = na
    wrapper.vm.$mobile.getMobileStage = vi.fn().mockReturnValue('N/A')
    wrapper.vm.$mobile.shouldShowModemName = vi.fn().mockReturnValue(true)
    wrapper.vm.$mobile.getSimLabel = vi.fn().mockReturnValue('1')
    wrapper.vm.modemId = '3-1'
    wrapper.vm.$mobile.rsrpValue = vi.fn().mockReturnValue('-')
    wrapper.vm.$mobile.rsrqValue = vi.fn().mockReturnValue('-')
    wrapper.vm.$mobile.sinrValue = vi.fn().mockReturnValue('-')
    wrapper.vm.$mobile.rscpValue = vi.fn().mockReturnValue('-')
    wrapper.vm.$mobile.ecioValue = vi.fn().mockReturnValue('-')
    wrapper.vm.$mobile.getPinPukMessage = vi.fn().mockReturnValue({})
  })
  it.each`
    errorCode | errorName
    ${2}      | ${'Failed to restart connection, modem not found'}
    ${'2'}    | ${'Failed to restart connection, modem not found'}
    ${4}      | ${'Failed to restart connection, modem not ready'}
    ${1000}   | ${'An unexpected error occurred'}
  `('returns $errorName when errorCode: $errorCode', ({ errorCode, errorName }) => {
    const result = wrapper.vm.parseRebootError(errorCode)
    expect(result).toBe(errorName)
  })
  it.each`
    originalCount | newCount
    ${1}          | ${1}
    ${2}          | ${2}
    ${undefined}  | ${1}
  `('returns $newCount when originalCount: $originalCount', ({ originalCount, newCount }) => {
    wrapper.vm.modemList = [
      {
        id: '3-1',
        sim_count: originalCount
      }
    ]
    const result = wrapper.vm.simCount
    expect(result).toBe(newCount)
  })
  it.each`
    type    | ca            | res
    ${'5G'} | ${'Inactive'} | ${7}
    ${'4G'} | ${'Inactive'} | ${7}
    ${'4G'} | ${'Active'}   | ${7}
    ${'3G'} | ${''}         | ${4}
    ${'3G'} | ${''}         | ${4}
    ${'2G'} | ${''}         | ${2}
  `('returns table columns when network type: $type', ({ type, ca, res }) => {
    wrapper.vm.modemList = [{ id: '3-1', conntype: type, sc_band_av: ca }]
    wrapper.vm.$mobile.connectedTo4g5g = vi.fn().mockReturnValue(type === '4G' || type === '5G')
    wrapper.vm.$mobile.connectedTo3g = vi.fn().mockReturnValue(type === '3G')
    expect(wrapper.vm.columns.length).toBe(res)
  })
  it.each`
    pinstate          | type
    ${'PIN required'} | ${1}
    ${'PUK required'} | ${2}
  `('checks showUnblockModal params when pinstate: $pinstate', ({ pinstate, type }) => {
    wrapper.vm.modemList = [{ id: '3-1', pinstate }]
    wrapper.vm.$mobile.shouldAllowSimUnlock = vi.fn().mockReturnValue(pinstate === 'PIN required')
    wrapper.vm.showUnblockModal()
    expect(wrapper.vm.showModal).toBe(true)
    expect(wrapper.vm.modalType).toBe(type)
  })
  it.each`
    dataLimit                                                             | res
    ${[{ id: 'mob1', data_used: 500, data_limit: 1024, enabled: '1' }]}   | ${[{ name: 'mob1', value: '500 B / 1 KB', class: 'success' }]}
    ${[{ id: 'mob1', data_used: 'N/A', data_limit: 1024, enabled: '1' }]} | ${[{ name: 'mob1', value: 'N/A / 1 KB', class: '' }]}
  `('returns enabled data limits data used and limit values', ({ dataLimit, res }) => {
    wrapper.vm.modemId = '3-1'
    wrapper.vm.modemList = [{ id: '3-1', active_sim: 1 }]
    wrapper.vm.ifaceStatus = [{ modem_id: '3-1', sim: '1', is_up: true, id: 'mob1', name: 'mob1' }]
    wrapper.vm.dataLimitStatus = dataLimit
    wrapper.vm.$network.getName = vi.fn().mockImplementation(value => {
      return value.name
    })
    expect(wrapper.vm.activeDataLimits).toEqual(res)
  })
  it.each`
    modemStatus                                                            | caSignal                                 | res
    ${{ ntype: '5G-SA', cell_info: [{ arfcn: 1000, bandwidth: '100' }] }}  | ${{ bandwidth: 'N/A', frequency: 1000 }} | ${'100 MHz'}
    ${{ ntype: '5G-NSA', cell_info: [{ arfcn: 1000, bandwidth: '100' }] }} | ${{ bandwidth: 'N/A', frequency: 1000 }} | ${'100 MHz'}
    ${{ ntype: 'LTE', cell_info: [{ earfcn: 1000, bandwidth: 'N/A' }] }}   | ${{ bandwidth: '150', frequency: 1000 }} | ${'150 MHz'}
    ${{ ntype: 'LTE', cell_info: [{ earfcn: 1000, bandwidth: 'N/A' }] }}   | ${{ bandwidth: 'N/A', frequency: 1000 }} | ${'N/A'}
    ${{ ntype: 'LTE', cell_info: [{ earfcn: 0, bandwidth: '150' }] }}      | ${{ bandwidth: 'N/A', frequency: 1000 }} | ${'N/A'}
  `('returns bandwidth value when: $modemStatus', ({ modemStatus, caSignal, res }) => {
    expect(wrapper.vm.getBandwidth(modemStatus, caSignal)).toBe(res)
  })
  it.each`
    title             | variable       | modemStatus                                                                                                                                                                        | res
    ${'test'}         | ${'var'}       | ${{ id: '3-1', ntype: 'test', ca_signal: [{ var: '-' }, { var: '1' }, { var: '2' }] }}                                                                                             | ${{ label: 'test', name: 'var', value: '- / 1 / 2' }}
    ${'ARFCN'}        | ${'earfcn'}    | ${{ id: '3-1', ntype: '5G-NR', cell_info: [{ arfcn: 1000 }] }}                                                                                                                     | ${{ hint: 'Absolute radio-frequency channel number (ARFCN).', label: 'ARFCN', name: 'earfcn', value: 1000 }}
    ${'EARFCN'}       | ${'earfcn'}    | ${{ id: '3-1', ntype: 'LTE', ca_signal: [{ frequency: 1001 }] }}                                                                                                                   | ${{ hint: 'E-UTRA Absolute Radio Frequency Channel Number (EARFCN).', label: 'EARFCN', name: 'earfcn', value: '1001' }}
    ${'UARFCN'}       | ${'earfcn'}    | ${{ id: '3-1', ntype: 'WCDMA', cell_info: [{ uarfcn: 1002, arfcn: 'N/A' }] }}                                                                                                      | ${{ hint: 'UTRA Absolute Radio Frequency Channel Number (UARFCN).', label: 'UARFCN', name: 'earfcn', value: 1002 }}
    ${'test'}         | ${'pcid'}      | ${{ id: '3-1', ntype: 'test', cell_info: [{ pcid: 123 }] }}                                                                                                                        | ${{ hint: 'Physical cell ID (PCID) indicates the physical layer identity of the cell.', label: 'test', name: 'pcid', value: 123 }}
    ${'Band'}         | ${'band'}      | ${{ id: '3-1', ntype: 'LTE', band: 'LTE B1' }}                                                                                                                                     | ${{ hint: 'Currently used mobile frequency band.', label: 'Band', name: 'band', value: 'LTE B1' }}
    ${'Bandwidth'}    | ${'bandwidth'} | ${{ id: '3-1', ntype: 'LTE', bandwidth: 'N/A' }}                                                                                                                                   | ${{ hint: 'Currently used bandwidth.', label: 'Bandwidth', name: 'bandwidth', value: 'N/A' }}
    ${'Bandwidth 5G'} | ${'bandwidth'} | ${{ id: '3-1', ntype: '5G-NSA', bandwidth: '20', cell_info: [{ sinr: -5, arfcn: 154570, bandwidth: '20' }], ca_signal: [{ band: '5G N28', frequency: 154570, bandwidth: '20' }] }} | ${{ hint: 'Currently used bandwidth.', label: 'Bandwidth 5G', name: 'bandwidth', value: 'N/A' }}
  `('returns multipleRow when $modemStatus', ({ title, variable, modemStatus, res }) => {
    wrapper.vm.modemList = [modemStatus]
    wrapper.vm.getBandwidth = vi.fn().mockReturnValue('N/A')
    wrapper.vm.getCellInfo = vi.fn().mockReturnValue(modemStatus.ca_signal)
    wrapper.vm.$mobile.getBandName = vi.fn().mockImplementation(value => {
      return value || 'N/A'
    })
    const result = wrapper.vm.multipleRow(title, variable)
    expect(result).toEqual(res)
  })
  it.each`
    frequency | data                                                                                              | res
    ${1000}   | ${[{ sinr: -5, arfcn: 1000, bandwidth: '20' }, { sinr: -10, arfcn: 2000, bandwidth: '25' }]}      | ${{ sinr: -5, arfcn: 1000, bandwidth: '20' }}
    ${2000}   | ${[{ sinr: -10, 'nr-arfcn': 2000, bandwidth: '25' }, { sinr: -5, arfcn: 1000, bandwidth: '20' }]} | ${{ sinr: -10, 'nr-arfcn': 2000, bandwidth: '25' }}
  `('returns cell info object based on frequency #%#', ({ frequency, data, res }) => {
    wrapper.vm.modemList = [{ id: '3-1', cell_info: data }]
    const result = wrapper.vm.getCellInfo(frequency)
    expect(result).toEqual(res)
  })
  it('returns interface status data when request successful', async () => {
    const res = [
      { success: true, data: [{ id: 'mob1s1a1' }, { id: 'mob1s2a1' }] },
      { success: true, data: [{ network_type: 'mobile' }, { network_type: 'wired' }] }
    ]
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce(res)
    await wrapper.vm.getDataLimit()
    expect(wrapper.vm.dataLimitStatus).toEqual([{ id: 'mob1s1a1' }, { id: 'mob1s2a1' }])
    expect(wrapper.vm.ifaceStatus).toEqual([{ network_type: 'mobile' }])
  })
  it('shows error when request unsuccessful', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: false }, { success: false }])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getDataLimit()
    expect(spy).toHaveBeenCalled()
  })
  it('shows error when getCountries request is unsuccessful', async () => {
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getCountries()
    expect(spy).toHaveBeenCalledWith('Failed to load countries list')
  })
  it('returns countries list when request successful', async () => {
    wrapper.vm.countries = []
    const data = [{ country: 'Lithuania', mcc: '246' }]
    wrapper.vm.$axios.get = vi.fn().mockResolvedValue({ data })
    await wrapper.vm.getCountries()
    expect(wrapper.vm.countries).toEqual(data)
  })
  it.each`
    text                                           | ifaceStatus                                        | modemStatus                                                | dataLimitStatus                                          | simStatus                                                                     | res
    ${'all good'}                                  | ${[{ modem_id: '3-1', id: 'mob1s1a1', up: true }]} | ${{ id: '3-1' }}                                           | ${[{ id: 'mob1s1a1', data_used: 50, data_limit: 100 }]}  | ${[{ modem: '3-1', sim: 1, deny_roaming: '1' }]}                              | ${[]}
    ${'data limit reached'}                        | ${[{ modem_id: '3-1', id: 'mob1s1a1', up: true }]} | ${{ id: '3-1' }}                                           | ${[{ id: 'mob1s1a1', data_used: 100, data_limit: 100 }]} | ${[{ modem: '3-1', sim: 1, deny_roaming: '1' }]}                              | ${[{ text: 'Mobile data limit reached', to: '/network/mobile/limits/data?edit=mob1s1a1', toText: 'Data limit configuration' }]}
    ${'data turned off using Mobile utilities'}    | ${[{ modem_id: '3-1', id: 'mob1s1a1', up: true }]} | ${{ id: '3-1', data_off: true }}                           | ${[{ id: 'mob1s1a1', data_used: 50, data_limit: 100 }]}  | ${[{ modem: '3-1', sim: 1, deny_roaming: '1' }]}                              | ${[{ text: 'Mobile data is turned off by an external application' }]}
    ${'deny roaming enabled and netstate roaming'} | ${[{ modem: '3-1', id: 'mob1s1a1', up: false }]}   | ${{ id: '3-1', active_sim: 1, operator_state: 'roaming' }} | ${[{ id: 'mob1s1a1', data_used: 50, data_limit: 100 }]}  | ${[{ modem: '3-1', sim: '1', deny_roaming: '1', section_name: 'cfg01aa0e' }]} | ${[{ text: 'Mobile data is not allowed when roaming', to: '/network/mobile/general/3-1?simTab=cfg01aa0e', toText: 'Mobile configuration' }]}
    ${'flight mode is on'}                         | ${[{ modem_id: '3-1', id: 'mob1s1a1', up: true }]} | ${{ id: '3-1', mobile_stage: 23 }}                         | ${[{ id: 'mob1s1a1' }]}                                  | ${[{ modem: '3-1', sim: 1 }]}                                                 | ${[{ text: 'Mobile data is turned off because flight mode is on. To turn off flight mode, go to', to: '/network/mobile/utilities?tab=3-1', toText: 'Mobile -> Utilities' }]}
  `('checks connectionHints returned value when $text', ({ ifaceStatus, dataLimitStatus, modemStatus, simStatus, res }) => {
    wrapper.vm.ifaceStatus = ifaceStatus
    wrapper.vm.modemList = [modemStatus]
    wrapper.vm.simStatus = simStatus
    wrapper.vm.dataLimitStatus = dataLimitStatus
    wrapper.vm.$mobile.getGnssState = vi.fn().mockReturnValueOnce(false)
    expect(wrapper.vm.connectionHints).toEqual(res)
  })
  describe('getStatus()', () => {
    it('returns before request', async () => {
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.statusStarted = true
      await wrapper.vm.getStatus()
      expect(spy).not.toHaveBeenCalled()
    })
    it("doesn't show error when request doesn't throw error", async () => {
      wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
        { success: true, data: [] },
        { success: true, data: [] }
      ])
      wrapper.vm.$mobile.parseModems = vi.fn().mockReturnValueOnce([{}, {}])
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.getStatus()
      expect(spy).not.toHaveBeenCalled()
    })
    it('shows error when request throws error', async () => {
      wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.getStatus()
      expect(spy).toHaveBeenCalled()
    })
    it.each`
      deviceName  | data
      ${'RUTX'}   | ${[{ txbytes: 120078, rxbytes: 120078, pinleft: '3', rsrp: '-81', vendor: '2c7c', rscp: 'service mode not supported', pinstate: 'READY', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', ecio: 'service mode not supported', sinr: '12.7', umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, conntype: '4G (LTE)' }]}
      ${'RUTX'}   | ${[{ txbytes: 120078, rxbytes: 120078, pinleft: '3', rsrp: '-81', vendor: '2c7c', rscp: 'service mode not supported', pinstate: 'READY', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', ecio: 'service mode not supported', sinr: '12.7', umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 2, conntype: '4G (LTE)', active_sim: 2 }]}
      ${'RUTX'}   | ${[{ txbytes: 120078, rxbytes: 120078, pinleft: '3', rsrp: '-81', vendor: '2c7c', pinstate: 'READY', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', sinr: '12.7', umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, conntype: '3G (WCDMA)', ecio: '-10', rscp: '-70' }]}
      ${'RUTX'}   | ${[{ txbytes: 120078, rxbytes: 120078, pinleft: '3', rsrp: '-81', vendor: '2c7c', pinstate: 'READY', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', sinr: '12.7', umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, conntype: '3G (WCDMA)' }]}
      ${'RUTX'}   | ${[{ txbytes: 120078, rxbytes: 120078, pinleft: '3', rsrp: '-81', vendor: '2c7c', rscp: 'service mode not supported', pinstate: 'Not inserted', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', ecio: '-10', sinr: '12.7', umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, conntype: '2G (GSM)' }]}
      ${'RUTX12'} | ${[{ txbytes: 120078, rxbytes: 120078, pinleft: '3', rsrp: '-81', vendor: '2c7c', rscp: 'service mode not supported', pinstate: 'Inserted', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', ecio: 'service mode not supported', sinr: '12.7', umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 2, conntype: '2G (GSM)', rssi: '-70' }]}
      ${'TRB5'}   | ${[{ txbytes: 120078, pinleft: '3', rsrp: '-81', vendor: '2c7c', rscp: '-75', pinstate: 'READY', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', ecio: 'service mode not supported', sinr: '12.7', umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, conntype: '4G (LTE)', rssi: '-70', cell_info: 'N/A' }]}
    `('loads data on success and returns when $deviceName', async ({ deviceName, data }) => {
      wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
        {
          success: true,
          data
        },
        { success: true, data: {} }
      ])
      wrapper.vm.$store.device = deviceName
      await wrapper.vm.getStatus()
      expect(wrapper.vm.modemList).toEqual(data)
    })
    it.each`
      data                                                                                                                                                                                                                                                                  | res
      ${{ pinleft: '3', pinstate: 'READY', operator: 'Tele2 LT', operator_state: 'Registered', umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, conntype: '3G (WCDMA)', data_conn_state: 'Connected', cell_info: [{ ue_state: 3 }] }}                                 | ${[{ label: 'Operator', name: 'operator', value: 'Tele2 LT', hint: "Network operator's name." }, { label: 'Operator state', name: 'operator_state', value: 'Registered', limited: false, hint: 'Shows whether the network has currently indicated the registration of the mobile device.' }, { label: 'Data connection state', name: 'data_connection_state', hint: 'Indicates whether the device has a mobile data connection or not.', badge: { size: 'md', text: 'Connected', type: 'success' } }, { hint: 'Indicates current mobile connection stage.', label: 'Connection stage', name: 'mobile_connection_stage', value: 'N/A' }, { label: 'Network type', name: 'network_type', value: '3G (WCDMA)', hint: 'Mobile network type.' }, { label: 'IP address', name: 'ip_address', value: 'N/A', hint: 'IP address of mobile interface', ip: undefined, children: [] }, { label: 'Uptime', name: 'uptime', value: 'N/A', hint: 'Uptime of mobile interface', children: [] }]}
      ${{ pinleft: '3', pinstate: 'Inserted', operator: 'Tele2 LT', umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, conntype: '2G (GSM)', cell_info: [{ ue_state: 2 }], builtin: false, primary: false, name: 'External modem', operator_state: 'Limited service' }} | ${[{ label: 'Operator', name: 'operator', value: 'Tele2 LT', hint: "Network operator's name." }, { label: 'Operator state', name: 'operator_state', value: 'Limited service', limited: true, hint: 'Shows whether the network has currently indicated the registration of the mobile device.' }, { label: 'Data connection state', name: 'data_connection_state', hint: 'Indicates whether the device has a mobile data connection or not.', value: 'N/A' }, { hint: 'Indicates current mobile connection stage.', label: 'Connection stage', name: 'mobile_connection_stage', value: 'N/A' }, { label: 'Network type', name: 'network_type', value: '2G (GSM)', hint: 'Mobile network type.' }, { label: 'IP address', name: 'ip_address', value: 'N/A', hint: 'IP address of mobile interface', ip: undefined, children: [] }, { label: 'Uptime', name: 'uptime', value: 'N/A', hint: 'Uptime of mobile interface', children: [] }]}
      ${{ pinleft: '3', pinstate: 'Inserted', mts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, active_sim: 1, conntype: '', cell_info: [{ ue_state: 2 }], builtin: true, primary: true, name: 'Internal modem', operator_state: 'Limited service' }}                   | ${[{ label: 'Operator', name: 'operator', value: 'N/A', hint: "Network operator's name." }, { label: 'Operator state', name: 'operator_state', value: 'Limited service', limited: true, hint: 'Shows whether the network has currently indicated the registration of the mobile device.' }, { label: 'Data connection state', name: 'data_connection_state', hint: 'Indicates whether the device has a mobile data connection or not.', value: 'N/A' }, { hint: 'Indicates current mobile connection stage.', label: 'Connection stage', name: 'mobile_connection_stage', value: 'N/A' }, { label: 'Network type', name: 'network_type', value: 'N/A', hint: 'Mobile network type.' }, { label: 'IP address', name: 'ip_address', value: 'N/A', hint: 'IP address of mobile interface', ip: undefined, children: [] }, { label: 'Uptime', name: 'uptime', value: 'N/A', hint: 'Uptime of mobile interface', children: [] }]}
    `('checks returned connection data', ({ data, res }) => {
      wrapper.vm.modemList = [data]
      wrapper.vm.$mobile.limitedService = vi.fn().mockReturnValue(data.cell_info[0].ue_state === 2)
      expect(wrapper.vm.parseConnection(data)).toEqual(res)
    })
    it.each`
      mode | data | res
      ${'2G'} | ${{ bandwidth: '10', txbytes: 120078, rxbytes: 120078, pinleft: '3', rsrp: -81, vendor: '2c7c', rscp: 'service mode not supported', pinstate: 'READY', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', ecio: 'service mode not supported', sinr: 12.7, umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, conntype: '2G (EDGE)', ntype: 'EDGE' }} | ${[
  { hint: 'Currently used mobile frequency band.', label: 'Connected band', name: 'band', value: 'N/A' },
  { hint: 'Received signal strength indicator (RSSI) measured in dBm. Values closer to 0 indicate a better signal strength.', scoped: false, label: 'RSSI (dBm)', name: 'rssi', badge: undefined, value: 'N/A' },
  {
    hint: 'APN (Access Point Name) is configurable network identifier used by a mobile device when connecting to a carrier.',
    label: 'APN',
    name: 'apn',
    value: 'N/A',
    children: []
  },
  {
    hint: 'MTU (Maximum Transmission Unit) - specifies the largest possible size of a data packet.',
    label: 'MTU',
    name: 'mtu',
    value: 'N/A',
    children: []
  },
  { hint: 'Amount of data received through the mobile interface.', label: 'Data received', name: 'data_received', value: '120.08 KB' },
  { hint: 'Amount of data sent through the mobile interface.', label: 'Data sent', name: 'data_sent', value: '120.08 KB' }
]}
      ${'3G'} | ${{ bandwidth: '10', txbytes: 0, rxbytes: 0, pinleft: '3', rsrp: -81, vendor: '2c7c', rscp: 'service mode not supported', pinstate: 'READY', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', ecio: 'service mode not supported', sinr: 12.7, rssi: -110, umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, conntype: '3G (HSDPA)', ntype: 'HSDPA' }} | ${[
  { hint: 'Currently used mobile frequency band.', label: 'Connected band', name: 'band', value: 'N/A' },
  { hint: 'Received signal strength indicator (RSSI) measured in dBm. Values closer to 0 indicate a better signal strength.', scoped: true, label: 'RSSI (dBm)', name: 'rssi', badge: { text: -110, customColor: 'bg-red-800', value: 'Very poor' }, value: undefined },
  {
    hint: 'APN (Access Point Name) is configurable network identifier used by a mobile device when connecting to a carrier.',
    label: 'APN',
    name: 'apn',
    value: 'N/A',
    children: []
  },
  {
    hint: 'MTU (Maximum Transmission Unit) - specifies the largest possible size of a data packet.',
    label: 'MTU',
    name: 'mtu',
    value: 'N/A',
    children: []
  },
  { hint: 'Amount of data received through the mobile interface.', label: 'Data received', name: 'data_received', value: '0 B' },
  { hint: 'Amount of data sent through the mobile interface.', label: 'Data sent', name: 'data_sent', value: '0 B' }
]}
      ${'4G'} | ${{ bandwidth: '10', txbytes: 120078, rxbytes: 120078, pinleft: '3', rsrp: -85, rsrq: -10, vendor: '2c7c', rscp: 'service mode not supported', pinstate: 'READY', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', ecio: 'service mode not supported', sinr: 12.7, umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, conntype: '4G (LTE)', ntype: 'LTE', sc_band_av: 'Inactive' }} | ${[
  { hint: 'Carrier Aggregation (CA) is one of the key techniques used to enable the very high data rates of 4G/5G to be achieved.\nBy combining more than one carrier together, either in the same or different bands it is possible to increase the bandwidth available and in this way increase the capacity of the link.', label: 'Carrier aggregation', name: 'carrier_aggregation', value: 'Inactive' },
  { hint: 'Currently used bandwidth.', label: 'Bandwidth', name: 'bandwidth', value: 'N/A' },
  { hint: 'Currently used mobile frequency band.', label: 'Connected band', name: 'band', value: 'N/A' },
  { hint: 'Received signal strength indicator (RSSI) measured in dBm. Values closer to 0 indicate a better signal strength.', scoped: false, label: 'RSSI (dBm)', name: 'rssi', badge: undefined, value: 'N/A' },
  {
    hint: 'APN (Access Point Name) is configurable network identifier used by a mobile device when connecting to a carrier.',
    label: 'APN',
    name: 'apn',
    value: 'N/A',
    children: []
  },
  {
    hint: 'MTU (Maximum Transmission Unit) - specifies the largest possible size of a data packet.',
    label: 'MTU',
    name: 'mtu',
    value: 'N/A',
    children: []
  },
  { hint: 'Amount of data received through the mobile interface.', label: 'Data received', name: 'data_received', value: '120.08 KB' },
  { hint: 'Amount of data sent through the mobile interface.', label: 'Data sent', name: 'data_sent', value: '120.08 KB' }
]}
      ${'4G CA'} | ${{ bandwidth: '10', txbytes: 120078, rxbytes: 120078, pinleft: '3', rsrp: -85, rsrq: -10, vendor: '2c7c', rscp: 'service mode not supported', pinstate: 'READY', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', ecio: 'service mode not supported', sinr: 12.7, umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, conntype: '4G (LTE)', ntype: 'LTE', sc_band_av: 'Active' }} | ${[
  { hint: 'Carrier Aggregation (CA) is one of the key techniques used to enable the very high data rates of 4G/5G to be achieved.\nBy combining more than one carrier together, either in the same or different bands it is possible to increase the bandwidth available and in this way increase the capacity of the link.', label: 'Carrier aggregation', name: 'carrier_aggregation', value: 'Active' },
  { hint: 'Currently used bandwidth.', label: 'Bandwidth', name: 'bandwidth', value: 'N/A' },
  { hint: 'Currently used mobile frequency band.', label: 'Connected band', name: 'band', value: 'N/A' },
  { hint: 'Received signal strength indicator (RSSI) measured in dBm. Values closer to 0 indicate a better signal strength.', scoped: false, label: 'RSSI (dBm)', name: 'rssi', badge: undefined, value: 'N/A' },
  {
    hint: 'APN (Access Point Name) is configurable network identifier used by a mobile device when connecting to a carrier.',
    label: 'APN',
    name: 'apn',
    value: 'N/A',
    children: []
  },
  {
    hint: 'MTU (Maximum Transmission Unit) - specifies the largest possible size of a data packet.',
    label: 'MTU',
    name: 'mtu',
    value: 'N/A',
    children: []
  },
  { hint: 'Amount of data received through the mobile interface.', label: 'Data received', name: 'data_received', value: '120.08 KB' },
  { hint: 'Amount of data sent through the mobile interface.', label: 'Data sent', name: 'data_sent', value: '120.08 KB' }
]}
      ${'5G (NSA)'} | ${{ bandwidth: '10', txbytes: 120078, rxbytes: 120078, pinleft: '3', rsrp: -81, rsrq: -10, vendor: '2c7c', rscp: 'service mode not supported', pinstate: 'READY', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', ecio: 'service mode not supported', sinr: 12.7, umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 2, conntype: '5G (NSA)', ntype: '5G-NSA', active_sim: 2, sc_band_av: 'Inactive' }} | ${[
  { hint: 'Carrier Aggregation (CA) is one of the key techniques used to enable the very high data rates of 4G/5G to be achieved.\nBy combining more than one carrier together, either in the same or different bands it is possible to increase the bandwidth available and in this way increase the capacity of the link.', label: 'Carrier aggregation', name: 'carrier_aggregation', value: 'Inactive' },
  { hint: 'Currently used bandwidth.', label: 'Bandwidth', name: 'bandwidth', value: 'N/A' },
  { hint: 'Currently used mobile frequency band.', label: 'Connected band', name: 'band', value: 'N/A' },
  { hint: 'Received signal strength indicator (RSSI) measured in dBm. Values closer to 0 indicate a better signal strength.', scoped: false, label: 'RSSI (dBm)', name: 'rssi', badge: undefined, value: 'N/A' },
  {
    hint: 'APN (Access Point Name) is configurable network identifier used by a mobile device when connecting to a carrier.',
    label: 'APN',
    name: 'apn',
    value: 'N/A',
    children: []
  },
  {
    hint: 'MTU (Maximum Transmission Unit) - specifies the largest possible size of a data packet.',
    label: 'MTU',
    name: 'mtu',
    value: 'N/A',
    children: []
  },
  { hint: 'Amount of data received through the mobile interface.', label: 'Data received', name: 'data_received', value: '120.08 KB' },
  { hint: 'Amount of data sent through the mobile interface.', label: 'Data sent', name: 'data_sent', value: '120.08 KB' }
]}
      ${'5G (SA)'} | ${{ bandwidth: '10', txbytes: 120078, rxbytes: 120078, pinleft: '3', rsrp: -85, rsrq: -17, vendor: '2c7c', pinstate: 'READY', operator: 'Tele2 LT', revision: 'EC25ECGAR06A08M1G', sinr: 12.7, umts_bands: ['wcdma_900', 'wcdma_2100'], sim_count: 1, conntype: '5G (SA)', ntype: '5G-SA', ecio: -12, rscp: -74, sc_band_av: 'Inactive' }} | ${[
  { hint: 'Carrier Aggregation (CA) is one of the key techniques used to enable the very high data rates of 4G/5G to be achieved.\nBy combining more than one carrier together, either in the same or different bands it is possible to increase the bandwidth available and in this way increase the capacity of the link.', label: 'Carrier aggregation', name: 'carrier_aggregation', value: 'Inactive' },
  { hint: 'Currently used bandwidth.', label: 'Bandwidth', name: 'bandwidth', value: 'N/A' },
  { hint: 'Currently used mobile frequency band.', label: 'Connected band', name: 'band', value: 'N/A' },
  { hint: 'Received signal strength indicator (RSSI) measured in dBm. Values closer to 0 indicate a better signal strength.', scoped: false, label: 'RSSI (dBm)', name: 'rssi', badge: undefined, value: 'N/A' },
  {
    hint: 'APN (Access Point Name) is configurable network identifier used by a mobile device when connecting to a carrier.',
    label: 'APN',
    name: 'apn',
    value: 'N/A',
    children: []
  },
  {
    hint: 'MTU (Maximum Transmission Unit) - specifies the largest possible size of a data packet.',
    label: 'MTU',
    name: 'mtu',
    value: 'N/A',
    children: []
  },
  { hint: 'Amount of data received through the mobile interface.', label: 'Data received', name: 'data_received', value: '120.08 KB' },
  { hint: 'Amount of data sent through the mobile interface.', label: 'Data sent', name: 'data_sent', value: '120.08 KB' }
]}
    `('checks returned data transmission when $mode', ({ mode, data, res }) => {
      wrapper.vm.modemList = [data]
      wrapper.vm.getBandwidth = vi.fn().mockReturnValue('N/A')
      wrapper.vm.$mobile.rssiValue = vi.fn().mockReturnValueOnce({ value: 'Very poor', customColor: 'bg-red-800' })
      wrapper.vm.$mobile.connectedTo4g5g = vi.fn().mockReturnValueOnce(mode.includes('4G') || mode.includes('5G'))
      wrapper.vm.$mobile.connectedTo3g = vi.fn().mockReturnValueOnce(mode === '3G')
      wrapper.vm.$mobile.getCA = vi.fn().mockReturnValueOnce(data.sc_band_av === 'Active' ? 'Active' : 'Inactive')
      wrapper.vm.$mobile.getBandName = vi.fn().mockReturnValue('N/A')
      expect(wrapper.vm.parseDataTransmission(data)).toEqual(res)
    })
    it.each`
      data  | interfaces                                                    | res
      ${{}} | ${[{ modem_id: '3-1', sim: '1', name: 'mob1', is_up: true }]} | ${[{ label: 'Operator', name: 'operator', value: 'N/A', hint: "Network operator's name." }, { label: 'Operator state', name: 'operator_state', value: 'N/A', hint: 'Shows whether the network has currently indicated the registration of the mobile device.', limited: false }, { label: 'Data connection state', name: 'data_connection_state', value: 'N/A', hint: 'Indicates whether the device has a mobile data connection or not.' }, { label: 'Connection stage', name: 'mobile_connection_stage', value: 'N/A', hint: 'Indicates current mobile connection stage.' }, { label: 'Network type', name: 'network_type', value: 'N/A', hint: 'Mobile network type.' }, { label: 'IP address', name: 'ip_address', value: 'N/A', hint: 'IP address of mobile interface', ip: undefined, children: [] }, { label: 'Uptime', name: 'uptime', value: 'N/A', hint: 'Uptime of mobile interface', children: [] }]}
      ${{ operator: 'Bite', operator_state: 'Registered, home', data_conn_state: 'Connected', mobile_stage: '19', conntype: '4G (LTE); VoLTE', id: '3-1', active_sim: 1 }} | ${[{ modem_id: '3-1', sim: '1', name: 'mob1', is_up: true }, { modem_id: '3-1', sim: '1', name: 'mob2', is_up: true }]} | ${[
  { label: 'Operator', name: 'operator', value: 'Bite', hint: "Network operator's name." },
  { label: 'Operator state', name: 'operator_state', value: 'Registered, home', hint: 'Shows whether the network has currently indicated the registration of the mobile device.', limited: false },
  {
    label: 'Data connection state',
    name: 'data_connection_state',
    badge: {
      size: 'md',
      text: 'Connected',
      type: 'success'
    },
    hint: 'Indicates whether the device has a mobile data connection or not.'
  },
  { label: 'Connection stage', name: 'mobile_connection_stage', value: 'N/A', hint: 'Indicates current mobile connection stage.' },
  { label: 'Network type', name: 'network_type', value: '4G (LTE); VoLTE', hint: 'Mobile network type.' },
  { label: 'IP address', name: 'ip_address', value: 'N/A', hint: 'IP address of mobile interface', ip: { modem_id: '3-1', name: 'mob1', sim: '1', is_up: true }, children: [{ label: 'mob1', name: 'mob1', mtu: 'N/A', uptime: 'N/A', apn: '-', ip: { modem_id: '3-1', sim: '1', name: 'mob1', is_up: true } }, { label: 'mob2', name: 'mob2', mtu: 'N/A', apn: '-', uptime: 'N/A', ip: { modem_id: '3-1', sim: '1', name: 'mob2', is_up: true } }] },
  { label: 'Uptime', name: 'uptime', value: 'N/A', hint: 'Uptime of mobile interface', children: [{ apn: '-', mtu: 'N/A', uptime: 'N/A', label: 'mob1', name: 'mob1', ip: { modem_id: '3-1', sim: '1', name: 'mob1', is_up: true } }, { apn: '-', mtu: 'N/A', uptime: 'N/A', label: 'mob2', name: 'mob2', ip: { modem_id: '3-1', sim: '1', name: 'mob2', is_up: true } }] }
]}
    `('checks returned parsed connection #%#', ({ data, interfaces, res }) => {
      wrapper.vm.modemId = '3-1'
      wrapper.vm.modemList = [data]
      wrapper.vm.ifaceStatus = interfaces
      wrapper.vm.$network.getName = vi.fn().mockImplementation(value => {
        return value.name
      })
      expect(wrapper.vm.parseConnection(data)).toEqual(res)
    })
    it.each`
      mode       | data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | res
      ${'-'}     | ${{}}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | ${[]}
      ${'2G'}    | ${{ band: 'GSM 900', cell_info: [{ earfcn: 1000 }], sinr: 12.7, conntype: '2G (EDGE)', ntype: 'EDGE' }}                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | ${[{ bandwidth: 'N/A', frequency: 1000, name: 'GSM 900' }]}
      ${'3G'}    | ${{ band: 'WCDMA 900', cell_info: [{ uarfcn: 1000 }], rsrp: -81, vendor: '2c7c', rscp: -85, ecio: -10, conntype: '3G (HSDPA)', ntype: 'HSDPA' }}                                                                                                                                                                                                                                                                                                                                                                                                                        | ${[{ bandwidth: 'N/A', ecio: { scopeName: 'signal_strength', value: { number: -10, text: '-' } }, frequency: 1000, name: 'WCDMA 900', rscp: { scopeName: 'signal_strength', value: { number: -85, text: '-' } } }]}
      ${'4G'}    | ${{ band: 'LTE B7', cell_info: [{ earfcn: 3050, pcid: 123, mnc: '01', mcc: '246' }], conntype: '4G (LTE)', ntype: 'LTE', rsrq: -8, rsrp: -83, sinr: 21 }}                                                                                                                                                                                                                                                                                                                                                                                                               | ${[{ bandwidth: 'N/A', frequency: 3050, name: 'LTE B7', pcid: 123, rsrp: { scopeName: 'signal_strength', value: { number: -83, text: '-' } }, rsrq: { scopeName: 'signal_strength', value: { number: -8, text: '-' } }, sinr: { scopeName: 'signal_strength', value: { number: 21, text: '-' } } }]}
      ${'4G CA'} | ${{ id: '3-1', band: 'LTE B5', cell_info: [{ earfcn: 3050, pcid: 123, mnc: '01', mcc: '246' }, { pcid: 208, mcc: '246', arfcn: 300, mnc: '01' }], ca_signal: [{ band: 'LTE B7', bandwidth: '20', rsrq: -8, rsrp: -83, sinr: 21, pcid: 123, frequency: 3050 }, { band: 'LTE B1', bandwidth: '20', rsrq: -9, rsrp: -85, sinr: 12, pcid: 208, frequency: 300 }], conntype: '4G (LTE)', ntype: 'LTE' }}                                                                                                                                                                     | ${[{ bandwidth: '20 MHz', frequency: 3050, name: 'LTE B7', pcid: 123, rsrp: { scopeName: 'signal_strength', value: { number: -83, text: '-' } }, rsrq: { scopeName: 'signal_strength', value: { number: -8, text: '-' } }, sinr: { scopeName: 'signal_strength', value: { number: 21, text: '-' } }, primary: false }, { bandwidth: '20 MHz', frequency: 300, name: 'LTE B1', pcid: 208, rsrp: { scopeName: 'signal_strength', value: { number: -85, text: '-' } }, rsrq: { scopeName: 'signal_strength', value: { number: -9, text: '-' } }, sinr: { scopeName: 'signal_strength', value: { number: 12, text: '-' } }, primary: false }]}
      ${'5G'}    | ${{ id: '3-1', band: 'LTE B1', cell_info: [{ earfcn: 300, pcid: 208, mnc: '01', mcc: '246' }, { bandwidth: '100', pcid: 127, mcc: '246', rsrp: -77, sinr: 23, rsrq: -11, arfcn: 154570, mnc: '01' }], ca_signal: [{ band: 'LTE B1', bandwidth: '20', rsrq: -9, rsrp: -94, sinr: 19, pcid: 208, frequency: 300 }, { band: 'LTE B7', bandwidth: '20', rsrq: -10, rsrp: -97, sinr: 22, pcid: 123, frequency: 3050 }, { band: '5G N28', bandwidth: '10', rsrq: 'N/A', rsrp: 'N/A', sinr: 'N/A', pcid: 'N/A', frequency: 154570 }], conntype: '5G (NSA)', ntype: '5G-NSA' }} | ${[{ bandwidth: '20 MHz', frequency: 300, name: 'LTE B1', pcid: 208, primary: false, rsrp: { scopeName: 'signal_strength', value: { number: -94, text: '-' } }, rsrq: { scopeName: 'signal_strength', value: { number: -9, text: '-' } }, sinr: { scopeName: 'signal_strength', value: { number: 19, text: '-' } } }, { bandwidth: '20 MHz', frequency: 3050, name: 'LTE B7', pcid: 123, rsrp: { scopeName: 'signal_strength', value: { number: -97, text: '-' } }, rsrq: { scopeName: 'signal_strength', value: { number: -10, text: '-' } }, sinr: { scopeName: 'signal_strength', value: { number: 22, text: '-' } }, primary: false }, { bandwidth: '10 MHz', frequency: 154570, name: '5G N28', pcid: 127, rsrp: { scopeName: 'signal_strength', value: { number: -77, text: '-' } }, rsrq: { scopeName: 'signal_strength', value: { number: -11, text: '-' } }, sinr: { scopeName: 'signal_strength', value: { number: 23, text: '-' } }, primary: false }]}
    `('checks returned bands when $mode', ({ mode, data, res }) => {
      wrapper.vm.modemId = '3-1'
      wrapper.vm.modemList = [data]
      wrapper.vm.$mobile.connectedTo4g5g = vi.fn().mockReturnValueOnce(mode.includes('4G') || mode.includes('5G'))
      wrapper.vm.$mobile.connectedTo3g = vi.fn().mockReturnValueOnce(mode === '3G')
      wrapper.vm.$mobile.getBandName = vi.fn().mockImplementation(value => {
        return value?.band || 'N/A'
      })
      expect(wrapper.vm.parseBands(data)).toEqual(res)
    })
  })
  describe('rebootModem()', () => {
    it("doesn't show error when request doesn't throw error", async () => {
      wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({ data: {} })
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.$timer.stop = vi.fn()
      wrapper.vm.$timer.start = vi.fn()
      await wrapper.vm.rebootModem()
      expect(spy).not.toHaveBeenCalled()
    })
    it('shows error when request throws error', async () => {
      wrapper.vm.$axios.post = vi.fn().mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.$timer.stop = vi.fn()
      wrapper.vm.$timer.start = vi.fn()
      await wrapper.vm.rebootModem()
      expect(spy).toHaveBeenCalled()
    })
    it("shows success when request doesn't throw error", async () => {
      wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({ data: {} })
      const spy = vi.spyOn(wrapper.vm.$message, 'success')
      wrapper.vm.$timer.stop = vi.fn()
      wrapper.vm.$timer.start = vi.fn()
      await wrapper.vm.rebootModem()
      expect(spy).toHaveBeenCalled()
    })
    it("doesn't show success when request throws error", async () => {
      wrapper.vm.$axios.post = vi.fn().mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'success')
      wrapper.vm.$timer.stop = vi.fn()
      wrapper.vm.$timer.start = vi.fn()
      await wrapper.vm.rebootModem()
      expect(spy).not.toHaveBeenCalled()
    })
  })
  describe('switchSim()', () => {
    it("shows success when request doesn't throw error", async () => {
      wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({ data: {} })
      const spy = vi.spyOn(wrapper.vm.$message, 'success')
      wrapper.vm.$timer.stop = vi.fn()
      wrapper.vm.$timer.start = vi.fn()
      await wrapper.vm.switchSim()
      expect(spy).toHaveBeenCalled()
    })
    it('shows error when request throws error', async () => {
      wrapper.vm.$axios.post = vi.fn().mockRejectedValueOnce()
      const spy = vi.spyOn(wrapper.vm.$message, 'error')
      wrapper.vm.$timer.stop = vi.fn()
      wrapper.vm.$timer.start = vi.fn()
      await wrapper.vm.switchSim()
      expect(spy).toHaveBeenCalled()
    })
  })
})
