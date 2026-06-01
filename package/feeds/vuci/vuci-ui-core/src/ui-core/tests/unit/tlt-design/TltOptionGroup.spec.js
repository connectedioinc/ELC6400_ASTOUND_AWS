import createWrapper from '../mockFactory'
import TltOptionGroup from '@ui-core/tlt-design/layout/TltOptionGroup.vue'
describe('TltOptionGroup.vue', () => {
  it('isArray returns true if argument is array', () => {
    const wrapper = createWrapper(TltOptionGroup)
    expect(wrapper.vm.isArray([])).toEqual(true)
    expect(wrapper.vm.isArray({})).toEqual(false)
    expect(wrapper.vm.isArray(123)).toEqual(false)
    expect(wrapper.vm.isArray('asdasd')).toEqual(false)
  })
})
