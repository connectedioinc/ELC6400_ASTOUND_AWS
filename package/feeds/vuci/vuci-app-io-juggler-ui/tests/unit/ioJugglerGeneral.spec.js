import IoJugglerGeneral from '../../src/views/services/IoJugglerGeneral.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('IoJugglerGeneral.vue', () => {
  let wrapper

  beforeEach(() => {
    wrapper = createWrapper(IoJugglerGeneral, {
      global: {
        mocks: {
          $notification: {
            warning: vi.fn()
          }
        }
      }
    })
  })

  it.each([
    [[{ id: 'test', name_with_pins: 'test_name_with_pins' }], 'test', 'test_name_with_pins'],
    [[{ id: 'test', name_with_pins: 'test_name_with_pins' }], 'test2', 'N/A']
  ])('checks if pin value is parsed', (ioData, value, result) => {
    wrapper.vm.$io.getFilteredPinsInfo = vi.fn().mockReturnValueOnce(ioData)
    expect(wrapper.vm.displayPin(value)).toEqual(result)
  })
  it.each([
    [[], 0],
    [[{ bi_dir: '1' }], 1]
  ])('checks if meesage needs to be displayed', async (ioInfo, timesCalled) => {
    wrapper.vm.$io.getFilteredPinsInfo = vi.fn().mockReturnValueOnce(ioInfo)
    const spy = vi.spyOn(wrapper.vm.$notification, 'info')
    await wrapper.vm.jugglerInfoMessage(ioInfo)
    expect(spy).toHaveBeenCalledTimes(timesCalled)
  })
  it('checks if enabled can be turned off', () => {
    expect(wrapper.vm.validateEnable({ model: '0' })).toEqual(undefined)
  })
  it.each([
    [{ model: 1, uciSection: { enabled: '1', actions: [] } }, [], [], 1],
    [{ model: 1, uciSection: { enabled: '1', actions: ['test'] } }, [], [], 0],
    [{ model: 1, uciSection: { enabled: '1', actions: ['test'] } }, [{ id: 'test', dest: 'test' }], [{ enabled: '1', pin: 'test' }], 1],
    [{ model: 1, uciSection: { enabled: '1', actions: ['test'] } }, [{ id: 'test', dest: 'test' }], [{ enabled: '1', pin: 'test2' }], 0],
    [{ model: 1, uciSection: { enabled: '1', actions: ['test'] } }, [{ id: 'test', dest: 'test' }], [{ enabled: '0', pin: 'test' }], 0]
  ])('checks if enabled can be turned on', async (self, actions, scheduler, timesCalled) => {
    wrapper.setData({ actions })
    wrapper.setData({ schedulerData: scheduler })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.validateEnable(self)
    expect(spy).toHaveBeenCalledTimes(timesCalled)
    spy.mockClear()
  })
  it.each([
    [{ uciSection: { acl: 'percent', min_perc: '1', max_perc: '2' } }, 'Outside 1% - 2% range'],
    [{ uciSection: { acl: 'current', min_curr: '1', max_curr: '2' } }, 'Outside 1mA - 2mA range'],
    [{ uciSection: { name: 'test' } }, '-'],
    [{ uciSection: { trigger: 'trigger', min: '1', max: '2' } }, 'Trigger'],
    [{ uciSection: { inside: '1', min: '1', max: '2' } }, 'Inside 1V - 2V range'],
    [{ uciSection: { inside: '0', min: '1', max: '2' } }, 'Outside 1V - 2V range']
  ])('check if trigger is formatted correctly', async (self, result) => {
    expect(wrapper.vm.displayTrigger(null, self)).toEqual(result)
  })
  it.each([
    [[{ type: 'gpio', id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'gpio', direction: 'out', id: 'test', name_with_pins: 'test' }], []],
    [[{ type: 'gpio', bi_dir: '1', id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'gpio', direction: 'out', bi_dir: '1', id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'dwi', id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'acl', id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'adc', id: 'test', name_with_pins: 'test' }], [['test', 'test']]],
    [[{ type: 'test', id: 'test', name_with_pins: 'test' }], []]
  ])('filter pins', async (ioInfo, filteredData) => {
    wrapper.vm.$io.getFilteredPinsInfo = vi.fn().mockReturnValueOnce(ioInfo)
    const inputs = await wrapper.vm.inputOptions
    expect(inputs).toEqual(filteredData)
  })
  it('Checks if error messages are displayed after individual gets fails', async () => {
    const ioInfo = { success: false }
    const conditionsRes = { success: false }
    const actionsRes = { success: false }
    const scheduler = { success: false }
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([ioInfo, conditionsRes, actionsRes, scheduler])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledTimes(4)
  })
  it('Checks if error message is displated after afterLoad fails', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('Checks if data is set correctly in after load', async () => {
    const ioInfo = { success: true, data: ['ioInfo'] }
    const conditionsRes = { success: true, data: ['conditionsRes'] }
    const actionsRes = { success: true, data: ['actionsRes'] }
    const scheduler = { success: true, data: ['scheduler'] }
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([ioInfo, conditionsRes, actionsRes, scheduler])
    await wrapper.vm.afterLoad()
    expect(wrapper.vm.ioData).toEqual(['ioInfo'])
    expect(wrapper.vm.conditions).toEqual(['conditionsRes'])
    expect(wrapper.vm.actions).toEqual(['actionsRes'])
    expect(wrapper.vm.schedulerData).toEqual(['scheduler'])
  })
  it.each([
    ['with empty "actions" option', 'Missing required option: Actions', { id: 'test1', enabled: '1', actions: [] }],
    ['with empty "acl" option', 'Missing required option: ACL Property', { id: 'test1', enabled: '1', actions: ['test', 'test1'], name: 'acl', acl: '' }],
    [
      'with empty "min_curr" and "max_curr" options',
      'Missing required options: Min current, Max current',
      { id: 'test1', enabled: '1', actions: ['test', 'test1'], name: 'acl', acl: 'current', min_curr: '', max_curr: '' }
    ],
    [
      'with empty "min_perc" and "max_perc" options',
      'Missing required options: Min percent, Max percent',
      { id: 'test1', enabled: '1', actions: ['test', 'test1'], name: 'acl', acl: 'percent', min_perc: '', max_perc: '' }
    ],
    ['with empty "min" and "max" options', 'Missing required options: Min voltage, Max voltage', { id: 'test1', enabled: '1', actions: ['test', 'test1'], name: 'adc', min: '', max: '' }],
    ['with empty "trigger" option', 'Missing required option: Trigger', { id: 'test1', enabled: '1', actions: ['test', 'test1'], name: 'din', trigger: '' }]
  ])('returns error message when %s', (text, message, sectionValues) => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const data = {
      uciSection: sectionValues
    }
    wrapper.vm.validateEnable(data)
    expect(spy).toHaveBeenCalledWith(message)
  })
})
