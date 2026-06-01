import createWrapper from '@ui-core/tests/unit/mockFactory'
import TltOverviewSideWidget from '@ui-core/tlt-design/overview/TltOverviewSideWidget.vue'
let wrapper
describe('TltOverviewSideWidget.vue', () => {
  beforeEach(() => {
    wrapper = createWrapper(TltOverviewSideWidget)
  })
  it('check if component is rendered', () => {
    expect(wrapper).toBeTruthy()
  })
  it('toggles the enabled property of the item', () => {
    const wrapper = createWrapper(TltOverviewSideWidget)
    const item = { enabled: '1' }

    wrapper.vm._checkCheckBox(false, item)
    expect(item.enabled).toBe('0')

    wrapper.vm._checkCheckBox(true, item)
    expect(item.enabled).toBe('1')
  })

  it('resets the body styles when opened is false', async () => {
    document.body.style = {}
    await wrapper.setData({ opened: '' })

    expect(document.body.style.paddingRight).toEqual('')
  })
})
