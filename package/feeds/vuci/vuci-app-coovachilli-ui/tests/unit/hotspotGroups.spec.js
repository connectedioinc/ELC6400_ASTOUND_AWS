import HotspotGroups from '../../src/views/services/HotspotGroups.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('HotspotGroups.vue', () => {
  it.each([
    ['incorrect', { name: 'test' }, { message: 'Group name is already in use', valid: false }],
    ['correct', { name: 't' }, { valid: true }]
  ])('Checks if form validation fails when group name is %s ', (value, text, result) => {
    const wrapper = createWrapper(HotspotGroups)
    wrapper.vm.formData = { groups: [{ name: 'test' }] }
    const val = wrapper.vm.addSection(text)
    expect(val).toEqual(result)
  })
  it.each([
    [500, '500 Mb/s'],
    ['', 'Unlimited']
  ])('When value is %s display value is %s', (text, result) => {
    const wrapper = createWrapper(HotspotGroups)
    expect(wrapper.vm.readMbs(text)).toEqual(result)
  })
  it.each([
    [500, '500 MB'],
    ['', 'Unlimited']
  ])('When value is %s display value is %s', (text, result) => {
    const wrapper = createWrapper(HotspotGroups)
    expect(wrapper.vm.readMb(text)).toEqual(result)
  })
  it.each([
    ['1', 'Day'],
    ['2', 'Week'],
    ['3', 'Month'],
    ['', '-']
  ])('When value is %s display value is %s', (text, result) => {
    const wrapper = createWrapper(HotspotGroups)
    expect(wrapper.vm.displayPeriod(text)).toEqual(result)
  })
})
