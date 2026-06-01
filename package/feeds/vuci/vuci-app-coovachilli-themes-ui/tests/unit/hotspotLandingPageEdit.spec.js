import HotspotLandingpageEdit from '../../src/views/services/HotspotLandingpageEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('HotspotLandingPageEdit.vue', () => {
  it.each([
    ['success.htm', 'test', 'Success page template'],
    ['success.htm', 'name', 'Success']
  ])('returns file display value', (value, type, response) => {
    const wrapper = createWrapper(HotspotLandingpageEdit, { props: { section: { id: 'bac' } } })
    expect(wrapper.vm.loadDisplayValue(value, type)).toEqual(response)
  })
})
