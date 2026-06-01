import createWrapper from '../../mockFactory'
import TltOverviewCardType from '../../../../tlt-design/overview/TltOverviewCardType.vue'
let wrapper
describe('TltOverviewCardType.vue', () => {
  beforeEach(() => {
    wrapper = createWrapper(TltOverviewCardType, {
      propsData: {
        item: {},
        widget: {
          title: 'test',
          content: [{ title: 'test', info: 'test' }]
        }
      }
    })
  })
  it('check if component is rendered', () => {
    expect(wrapper).toBeTruthy()
  })
})
