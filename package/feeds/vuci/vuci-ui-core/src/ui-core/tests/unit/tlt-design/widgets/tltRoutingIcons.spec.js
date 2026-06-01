import tltRoutingIcons from '@ui-core/tlt-design/widgets/tltRoutingIcons.vue'
import { RouterLinkStub } from '@vue/test-utils'
import createWrapper from '../../mockFactory'

describe('tltRoutingIcons.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(tltRoutingIcons, { stubs: { RouterLink: RouterLinkStub, 'tlt-hint': true } })
  })
  it('check if tltRoutingIcons.vue component exists', () => {
    expect(wrapper.findComponent(tltRoutingIcons).exists()).toBe(true)
  })
  it.each`
    propName          | propValue
    ${'servicesPath'} | ${'/service/test'}
    ${'statusPath'}   | ${'/status/test'}
  `('check if $propName prop is passed', ({ propName, propValue }) => {
    wrapper = createWrapper(tltRoutingIcons, {
      propsData: { [propName]: propValue },
      stubs: { RouterLink: RouterLinkStub, 'tlt-hint': true }
    })
    expect(wrapper.props()[propName]).toBe(propValue)
  })
})
