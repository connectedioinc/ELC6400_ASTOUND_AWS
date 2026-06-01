import tltSignalBar from '@ui-core/tlt-design/widgets/tltSignalBar.vue'
import createWrapper from '../../mockFactory'

describe('tltSignalBar.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(tltSignalBar)
  })
  it.each`
    signal  | expectedValue
    ${null} | ${0}
    ${-51}  | ${4}
    ${-65}  | ${4}
    ${-80}  | ${3}
    ${-95}  | ${2}
    ${-110} | ${1}
    ${-115} | ${0}
  `('check singalStrength method when argument $signal result should be $expectedValue', async ({ signal, expectedValue }) => {
    wrapper = createWrapper(tltSignalBar, { propsData: { signal } })
    expect(wrapper.vm.singalStrength(wrapper.props().signal)).toEqual(expectedValue)
  })
  it.each`
    signal | expectedValue
    ${0}   | ${0}
    ${19}  | ${1}
    ${25}  | ${2}
    ${45}  | ${2}
    ${67}  | ${3}
    ${89}  | ${4}
  `('check wifiStrength method when argument $signal result should be $expectedValue', async ({ signal, expectedValue }) => {
    wrapper = createWrapper(tltSignalBar, { propsData: { signal } })
    expect(wrapper.vm.wifiStrength(wrapper.props().signal)).toEqual(expectedValue)
  })
})
