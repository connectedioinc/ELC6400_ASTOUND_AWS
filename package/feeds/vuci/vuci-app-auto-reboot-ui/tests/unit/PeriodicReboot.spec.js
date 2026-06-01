import createWrapper from '@tests/unit/mockFactory'
import PeriodicReboot from '../../src/views/services/PeriodicReboot.vue'
import PeriodicRebootEdit from '../../src/views/services/PeriodicRebootEdit.vue'

const modems = [
  { id: '1-1', name: 'primary', builtin: true, sim_count: 2 },
  { id: '1-2', name: 'external', builtin: false, sim_count: 1 },
  { id: '1-3', name: 'external', builtin: false, sim_count: 1 }
]

const modemOptions = [
  ['3-1', 'Primary modem'],
  ['3-2', 'Secondary modem']
]

const periodicRebootResponse = [
  {
    status: 0,
    data: [
      {
        id: 'cfg0210a4',
        '.type': 'reboot_instance',
        '.index': 1,
        '.anonymous': true,
        time: ['12:00', '14:00'],
        enable: '0',
        action: '1',
        days: 'mon,wed,thu,fri'
      }
    ]
  }
]

describe('PeriodicReboot.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(PeriodicReboot, {
      global: {
        mocks: {
          $axios: {
            bulkGet: urls => {
              const response = []
              urls.forEach(url => {
                if (url === 'services/auto_reboot/scheduler') {
                  response.push({
                    data: periodicRebootResponse
                  })
                } else {
                  response.push({ data: [] })
                }
              })
              return Promise.resolve(response)
            }
          },
          $mobile: {
            loadModems: () => Promise.resolve(modems)
          }
        }
      }
    })
  })

  it('checks if afterLoad load modem data', async () => {
    const wrapper = createWrapper(PeriodicReboot)
    wrapper.vm.$mobile.modemsOptions = vi.fn().mockReturnValueOnce(modemOptions)
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.modemList).toEqual(modemOptions)
  })
  it('checks if after load shows error', async () => {
    const wrapper = createWrapper(PeriodicReboot)
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalled()
  })
  it.each`
    title             | length | result
    ${'passes'}       | ${1}   | ${{ valid: true }}
    ${'throws error'} | ${30}  | ${{ valid: false, message: "Can't create more instances. Only 30 instances are allowed" }}
  `('tests if validation $title', ({ length, result }) => {
    const wrapper = createWrapper(PeriodicReboot)
    const dataSource = Array.from({ length }, (_, index) => ({ id: 'test' + index }))
    expect(wrapper.vm.onAdd('', dataSource)).toEqual(result)
  })
  it.each([
    [null, '-'],
    ['1', 'Reboot'],
    ['2', 'Modem reboot']
  ])("check if displayAction returns correct value when input is '%s'", (value, expected) => {
    expect(wrapper.vm.displayAction(value)).toEqual(wrapper.vm.$t(expected))
  })

  it.each([
    [{ period: '', days: [], month_day: [] }, '-'],
    [{ period: 'week', days: ['mon', 'wed', 'thu'], month_day: [] }, 'Mon, Wed, Thu'],
    [{ period: 'month', days: [], month_day: ['1', '5', '9'] }, '1, 5, 9']
  ])("check if displayDays returns correct value when input is '%s'", (value, expected) => {
    const self = {
      uciSection: {
        period: value.period,
        days: value.days,
        month_day: value.month_day
      }
    }
    expect(wrapper.vm.displayDays(null, self)).toEqual(wrapper.vm.$t(expected))
  })

  it.each([
    [null, '-'],
    [['12:00', '18:00', '19:00'], '12:00, 18:00, 19:00']
  ])("check if displayTime returns correct value when input is '%s'", (value, expected) => {
    expect(wrapper.vm.displayTime(value)).toEqual(wrapper.vm.$t(expected))
  })

  it.each([
    [null, '-'],
    ['week', 'Week days'],
    ['month', 'Month days']
  ])("check if displayPeriod returns correct value when input is '%s'", (value, expected) => {
    expect(wrapper.vm.displayPeriod(value)).toEqual(wrapper.vm.$t(expected))
  })

  it.each([
    [null, '-'],
    [['1', '2', '3'], 'Jan, Feb, Mar'],
    [['11', '10', '1'], 'Nov, Oct, Jan']
  ])("check if displayMonths returns correct value when input is '%s'", (value, expected) => {
    expect(wrapper.vm.displayMonths(value)).toEqual(wrapper.vm.$t(expected))
  })
  it.each([
    ['with empty action, period and time options', 'Missing required options: Action, Interval type, Day time', { id: 'test1', enable: '1', action: '', period: '', time: '' }],
    [
      'with months option, when period is month',
      'Missing required option: Month',
      { id: 'test1', enable: '1', action: 'action', period: 'month', time: ['12:00'], month_day: 'month_day', months: [''] }
    ],
    [
      'with empty month_day option, when period is month',
      'Missing required option: Month day',
      { id: 'test1', enable: '1', action: 'action', period: 'month', time: ['12:00'], month_day: '', months: ['months'] }
    ],
    ['with empty days option, when period is week', 'Missing required option: Week days', { id: 'test1', enable: '1', action: 'action', period: 'week', time: ['12:00'], days: [''] }]
  ])('returns error message when %s', (text, message, sectionValues) => {
    const wrapper = createWrapper(PeriodicReboot)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const data = {
      uciSection: sectionValues
    }
    wrapper.vm.validateEnable(data)
    expect(spy).toHaveBeenCalledWith(message)
  })
})

const props = {
  section: {
    id: 'abc'
  }
}

describe('PeriodicRebootEdit.vue', () => {
  it.each([[modems], [[]]])("check if computed actions returns correct data when modem length is '%s'", async value => {
    const wrapper = createWrapper(PeriodicRebootEdit, {
      props,
      global: {
        provide: { modemsList: () => value }
      }
    })
    const modems = await wrapper.vm.modemsList()
    expect(wrapper.vm.actions).toHaveLength(modems.length > 0 ? 2 : 1)
  })

  it('check if computed monthOpts returns correct data', () => {
    const wrapper = createWrapper(PeriodicRebootEdit, {
      props,
      global: {
        provide: { modemsList: () => modems }
      }
    })
    const options = []
    for (let i = 1; i <= 31; i++) {
      options.push([`${i}`, `${i}`])
    }
    expect(wrapper.vm.monthOpts).toEqual(options)
  })
})
