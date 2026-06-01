import { Measurement } from '@/components/shared/Plots/measurement'
import MobileUsage from '../../src/views/status/MobileUsage.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('MobileUsage.vue', () => {
  const mocks = {
    $route: {
      fullPath: '/status/mobile_usage/day/3-1_1',
      meta: {
        path: '/status/mobile_usage/day/3-1_1',
        simPosition: 1,
        index: 8,
        modemId: '3-1'
      }
    },
    selected: 'day',
    modemId: '3-1',
    sim: 1,
    datacollection: {}
  }
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileUsage, { global: { mocks } })
  })
  it('returns ticks of barchart depending on window size (interval: day, interval: week)', () => {
    wrapper.vm.updateTicks()
    expect(wrapper.vm.tickCount).toEqual(1024 / 150)
    wrapper.setData({ selected: 'week' })
    wrapper.vm.updateTicks()
    expect(wrapper.vm.tickCount).toEqual(1024 / 60)
  })
  it('returns bar chart labels (interval: day, displays hours)', () => {
    wrapper.setData({ selected: 'day' })
    wrapper.setData({ timestamps: [1649289600, 1650376000] })
    expect(wrapper.vm.getLabels().length).toBe(2)
    expect(wrapper.vm.selected).toEqual('day')
  })
  it('returns bar chart labels (interval: week, displays days)', () => {
    wrapper.setData({ selected: 'week' })
    wrapper.setData({ timestamps: [1649289600, 1649376000, 1649462400] })
    expect(wrapper.vm.getLabels().length).toBe(3)
    expect(wrapper.vm.selected).toEqual('week')
  })
  it('returns bar chart labels (interval: month, displays date(month/day) )', () => {
    wrapper.setData({ selected: 'month' })
    wrapper.setData({ timestamps: [1649289600, 1649376000, 1649462400, undefined] })
    expect(wrapper.vm.getLabels().length).toBe(4)
    expect(wrapper.vm.selected).toEqual('month')
  })
  it('returns plotOptions and data', () => {
    wrapper.setData({ selected: 'month' })
    wrapper.setData({ timestamps: [1649289600, 1649289600] })
    wrapper.setData({ rx: [100, 200] })
    wrapper.setData({ tx: [400, 500] })
    expect(wrapper.vm.plotOptions).toEqual({
      datasetOptions: [
        { color: 'var(--color-lime-300)', key: 'tx', name: 'Sent' },
        { color: 'var(--color-blue-700)', key: 'rx', name: 'Received' }
      ],
      height: 400,
      x: {
        format: 'MM-DD',
        tickCount: 6.826666666666667,
        tooltipFormat: 'MM-DD'
      },
      y: {
        format: expect.any(Function),
        suggestedMax: undefined,
        suggestedMin: 0
      }
    })

    expect(wrapper.vm.plotData).toEqual([new Measurement(1649289600000, 1649289600000, { rx: 100, tx: 400 }), new Measurement(1649289600000, 1649289600000, { rx: 200, tx: 500 })])
  })
  it('add 0 entries if data is missing', () => {
    wrapper.setData({ selected: 'week' })
    wrapper.setData({ timestamps: [1649548800, 1649635200] })
    wrapper.setData({ rx: [608816, 160795] })
    wrapper.setData({ tx: [738914, 200034] })
    wrapper.vm.fixData()
    expect(wrapper.vm.timestamps).toEqual([1649548800, 1649635200, 1649721600])
    expect(wrapper.vm.rx).toEqual([608816, 160795, 0])
    expect(wrapper.vm.tx).toEqual([738914, 200034, 0])
  })
  it('display error message when API call is not successful', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    wrapper.vm.sim = 1
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getData()
    expect(spy).toHaveBeenCalledWith('Failed to load mobile usage data')
    spy.mockClear()
  })
  it.each([
    [`/api/data_usage/${mocks.selected}/modem/${mocks.modemId}/sim/${mocks.sim}/status`, '3-1', 1],
    [`/api/data_usage/${mocks.selected}/status`, 'all', 'all']
  ])('checks if url path is correct %s', async (endpoint, modemId, simPosition) => {
    wrapper.vm.modemId = modemId
    wrapper.vm.sim = simPosition
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: [] })
    await wrapper.vm.getData()
    expect(wrapper.vm.$axios.get).toHaveBeenCalledWith(endpoint)
  })
  it('returns data from API and modifies it', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: [[1649635200, 608816, 738914]] })
    wrapper.vm.sim = 1
    await wrapper.vm.getData()
    expect(wrapper.vm.timestamps).toEqual([1649635200, 1649638800])
    expect(wrapper.vm.rx).toEqual([608816, 0])
    expect(wrapper.vm.tx).toEqual([738914, 0])
  })
  it('returns loaded modem list', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce([
      { success: true, data: [{ id: '3-1', name: 'Internal modem' }] },
      { success: true, data: [] }
    ])
    wrapper.vm.$mobile.parseModems = vi.fn().mockReturnValueOnce([{ id: '3-1', name: 'Internal modem' }])
    await wrapper.vm.loadModems()
    expect(wrapper.vm.modemList).toEqual([{ id: '3-1', name: 'Internal modem' }])
  })
  it('returns error message when response unsuccessful', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadModems()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('returns selected value, week', () => {
    wrapper.vm.intervalChange('week')
    expect(wrapper.vm.selected).toEqual('week')
    expect(wrapper.vm.range).toEqual([])
    expect(window.localStorage.getItem('mobileUsage-interval')).toEqual('week')
  })
  it('returns selected value, custom', () => {
    wrapper.vm.intervalChange('custom')
    expect(wrapper.vm.selected).toEqual('custom')
    expect(window.localStorage.getItem('mobileUsage-interval')).toEqual('custom')
  })
  it('checks if modemId and sim values get updated when on tab change', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValue([
      { success: true, data: [{ id: '2-1', name: 'Internal modem', sim_count: 2 }] },
      {
        success: true,
        data: [
          { modem: '2-1', sim: 1 },
          { modem: '2-1', sim: 2 }
        ]
      }
    ])
    wrapper.vm.$mobile.parseModems = vi.fn().mockReturnValueOnce([{ id: '2-1', name: 'Internal modem', sim_count: 2 }])
    wrapper.vm.$mobile.getSimModemLabel = vi.fn()
    await wrapper.vm.loadModems()
    wrapper.vm.tabChange('2-1_2')
    expect(wrapper.vm.modemId).toEqual('2-1')
    expect(wrapper.vm.sim).toEqual(2)
    expect(wrapper.vm.range).toEqual([])
  })
  it.each([
    ['show units in MB', 'mb', '1000000', true, '1 MB'],
    ['not show units in MB', 'mb', '100', false, 0],
    ['not show units in MB', 'mb', '10000', false, 0.01],
    ['not show units in auto', 'auto', '100', true, '100 B'],
    ['not show units in auto', 'auto', '1', false, '1']
  ])('checks if formatValue returns correct value when %s', (text, units, val, format, res) => {
    wrapper.vm.units = units
    expect(wrapper.vm.formatValue(val, format)).toEqual(res)
  })
  it('checks if warning message is shown when unit is not auto', () => {
    wrapper.vm.showUnitWarning = vi.fn().mockReturnValue(true)
    expect(wrapper.vm.warningMsg('mb')).toEqual("Values are too small to be displayed in selected unit. Please select a smaller unit or 'Auto'.")
  })
  it.each([
    ['day', 7],
    ['total', 4],
    ['custom', 4]
  ])('checks number of columns when period: %s', (val, res) => {
    wrapper.vm.selected = val
    expect(wrapper.vm.columns.length).toEqual(res)
  })
  it('returns statistical parameters table data', () => {
    wrapper.vm.selected = 'day'
    expect(wrapper.vm.statistics).toEqual({
      name: 'Statistics',
      content: [
        {
          metric: 'Sent',
          total: '0 B',
          average: '0 B',
          peak: 'Not enough data',
          growth: undefined,
          forecast: 'Not enough data',
          pattern: 'Most data used during morning (3-9h)'
        },
        {
          metric: 'Received',
          total: '0 B',
          average: '0 B',
          peak: 'Not enough data',
          growth: undefined,
          forecast: 'Not enough data',
          pattern: 'Most data used during morning (3-9h)'
        },
        {
          metric: 'Total',
          total: '0 B',
          average: '0 B',
          peak: 'Not enough data',
          growth: undefined,
          forecast: 'Not enough data',
          pattern: 'Most data used during morning (3-9h)'
        }
      ]
    })
  })
  it.each([
    ['Monday', '1', 0],
    ['Sunday', '0', 6]
  ])('checks if normalizeWeekDay returns updated week day when current is %s', (text, val, res) => {
    wrapper.vm.$localDate = vi.fn().mockReturnValue(val)
    expect(wrapper.vm.normalizeWeekDay(val)).toEqual(res)
  })
  it.each([
    ['workday', true, [100], 1, 20],
    ['weekend', true, [200], 0, 0]
  ])('checks if calculateUsage returns data usage sum when it is %s', (text, workdays, val, day, res) => {
    wrapper.vm.$localDate = vi.fn().mockReturnValue(day)
    expect(wrapper.vm.calculateUsage(val, [], workdays)).toEqual(res)
  })
  it.each([
    ['morning', 3, 9, [100], 3, 100],
    ['evening', 15, 21, [200], 2, 0]
  ])('checks if calculateDayUsage returns data usage sum when it is %s', (text, start, end, val, day, res) => {
    wrapper.vm.$localDate = vi.fn().mockReturnValue(day)
    expect(wrapper.vm.calculateDayUsage(val, [], start, end)).toEqual(res)
  })
  it.each([
    [
      'workdays',
      [100, 80],
      [
        { label: 'workdays', workday: true },
        { label: 'weekends', workday: false }
      ],
      'Most data used during workdays'
    ],
    [
      'weekends',
      [100, 120],
      [
        { label: 'workdays', workday: true },
        { label: 'weekends', workday: false }
      ],
      'Most data used during weekends'
    ]
  ])('checks if determinePattern returns correct pattern when most data used during %s', (text, val, period, res) => {
    expect(wrapper.vm.determinePattern(val, period)).toEqual(res)
  })
  it.each([
    [[100, 200, 300, 400, 500], 1, 7, 1800],
    [[100, 200, 300, 400, 500], 0, 5, 1500],
    [[], 1, 5, 0]
  ])('checks if forecastData returns correct data #%#', (data, first, last, res) => {
    expect(wrapper.vm.forecastData(data, first, last)).toEqual(res)
  })
  it.each([
    [[100, 200, 199], '200 B (2025-01-01)'],
    [[], 'Not enough data']
  ])('checks if findPeakAndFormat returns found peak value and formats #%#', (data, res) => {
    wrapper.vm.$localDate = vi.fn().mockReturnValue('2025-01-01')
    expect(wrapper.vm.findPeakAndFormat(data)).toEqual(res)
  })
})
