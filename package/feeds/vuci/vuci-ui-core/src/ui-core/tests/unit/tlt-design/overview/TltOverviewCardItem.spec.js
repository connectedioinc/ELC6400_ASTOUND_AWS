import createWrapper from '../../mockFactory'
import TltOverviewCardItem from '../../../../tlt-design/overview/TltOverviewCardItem.vue'
let wrapper
describe('TltOverviewCardItem.vue', () => {
  beforeEach(() => {
    wrapper = createWrapper(TltOverviewCardItem)
  })
  it('check if component is rendered', () => {
    expect(wrapper).toBeTruthy()
  })
})
