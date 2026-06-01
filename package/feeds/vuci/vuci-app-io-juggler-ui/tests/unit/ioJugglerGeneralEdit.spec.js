import IoJugglerGeneralEdit from '../../src/views/services/IoJugglerGeneralEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
const provide = {
  ioData: () => [],
  actionsData: () => [],
  conditionsData: () => [],
  validateEnable: () => []
}
describe('IoJugglerGeneralEdit.vue', () => {
  it('checks if function calling validator', () => {
    const wrapper = createWrapper(IoJugglerGeneralEdit, { props: { section: {} }, global: { provide } })
    const self = { vuciSection: { validate: vi.fn() } }
    wrapper.vm.updateValidations(self)
    expect(self.vuciSection.validate).toHaveBeenCalled()
  })
  it.each([
    ['1', '2', { isValid: true }],
    ['2', '2', { isValid: false, message: 'Max value should be higher than min value' }]
  ])('check if current valid', async (min, max, result) => {
    const wrapper = createWrapper(IoJugglerGeneralEdit, { props: { section: {} }, global: { provide } })
    expect(wrapper.vm.validateMinMax(min, max)).toEqual(result)
  })
  it.each([
    [[], 'N/A'],
    [[{ id: 'test2', name_with_pins: 'test' }], 'N/A'],
    [[{ id: 'test', name_with_pins: 'test' }], 'test']
  ])('renders title', async (ioInfo, result) => {
    const wrapper = createWrapper(IoJugglerGeneralEdit, {
      props: { section: { name: 'test' } },
      global: {
        provide: {
          ioData: () => ioInfo,
          actionsData: () => [],
          conditionsData: () => [],
          validateEnable: () => []
        }
      }
    })
    const title = await wrapper.vm.title
    expect(title).toEqual(result)
  })
  it('resolves onBeforeSave', async () => {
    const wrapper = createWrapper(IoJugglerGeneralEdit, {
      props: { section: {} },
      global: {
        provide: {
          ioData: () => [],
          actionsData: () => [],
          conditionsData: () => [],
          validateEnable: () => []
        }
      }
    })
    wrapper.vm.section.actions = []
    wrapper.vm.section.conditions = []
    await expect(wrapper.vm.onBeforeSave()).resolves.toEqual(true)
  })
  it('reject action onBeforeSave', async () => {
    const wrapper = createWrapper(IoJugglerGeneralEdit, {
      props: { section: { actions: ['test1', 'test2'], conditions: [] } },
      global: {
        provide: {
          ioData: () => [],
          actionsData: () => [
            { ui_name: 'test1', type: 'io' },
            { ui_name: 'test2', type: 'io' }
          ],
          conditionsData: () => [],
          validateEnable: () => []
        }
      }
    })
    await expect(wrapper.vm.onBeforeSave()).rejects.toEqual("Can't use these actions because they are not fully configured: test1, test2")
  })
  it('reject conditions onBeforeSave', async () => {
    const wrapper = createWrapper(IoJugglerGeneralEdit, {
      props: { section: { actions: [], conditions: ['test1', 'test2'] } },
      global: {
        provide: {
          ioData: () => [],
          actionsData: () => [],
          conditionsData: () => [
            { ui_name: 'test1', type: 'email' },
            { ui_name: 'test2', type: 'email' }
          ],
          validateEnable: () => []
        }
      }
    })
    await expect(wrapper.vm.onBeforeSave()).rejects.toEqual("Can't use these conditions because they are not fully configured: test1, test2")
  })
})
