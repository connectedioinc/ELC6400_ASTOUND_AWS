import createWrapper from '../../mockFactory'
import TltOverviewCard from '@ui-core/tlt-design/overview/TltOverviewCard.vue'

let wrapper
describe('TltOverviewCard.vue', () => {
  beforeEach(() => {
    wrapper = createWrapper(TltOverviewCard, {
      props: {
        item: {
          headerStyle: 'test'
        }
      }
    })
  })
  it('check if component is rendered', () => {
    expect(wrapper).toBeTruthy()
  })
})
