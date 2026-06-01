import MobileLimits from '../../src/views/network/MobileLimits.vue'
import MobileSmsLimitEdit from '../../src/views/network/MobileSmsLimitEdit.vue'
import { useMobileLimitsUtils } from '@/composables/useMobileLimitsUtils'
import createWrapper from '@tests/unit/mockFactory'

describe('MobileLimits.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileLimits, {
      global: {
        mocks: {
          $localDate: vi.fn().mockReturnValue('2024-06-09 21:00:00'),
          $mobile: {
            getSimLabel: vi.fn().mockReturnValueOnce('1')
          }
        }
      },
      computed: { ...MobileLimits.computed }
    })
  })
  it('returns title with correct data', () => {
    wrapper.vm.type = 'sms'
    expect(wrapper.vm.title).toEqual('SMS limit')
    wrapper.vm.type = 'data'
    expect(wrapper.vm.title).toEqual('Data limit')
  })
  it('returns if current tab is SMS', () => {
    wrapper.vm.type = 'sms'
    expect(wrapper.vm.smsTab).toBe(true)
  })
  it('check if getData returns error when request throws error', async () => {
    wrapper.vm.type = 'sms'
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('check if getData returns error when all endpoints are unsuccessful', async () => {
    wrapper.vm.type = 'data'
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getData()
    expect(spy).toHaveBeenCalledWith('Failed to load SIM status')
    expect(spy).toHaveBeenCalledWith('Failed to load data limit status')
    expect(spy).toHaveBeenCalledWith('Failed to load modem status')
    expect(spy).toHaveBeenCalledWith('Failed to load ntp data')
    expect(spy).toHaveBeenCalledWith('Failed to load interface data')
  })
  it('check if getData returns data when SMS tab is opened', async () => {
    wrapper.vm.type = 'sms'
    const simStatus = [{ id: 'cfg01aa0e', position: '1' }]
    const modemStatus = [{ id: '3-1', active_sim: 1 }]
    const ntpData = [{ current_system_time: '2024-06-09 21:00:00' }]
    const simSwitchData = [{ id: 'cfg01aa0e' }]
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: simStatus },
      { success: true, data: [] },
      { success: true, data: modemStatus },
      { success: true, data: ntpData },
      { success: true, data: simSwitchData },
      { success: true, data: [] },
      { success: true, data: [] }
    ])
    wrapper.vm.$mobile.parseModems = vi.fn().mockReturnValueOnce(modemStatus)
    await wrapper.vm.getData()
    expect(wrapper.vm.simStatus).toEqual(simStatus)
    expect(wrapper.vm.modemList).toEqual(modemStatus)
    expect(wrapper.vm.formOptions.ntpInfo).toEqual(ntpData[0])
    expect(wrapper.vm.formOptions.simSwitch).toEqual(simSwitchData)
  })
  it('check if getData returns data when Data tab is opened', async () => {
    wrapper.vm.type = 'data'
    const dataStatus = [{ id: 'cfg01aa0e' }]
    const modemStatus = [{ id: '3-1', active_sim: 1 }]
    const ntpData = [{ current_system_time: '2024-06-09 21:00:00' }]
    const ifaceConfig = [
      { id: 'mob1', apn: 'wap', modem: '3-1', sim: '1', proto: 'wwan' },
      { id: 'test', proto: 'none' }
    ]
    const simSwitchData = [{ id: 'cfg01aa0e' }]
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([
      { success: true, data: [] },
      { success: true, data: dataStatus },
      { success: true, data: modemStatus },
      { success: true, data: ntpData },
      { success: true, data: simSwitchData },
      { success: true, data: ifaceConfig }
    ])
    wrapper.vm.$refs.vuciForm.updateUciData = vi.fn()
    wrapper.vm.$mobile.parseModems = vi.fn().mockReturnValueOnce(modemStatus)
    await wrapper.vm.getData()
    expect(wrapper.vm.dataStatus).toEqual(dataStatus)
    expect(wrapper.vm.modemList).toEqual(modemStatus)
    expect(wrapper.vm.formOptions.ntpInfo).toEqual(ntpData[0])
    expect(wrapper.vm.formOptions.simSwitch).toEqual(simSwitchData)
    expect(wrapper.vm.interfaces).toEqual([ifaceConfig[0]])
  })
  it('returns parseCard when SMS tab opened', () => {
    const section = { id: 'cfg01aa0e' }
    const res = {
      badge: {
        size: 'sm',
        text: 'Off',
        type: 'error'
      },
      columns: [],
      item: {
        id: 'cfg01aa0e'
      },
      name: 'SIM'
    }
    wrapper.vm.type = 'sms'
    wrapper.vm.simStatus = [{ id: 'cfg01aa0e', sim: '1', sms_limit_enabled: '0' }]
    wrapper.vm.parseSMSLimit = vi.fn().mockReturnValue([])
    wrapper.vm.parseMobileDataLimit = vi.fn().mockReturnValue([])
    expect(wrapper.vm.parseCard(section)).toEqual(res)
  })
  it('returns parseCard when Data tab opened', () => {
    const section = { id: 'mob1' }
    const res = {
      badge: {
        size: 'sm',
        text: 'Off',
        type: 'error'
      },
      columns: [],
      item: {
        id: 'mob1'
      },
      name: 'mob1'
    }
    wrapper.vm.type = 'data'
    wrapper.vm.dataStatus = [{ id: 'mob1', sim: '1', mob_limit_enabled: '0' }]
    wrapper.vm.parseSMSLimit = vi.fn().mockReturnValue([])
    wrapper.vm.parseMobileDataLimit = vi.fn().mockReturnValue([])
    expect(wrapper.vm.parseCard(section)).toEqual(res)
  })
  it('returns parsed mobile data limit data', () => {
    const config = { id: 'cfg01aa0e', period: 'day' }
    const status = { id: 'cfg01aa0e', enabled: '1', data_used: '100', data_limit: '200', due_reset_time: '1717966800', data_warning_enabled: '1' }
    const res = [
      [
        {
          class: 'success',
          label: 'Status',
          value: 'On'
        },
        {
          label: 'SIM',
          value: '1'
        }
      ],
      [
        {
          label: 'Reset period',
          value: 'day'
        },
        {
          class: 'success',
          hint: [],
          label: 'Data used / limit',
          value: '100 B / 200 B'
        }
      ],
      [
        {
          label: 'Clear due',
          value: '2024-06-09 21:00:00'
        },
        {
          class: 'success',
          label: 'SMS warning',
          value: 'Enabled'
        }
      ]
    ]
    wrapper.vm.showSim = vi.fn().mockReturnValue('1')
    expect(wrapper.vm.parseMobileDataLimit(config, status)).toEqual(res)
  })
  it('returns parsed SMS limit data', () => {
    const data = { sms_limit_enabled: '1', sms_limit_period: 'day', sms_sent: '1', sms_limit: '10', sms_due_reset_time: '1717966800' }
    const res = [
      [
        {
          class: 'success',
          label: 'Status',
          value: 'On'
        }
      ],
      [
        {
          label: 'Reset period',
          value: 'day'
        },
        {
          class: 'success',
          label: 'SMS sent / limit',
          value: '1 / 10'
        }
      ],
      [
        {
          label: 'Clear due',
          value: '2024-06-09 21:00:00'
        }
      ]
    ]
    expect(wrapper.vm.parseSMSLimit(data)).toEqual(res)
  })
  it('check if clearLimit return error when request unsuccessful in SMS tab', async () => {
    wrapper.vm.$axios.post = vi.fn().mockRejectedValue({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.clearLimit(true, 'mob1')
    expect(spy).toHaveBeenCalledWith('SMS limit clear error')
  })
  it('check if clearLimit return error when request unsuccessful in Data tab', async () => {
    wrapper.vm.$axios.post = vi.fn().mockRejectedValue({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.clearLimit(false, 'mob1')
    expect(spy).toHaveBeenCalledWith('Interface is currently inactive, only available if interface is active')
  })
  it('check if clearLimit returns success message when request successful in SMS tab', async () => {
    const data = [{ id: '1', name: 'test' }]
    wrapper.vm.type = 'sms'
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({ data })
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.clearLimit(true, 'mob1')
    expect(spy).toHaveBeenCalledWith('SMS limit cleared successfully')
  })
  it('check if clearLimit returns success message when request successful in Data tab', async () => {
    const data = [{ id: '1', name: 'test' }]
    wrapper.vm.type = 'data'
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce({ data })
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.clearLimit(false, 'mob1')
    expect(spy).toHaveBeenCalledWith('Data limit cleared successfully')
  })
  it.each([
    ['Data tab open', 'mob1', '3-1', '2', 'data', '2 (Primary modem)'],
    ['SMS tab open', '1', '2-1', '1', 'sms', '1 (External modem)'],
    ['SMS tab open and eSIM inserted', '1', '3-1', '1 (eSIM2)', 'sms', '1 (eSIM2) (Primary modem)']
  ])('returns showSim when %s', (text, id, modemId, simText, tab, res) => {
    wrapper.vm.type = tab
    wrapper.vm.$mobile.shouldShowModemName = vi.fn().mockReturnValue('Primary modem')
    wrapper.vm.$mobile.getSimLabel = vi.fn().mockReturnValue(simText)
    wrapper.vm.interfaces = [{ id: 'mob1', proto: 'wwan', sim: '2', modem: '3-1' }]
    wrapper.vm.modemList = [{ id: '3-1', name: 'Primary modem', builtin: true, active_sim: 1 }]
    expect(wrapper.vm.showSim(id, modemId)).toEqual(res)
  })
  it.each([
    ['SMS tab open and instance is not setup', 'sms', { id: 'cfg01aa0e' }, 'Disabled because limit is not configured'],
    ['SMS tab open and instance is setup', 'sms', { id: 'cfg01aa0e', sms_limit_num: '1' }, false],
    ['Data tab open and instance is not setup', 'data', { id: 'cfg01aa0e' }, 'Disabled because limit is not configured'],
    ['Data tab open and instance is not setup 2', 'data', { id: 'cfg01aa0e', data_limit: '1', enable_warning: '1' }, 'Disabled because limit is not configured'],
    ['Data tab open and instance is setup', 'data', { id: 'cfg01aa0e', data_limit: '1' }, false]
  ])('returns value when %s in disableSwitch', (text, tab, section, res) => {
    wrapper.vm.type = tab
    expect(wrapper.vm.disableSwitch(section)).toEqual(res)
  })
})

describe('MobileSmsLimitEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MobileSmsLimitEdit, {
      global: {
        provide: {
          formOptions: () => {
            return {
              modemList: [],
              ntpInfo: {},
              simSwitch: []
            }
          }
        },
        mocks: {
          $mobile: {
            getSimModemLabel: vi.fn().mockReturnValueOnce('1')
          }
        }
      },
      propsData: {
        section: {
          id: '1',
          modem: '1-1',
          enabled: '1'
        }
      }
    })
  })
  it('checks if prompt is shown and invokes onOk function', async () => {
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({ success: true })
    wrapper.vm.onOk = vi.fn()
    await wrapper.vm.clearSmsLimit()
    await wrapper.vm.onOk()
    expect(wrapper.vm.onOk).toHaveBeenCalledTimes(1)
  })
  it.each([
    ['day', 'Specify the hour (in 24-hour format) when the SMS limit reset occurs.'],
    ['week', 'Specify the day of the week when the SMS limit reset occurs.'],
    ['month', 'Specify the day of the month when the SMS limit reset occurs.']
  ])('returns period hint when period is %s', (period, res) => {
    expect(wrapper.vm.periodHint({ sms_limit: period })).toEqual(res)
  })

  it('shows error message when SIM switch with SMS limit rule enabled', async () => {
    wrapper.vm.checkSimSwitchSmsRule = vi.fn().mockReturnValueOnce({ isValid: false, message: 'Cannot disable because SIM switch rule enabled' })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const self = { model: '0' }
    await wrapper.vm.onLimitChange(self)
    expect(spy).toHaveBeenCalledWith('Cannot disable because SIM switch rule enabled')
    expect(self.model).toEqual('1')
  })
})

