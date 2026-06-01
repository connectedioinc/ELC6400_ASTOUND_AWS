import loadRealtime from '../../src/views/status/LoadRealtime.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('LoadRealtime.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(loadRealtime)
  })
  it.each`
    value                 | expectedResult
    ${4.129166666666666}  | ${'4.13'}
    ${0.8333333333333334} | ${'0.83'}
    ${99.99999}           | ${'100.00'}
  `('formats value $value to $expectedResult', ({ value, expectedResult }) => {
    expect(wrapper.vm.formatCardValue(value)).toEqual(expectedResult)
  })
  it.each`
    value        | expectedResult
    ${4.5}       | ${'4.5%'}
    ${42.833333} | ${'42.8%'}
    ${99.99999}  | ${'100.0%'}
    ${40}        | ${'40%'}
    ${20}        | ${'20%'}
    ${100}       | ${'100%'}
  `('formats value $value to $expectedResult', ({ value, expectedResult }) => {
    expect(wrapper.vm.formatChartValue(value)).toEqual(expectedResult)
  })
})
