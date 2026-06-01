import createWrapper from '@tests/unit/mockFactory'
import IoJugglerActions from '../../src/views/services/IoJugglerActions.vue'

const options = [
  ['email', 'Email'],
  ['dout', 'Output'],
  ['http', 'HTTP'],
  ['script', 'Script'],
  ['reboot', 'Reboot'],
  ['profile', 'Profile'],
  ['rms', 'RMS'],
  ['mqtt', 'MQTT']
]
const optionsWithWifi = [...options].concat([['wifi', 'WiFi']])
const optionsWithSimSwitch = [...options].concat([['sim_switch', 'SIM Switch']])
const optionsWithSMS = [...options].concat([['sms', 'SMS']])
const allOptions = [...options].concat([
  ['wifi', 'WiFi'],
  ['sim_switch', 'SIM Switch'],
  ['sms', 'SMS']
])

describe('IoJugglerActions.vue', () => {
  it.each([
    [[], 0],
    [[{ sim_count: 1 }], 1],
    [[{ sim_count: 1 }, { sim_count: 2 }], 2]
  ])('load sim count', (modemList, result) => {
    const wrapper = createWrapper(IoJugglerActions)
    const simcount = wrapper.vm.simCount(modemList)
    expect(simcount).toEqual(result)
  })
  it.each([
    [false, 0, [], options],
    [true, 0, [], optionsWithWifi],
    [false, 2, [], optionsWithSimSwitch],
    [false, 0, [{}], optionsWithSMS],
    [true, 2, [{}], allOptions]
  ])('loads type options', (wifi, simCount, modemList, result) => {
    const wrapper = createWrapper(IoJugglerActions)
    const options = wrapper.vm.typeOptions(wifi, simCount, modemList)
    expect(options).toEqual(result)
  })
  it.each([
    [[], { valid: true }],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { valid: false, message: 'Action limit reached, no more than 10 can be created' }],
    [[{ ui_name: 'test' }, { ui_name: 'test' }], { valid: false, message: 'Action with the same name already exists' }]
  ])('check if no more than 10 elements added ', (value, result) => {
    const wrapper = createWrapper(IoJugglerActions)
    expect(wrapper.vm.addValidate({ ui_name: 'test' }, value)).toEqual(result)
  })
  it.each([
    ['N/A', { iojuggler_actions: [{ type: 'test', ui_name: 'test' }] }],
    ['Email', { iojuggler_actions: [{ type: 'email', ui_name: 'test' }] }],
    ['Change SIM to SIM1', { iojuggler_actions: [{ type: 'sim_switch', ui_name: 'test' }] }],
    ['Change SIM to SIM2', { iojuggler_actions: [{ type: 'sim_switch', ui_name: 'test', target: '2' }] }]
  ])('formats type value', (result, formData) => {
    const wrapper = createWrapper(IoJugglerActions)
    wrapper.vm.formData = formData
    expect(wrapper.vm.displayType('test')).toEqual(result)
  })
  const successData = [
    { success: true, data: ['conditions'] },
    { success: true, data: ['io'] },
    { success: true, data: ['email'] },
    { success: true, data: ['phone'] },
    { success: true, data: ['sim'] },
    { success: true, data: ['status'] },
    { success: true, data: ['profiles'] },
    { success: true, data: ['options'] },
    { success: true, data: ['devices'] }
  ]
  const falseData = [
    { success: false, data: ['conditions'] },
    { success: false, data: ['io'] },
    { success: false, data: ['email'] },
    { success: false, data: ['phone'] },
    { success: false, data: ['sim'] },
    { success: false, data: ['status'] },
    { success: false, data: ['profiles'] },
    { success: false, data: ['options'] },
    { success: false, data: ['devices'] }
  ]
  it.each([
    [successData, 0],
    [falseData, 9]
  ])('loads device data', async (data, times) => {
    const wrapper = createWrapper(IoJugglerActions)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(data)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledTimes(times)
  })
  it('invokes error message when bulk fails', async () => {
    const wrapper = createWrapper(IoJugglerActions)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
})
