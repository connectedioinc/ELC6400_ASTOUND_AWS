import IoStatusFormulaInput from '../../src/components/services/io-formula/IoStatusFormulaInput.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('IoStatusFormula.vue', () => {
  let wrapper
  const formData = {
    custom_add: '',
    custom_mul: '',
    custom_div: '',
    custom_off: ''
  }
  beforeEach(() => {
    wrapper = createWrapper(IoStatusFormulaInput, {
      props: {
        formData,
        value: '',
        prop: '',
        placeholder: '',
        label: ''
      }
    })
  })
  it.each`
    value  | result
    ${'1'} | ${{ isValid: true, message: 'Value cannot be 0.' }}
    ${'0'} | ${{ isValid: false, message: 'Value cannot be 0.' }}
  `('returns $result when validating mul and div fields', ({ value, result }) => {
    expect(wrapper.vm.validateMD(value)).toEqual(result)
  })
})
