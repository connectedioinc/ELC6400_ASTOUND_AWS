import createWrapper from '../mockFactory'
import TltDropdown from '@ui-core/tlt-design/layout/TltDropdown.vue'

describe('TltDropdown.vue', () => {
  let wrapper
  const stubs = { 'tlt-option-group': { template: '<slot :option="{}" />' }, 'tlt-content-box': true }
  beforeEach(() => {
    wrapper = createWrapper(TltDropdown, { global: { stubs } })
  })
  it.each([
    { active: () => true, returns: true },
    { active: false, returns: false }
  ])('checks right if option is active', ({ active, returns }) => {
    expect(wrapper.vm.isOptionActive({ active })).toEqual(returns)
  })
  it('getProperties returns properties for next dropdown component that is passed to option', () => {
    const options = [1, 2, 3]
    const result = wrapper.vm.getProperties(options)
    expect(result).toEqual({
      border: false,
      placement: 'bottom-end',
      closeOnClick: true,
      open: false,
      openModifiers: undefined,
      onOptionClick: expect.any(Function),
      title: undefined
    })
  })
  it.each([
    { onOptionClick: null, closeOnClick: true, emitCalls: 2 },
    { onOptionClick: vi.fn(), closeOnClick: true, emitCalls: 1 },
    { onOptionClick: vi.fn(), closeOnClick: false, emitCalls: 0 }
  ])('%#: handleActionClick emits optionClick event if no callback is provided', async ({ onOptionClick, emitCalls, closeOnClick }) => {
    wrapper = createWrapper(TltDropdown, { global: { stubs }, props: { onOptionClick, closeOnClick } })
    const opt = { label: 'opt Test' }
    wrapper.vm.handleActionClick(opt)
    expect(Object.keys(wrapper.emitted())).toHaveLength(emitCalls)
  })
})
