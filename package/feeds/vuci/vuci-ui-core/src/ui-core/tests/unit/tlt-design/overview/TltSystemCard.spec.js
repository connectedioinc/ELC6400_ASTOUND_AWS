import createWrapper from '../../mockFactory'
import TltSystemCard from '../../../../tlt-design/overview/TltSystemCard.vue'
let wrapper
describe('TltSystemCard.vue', () => {
  beforeEach(() => {
    wrapper = createWrapper(TltSystemCard, {
      propsData: {
        cards: [{ title: 'test' }]
      }
    })
  })
  it('check if component is rendered', () => {
    expect(wrapper).toBeTruthy()
  })
})
