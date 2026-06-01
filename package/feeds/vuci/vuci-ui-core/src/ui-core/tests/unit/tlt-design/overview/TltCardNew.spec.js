import createWrapper from '../../mockFactory'
import TltCardNew from '../../../../tlt-design/overview/TltCardNew.vue'
let wrapper
describe('TltDragAndDrop.vue', () => {
  beforeEach(() => {
    wrapper = createWrapper(TltCardNew, {
      propsData: {
        item: {
          name: 'test'
        }
      }
    })
  })
  it('check if component is rendered', () => {
    expect(wrapper).toBeTruthy()
  })
})
