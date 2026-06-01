import { ref } from 'vue'
import MobileRealtime from '../../src/views/status/MobileRealtime.vue'
import createWrapper from '@tests/unit/mockFactory'

vi.mock('chart.js')
vi.mock('vue-chartjs')
vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' })),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      currentRoute: ref('')
    })
  }
})

const modem = [{ conntype: 'ltesdfasd', id: '3-1' }]
const modem3G = [{ conntype: 'HSPA', id: '3-1' }]
const modem4G = [{ conntype: 'LTE', id: '3-1' }]
const withoutModem = []
const twoModems = [
  { conntype: 'gsm', id: '3-1', band: 'LTE B7', cell_info: [{ arfcn: 1234 }], ca_signal: [{ frequency: 1234 }] },
  { conntype: 'gsm', id: '1-1', band: 'LTE B7', cell_info: [{ uarfcn: 1234 }] }
]

describe('Mobile realtime tests', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileRealtime, {
      global: {
        mocks: {
          $mobile: { modemOffline: vi.fn() },
          $store: {
            deviceInfo: {
              static: {
                device_name: 'RUT'
              }
            }
          }
        }
      }
    })
    wrapper.vm.$mobile.shouldShowModemName = vi.fn().mockReturnValue(false)
    wrapper.vm.$mobile.getConntype = vi.fn().mockImplementation(value => {
      return value || 'N/A'
    })
    wrapper.vm.$mobile.connectedTo4g5g = vi.fn()
    wrapper.vm.$mobile.connectedTo3g = vi.fn()
    wrapper.vm.$mobile.getFrequencyName = vi.fn()
    wrapper.vm.$mobile.getBandName = vi.fn()
  })
  it('returns initial values', async () => {
    const value = await wrapper.vm.calculateSignal([50, 25])
    expect(value).toEqual({ avg: 37.5, curr: 25, peak: 50 })
  })
  it.each([
    ['with lte', true, false, { id: '3-1' }, 4],
    ['without lte and 3G', false, false, { id: '3-1' }, 1],
    ['with 3G', false, true, { id: '3-1' }, 3]
  ])('fills data collection information %s', (lte, lteStatus, threeGStatus, modem, res) => {
    wrapper.vm.$mobile.connectedTo4g5g = vi.fn().mockReturnValueOnce(lteStatus)
    wrapper.vm.$mobile.connectedTo3g = vi.fn().mockReturnValueOnce(threeGStatus)
    wrapper.vm.modemText = vi.fn().mockReturnValueOnce('')
    wrapper.vm.fillData([], modem)
    expect(wrapper.vm.graphs.length).toEqual(res)
    vi.resetAllMocks()
  })
  it.each([
    ['4G', true, false, { id: '3-1' }, 7],
    ['2G', false, false, { id: '3-1' }, 4],
    ['3G', false, true, { id: '3-1' }, 6]
  ])('creates and fills cards with data when conntype %s', (lte, lteStatus, threeGStatus, modem, res) => {
    wrapper.vm.$mobile.connectedTo4g5g = vi.fn().mockReturnValueOnce(lteStatus)
    wrapper.vm.$mobile.connectedTo3g = vi.fn().mockReturnValueOnce(threeGStatus)
    wrapper.vm.modemText = vi.fn().mockReturnValueOnce('')
    const cards = wrapper.vm.updateCards(modem)
    expect(Object.keys(cards).length).toEqual(res)
  })
  it.each([
    [{ builtin: false, name: 'External modem 1' }, true, ' (External modem 1)'],
    [{ builtin: true, name: 'Internal modem' }, false, ''],
    [{ builtin: true, name: 'Primary modem' }, true, ' (Primary modem)']
  ])('returns parsed modem text when %s', (modem, showName, res) => {
    const wrapper = createWrapper(MobileRealtime)
    wrapper.vm.$mobile.shouldShowModemName = vi.fn().mockReturnValue(showName)
    expect(wrapper.vm.modemText(modem)).toEqual(res)
  })
  it.each([
    [{ curr: 1, avg: 1, peak: 1 }, true, { curr: '1 dBm', avg: '1 dBm', peak: '1 dBm' }],
    [{ curr: 'N/A', avg: 'N/A', peak: 'N/A' }, true, { curr: '- dBm', avg: '- dBm', peak: '- dBm' }],
    [{ curr: 1, avg: 1, peak: 1 }, false, '-']
  ])('returns parsed signal strength values %s', (value, supports, res) => {
    const wrapper = createWrapper(MobileRealtime)
    expect(wrapper.vm.signalStrength(value, supports)).toEqual(res)
  })
  it.each([
    [true, false, 5],
    [false, false, 2],
    [false, true, 4]
  ])('returns table column count, when 4G/5G: %s , 3G: %s', (lte5g, threeG, res) => {
    wrapper.vm.$mobile.connectedTo4g5g = vi.fn().mockReturnValue(lte5g)
    wrapper.vm.$mobile.connectedTo3g = vi.fn().mockReturnValue(threeG)
    expect(wrapper.vm.columnsModem({})).toHaveLength(res)
  })
  it.each([
    [true, false, 4],
    [false, false, 1],
    [false, true, 3]
  ])('returns graph column count, when 4G/5G: %s , 3G: %s', (lte5g, threeG, res) => {
    expect(wrapper.vm.graphColumns(threeG, lte5g)).toHaveLength(res)
  })
  it.each([
    ['with modem', modem, 1],
    ['without modem', withoutModem, 0],
    ['with modem and conntype 3G', modem3G, 1],
    ['with modem and conntype 4G', modem4G, 1],
    ['with two modems', twoModems, 2]
  ])('loads data %s', async (msg, data, length) => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.fillData = vi.fn()
    wrapper.vm.updateCards = vi.fn()
    wrapper.vm.$mobile.modemOffline = vi.fn().mockReturnValue(false)
    wrapper.vm.modems = data
    await wrapper.vm.$options.watch.modems.call(wrapper.vm, data)
    expect(wrapper.vm.tableData).toHaveLength(length)
  })
  it('checks if updateData method is called when API call is successful', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: [{ id: '3-1' }] })
    wrapper.vm.$mobile.parseModems = vi.fn().mockReturnValueOnce([{ id: '3-1' }])
    await wrapper.vm.getData()
    expect(wrapper.vm.$options.watch.modems.call(wrapper.vm, []))
  })
  it('display error message when API fails', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getData()
    expect(spy).toHaveBeenCalledWith('Failed to load modem data')
  })
  it('check if getHistoryData return correct data when API call is successful', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: [{ id: '3-1', name: 'Internal modem' }] },
      { success: true, data: [{ modem: '3-1' }] }
    ])
    await wrapper.vm.getHistoryData()
    expect(wrapper.vm.modems).toEqual([{ id: '3-1', name: 'Internal modem' }])
    expect(wrapper.vm.historyData).toEqual([{ modem: '3-1' }])
  })
  it('check if getHistoryData display error message when API fails', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getHistoryData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it.each([
    [-90, -90],
    ['N/A', undefined]
  ])('returns updated signal value when value is %s', (signal, res) => {
    expect(wrapper.vm.updateSignal(signal)).toEqual(res)
  })
  it.each([
    [true, '262, 83%, 58%'],
    [false, '360, 100%, 50%']
  ])('returns generated hsl color when %s', (defaultColor, res) => {
    if (!defaultColor) {
      wrapper.vm.defaultColors = []
      vi.spyOn(global.Math, 'random').mockReturnValue(1)
    }
    expect(wrapper.vm.generateHsl()).toEqual(res)
  })
  it.each([
    ['live', 0, '', {}, '0 dBm'],
    ['live', 0, 'ecio_3-1_0', { mesurement: { value: { 'ecio_3-1_0': 0 } } }, '0 dB (Good)'],
    ['hour', 10, 'rsrp_3-1_0', { mesurement: { value: { 'rsrp_3-1_0': 10, 'frequency_3-1_0': 1000, 'type_3-1_0': 1 } } }, '10 dBm (Good) | 4G - B7 (1000)']
  ])('returns formatted value #%#', (selected, v, key, data, res) => {
    wrapper.vm.$mobile.rssiValue = vi.fn().mockReturnValueOnce({ value: 'Good' })
    wrapper.vm.$mobile.ecioValue = vi.fn().mockReturnValueOnce({ value: 'Good' })
    wrapper.vm.$mobile.rscpValue = vi.fn().mockReturnValueOnce({ value: 'Good' })
    wrapper.vm.$mobile.rsrpValue = vi.fn().mockReturnValueOnce({ value: 'Good' })
    wrapper.vm.$mobile.rsrqValue = vi.fn().mockReturnValueOnce({ value: 'Good' })
    wrapper.vm.$mobile.sinrValue = vi.fn().mockReturnValueOnce({ value: 'Good' })
    wrapper.vm.$mobile.getBandName = vi.fn().mockReturnValueOnce('B7')
    wrapper.vm.$mobile.getNetworkType = vi.fn().mockReturnValue('4G')
    wrapper.vm.selected = selected
    expect(wrapper.vm.formatValue(v, key, data)).toEqual(res)
  })
  it.each([
    [1, false],
    [20, true],
    [39, true]
  ])('checks if network type is 4G or 5G when value %s', (value, res) => {
    expect(wrapper.vm.checkIf4g5g(value)).toEqual(res)
  })
  it('creates array empty array and assigns color', async () => {
    wrapper.vm.generateHsl = vi.fn().mockReturnValueOnce(['1, 50%, 50%'])
    const obj = 'test'
    await wrapper.vm.createArray(obj)
    expect(wrapper.vm.signalVal[obj]).toEqual([])
    expect(wrapper.vm.cardColors[obj]).toEqual(['1, 50%, 50%'])
  })
  it('checks data when cell is clicked', () => {
    const wrapper = createWrapper(MobileRealtime, {
      global: { mocks: { $router: { currentRoute: {} } } }
    })
    const id = '3-1'
    const frequency = '1234'
    const column = 'rssi'
    const record = {
      rssi: {
        avg: 0,
        curr: 0,
        peak: 0
      }
    }
    wrapper.vm.selected = 'live'
    const ref = `${column}_${id}_${frequency}`
    wrapper.vm.cellClick(id, frequency, column, record)
    expect(wrapper.vm.hiddenCells[ref]).toEqual(true)
    wrapper.vm.selected = 'hour'
    wrapper.vm.cellClick(id, frequency, column, record)
    expect(wrapper.vm.hiddenCells[ref]).toEqual(false)
  })
  it('check if combineTimestamps returns combined unique timestamp array', () => {
    const data = [
      { modem: '3-1', signal: [{ timestamp: 1 }, { timestamp: 2 }] },
      { modem: '3-2', signal: [{ timestamp: 2 }, { timestamp: 3 }] }
    ]
    wrapper.vm.availableType = []
    expect(wrapper.vm.combineTimestamps(data)).toEqual([1, 2, 3])
    expect(wrapper.vm.availableType).toEqual([
      { modem: '3-1', threeG: false, fourG: false },
      { modem: '3-2', threeG: false, fourG: false }
    ])
  })
  it('checks if intervalChange handles "live" correctly', async () => {
    const spyResetData = vi.spyOn(wrapper.vm, 'resetData')
    const spySpin = vi.spyOn(wrapper.vm, '$spin')
    const spyGetData = vi.spyOn(wrapper.vm, 'getData')
    const spyTimer = vi.spyOn(wrapper.vm.$timer, 'start')
    await wrapper.vm.intervalChange('live')
    expect(wrapper.vm.selected).toBe('live')
    expect(spyResetData).toHaveBeenCalled()
    expect(spySpin).toHaveBeenCalled()
    expect(spyGetData).toHaveBeenCalled()
    await Promise.resolve()
    expect(spyTimer).toHaveBeenCalled()
    expect(spySpin).toHaveBeenLastCalledWith(false)
  })
  it('checks if intervalChange handles "hour" correctly', async () => {
    const spyResetData = vi.spyOn(wrapper.vm, 'resetData')
    const spySpin = vi.spyOn(wrapper.vm, '$spin')
    const spyGetData = vi.spyOn(wrapper.vm, 'getHistoryData')
    const spyTimer = vi.spyOn(wrapper.vm.$timer, 'stop')
    await wrapper.vm.intervalChange('hour')
    expect(wrapper.vm.selected).toBe('hour')
    expect(spyResetData).toHaveBeenCalled()
    expect(spySpin).toHaveBeenCalled()
    expect(spyTimer).toHaveBeenCalled()
    expect(spyGetData).toHaveBeenCalled()
    await Promise.resolve()
    expect(spySpin).toHaveBeenLastCalledWith(false)
  })
  it.each([
    ['live', 3],
    ['hour', 4]
  ])('returns table actions count, when selected mode is %s', (mode, res) => {
    wrapper.vm.selected = mode
    expect(wrapper.vm.tableActions({ data: [] })).toHaveLength(res)
  })
  it('checks if exportData calls generateCsv function with correct arguments', () => {
    const spy = vi.spyOn(wrapper.vm.$utils, 'generateCsv')
    wrapper.vm.historyData = []
    wrapper.vm.exportData()
    expect(spy).toHaveBeenCalledWith('mobilesignal-unknown-modem-data-RUT', [
      ['Date', 'Timestamp', 'Network type', 'Band (channel number)', 'RSSI, dBm', 'RSCP, dBm', 'EC/IO, dB', 'RSRP, dBm', 'RSRQ, dB', 'SINR, dB']
    ])
    spy.mockClear()
  })
})