describe('useMobileLimitsUtils.ts', () => {
  it.each([
    [1, 31, false, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31']],
    [
      0,
      23,
      true,
      [
        ['0', '00:00'],
        ['1', '01:00'],
        ['2', '02:00'],
        ['3', '03:00'],
        ['4', '04:00'],
        ['5', '05:00'],
        ['6', '06:00'],
        ['7', '07:00'],
        ['8', '08:00'],
        ['9', '09:00'],
        ['10', '10:00'],
        ['11', '11:00'],
        ['12', '12:00'],
        ['13', '13:00'],
        ['14', '14:00'],
        ['15', '15:00'],
        ['16', '16:00'],
        ['17', '17:00'],
        ['18', '18:00'],
        ['19', '19:00'],
        ['20', '20:00'],
        ['21', '21:00'],
        ['22', '22:00'],
        ['23', '23:00']
      ]
    ],
    [
      5,
      10,
      true,
      [
        ['5', '05:00'],
        ['6', '06:00'],
        ['7', '07:00'],
        ['8', '08:00'],
        ['9', '09:00'],
        ['10', '10:00']
      ]
    ]
  ])('returns number options, between %s and %s', (start, end, showMinutes, res) => {
    expect(useMobileLimitsUtils().numberOptions(start, end, showMinutes)).toEqual(res)
  })
  it('checks if SIM switch SMS rule validation fails when SIM switch and SMS rule is enabled', () => {
    expect(useMobileLimitsUtils().checkSimSwitchSmsRule({ modem: '3-1', position: '1' }, [{ modem: '3-1', position: '1', enabled: '1', sms_limit: '1' }])).toEqual({
      isValid: false,
      message: 'Cannot disable because SIM switch rule enabled'
    })
  })
  it('checks if SIM switch Data rule validation fails when SIM switch and Data rule is enabled', () => {
    expect(useMobileLimitsUtils().checkSimSwitchDataRule({ modem: '3-1', sim: '1' }, [{ modem: '3-1', position: '1', enabled: '1', data_limit: '1' }])).toEqual({
      isValid: false,
      message: 'Cannot disable because SIM switch rule enabled'
    })
  })
})
