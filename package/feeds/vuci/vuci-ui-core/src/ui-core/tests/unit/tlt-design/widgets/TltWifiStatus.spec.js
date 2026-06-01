import TltWifiStatus from '@ui-core/tlt-design/widgets/TltWifiStatus.vue'
import createWrapper from '../../mockFactory'

describe('TltWifiStatus.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(TltWifiStatus, { mocks: { $t: string => string } })
  })
  it.each`
    up       | result
    ${false} | ${'OFF'}
    ${true}  | ${'ON'}
  `('when prop up is $up result is $result', ({ up, result }) => {
    wrapper = createWrapper(TltWifiStatus, { propsData: { up } })
    expect(wrapper.text()).toContain(result)
  })
})
