import TltHint from '@ui-core/tlt-design/widgets/TltHint.vue'
import createWrapper from '../../mockFactory'

describe('TltHint.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(TltHint)
  })
  it('check if TltHint.vue component exists', () => {
    expect(wrapper.findComponent(TltHint).exists()).toBe(true)
  })
  it.each`
    propName         | propValue
    ${'breakWords'}  | ${true}
    ${'hints'}       | ${[{ info: '<div><strong>Do not remove the external storage device while the expansion is enabled. Installed packages and files will be lost.</strong><br><strong>No important data on the external storage device as it will be wiped during Expansion setup.</strong><br>Changes made to the device cofiguration while expansion was enabled will disappear after it is disabled.<br>You can expand the memory of your router with a USB Mass Storage Device (MSD) or SD.<br>You can use the extra memory to install additional software packages fitting your needs.<br>To be eligible for router memory expansion, the MSD must qualify the following imposed restrictions: <br>• The MSD must be the last one inserted. <br>• If you are using a USB hub, the target MSD must be the last one attached to the hub.<br></div>' }]}
    ${'rawhtml'}     | ${true}
    ${'showOnClick'} | ${false}
  `('check if $propName prop is passed', ({ propName, propValue }) => {
    wrapper = createWrapper(TltHint, { propsData: { [propName]: propValue } })
    expect(wrapper.props()[propName]).toEqual(propValue)
  })
  it.each`
    type        | value                                      | result
    ${'array'}  | ${['<div>Test</div>', '<div>Test2</div>']} | ${'<div>Test</div> , <div>Test2</div>'}
    ${'string'} | ${'<div>Test</div>'}                       | ${'<div>Test</div>'}
  `('returns parseValues method when argument is $type ', ({ value, result }) => {
    expect(wrapper.vm.parseValues(value)).toEqual(result)
  })
  it('expect parsed value', async () => {
    wrapper = createWrapper(TltHint, { propsData: { rawhtml: true, hints: [{ info: '<div>Test</div>' }] } })
    expect(wrapper.text()).toContain('Test')
  })
  it('render text in slot', () => {
    wrapper = createWrapper(TltHint, { slots: { default: 'Main Content' } })
    expect(wrapper.html()).toContain('Main Content')
  })
})
