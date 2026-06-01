import createWrapper from '@tests/unit/mockFactory'
import Dnp3CommonInterfaceFields from '../../src/views/services/Dnp3CommonInterfaceFields'

vi.mock('@/composables/useUniversalGatewayUtils', () => ({
  useUniversalGatewayUtils: vi.fn(() => ({
    getTagSize: vi.fn()
  }))
}))

describe('Dnp3CommonInterfaceFields.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Dnp3CommonInterfaceFields, {
      stubs: {
        'vuci-typed-section': { template: '<div />' }
      },
      propsData: {
        section: { id: 'dsdqe233', '.type': 'instance' },
        uciData: { dsdqe233: { '.type': 'instance', id: 'dsdqe233' } },
        tcpClient: true
      }
    })
  })
  it.each`
    value   | index   | isValid
    ${'10'} | ${'1'}  | ${true}
    ${'10'} | ${'10'} | ${true}
    ${'1'}  | ${'10'} | ${false}
    ${'10'} | ${'5'}  | ${true}
    ${''}   | ${''}   | ${true}
  `('returns isValid: $isValid when value: $value, index: $index', ({ value, index, isValid }) => {
    const result = wrapper.vm.validateCount(value, { uciSection: { index } })
    expect(result.isValid).toBe(isValid)
  })
  it('calls validation function', () => {
    const spy = vi.fn()
    wrapper.vm.updateCountValidations({
      vuciSection: { validate: spy }
    })
    expect(spy).toBeCalled()
  })
})
