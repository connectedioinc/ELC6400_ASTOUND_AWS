import createWrapper from '../../mockFactory'
import TltCardRow from '../../../../tlt-design/overview/TltCardRow.vue'

describe('TltCardRow.vue', () => {
  it('checks if component is rendered', async () => {
    const wrapper = createWrapper(TltCardRow, {
      propsData: {
        value: 'some text'
      },
      stubs: ['tlt-overflow-hint']
    })
    expect(wrapper).toBeTruthy()
  })
})
