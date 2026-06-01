import { useEventsJugglerModuleData } from '../../src/components/services/modules/useEventsJugglerModuleData'
import createWrapper from '@tests/unit/mockFactory'
import { defineComponent } from 'vue'
import { utils } from '@/plugins/utils'
import { useCertificatesStore } from '@/stores/certificates'

describe('useEventsJugglerModuleData.ts', () => {
  let wrapper
  let certificatesStore
  const TestComponent = defineComponent({
    props: { data: { type: Object, default: () => {} } },
    setup(props) {
      return {
        ...useEventsJugglerModuleData(props.data)
      }
    }
  })

  beforeEach(() => {
    wrapper = createWrapper(TestComponent, {
      props: {
        data: { s: { plugin: 'a', io_name: '1' }, moduleName: 'b' }
      }
    })
    certificatesStore = useCertificatesStore()
    certificatesStore.generatedCertificates = [
      { cert_type: 'ca', type: 'cert', fullname: 'test1', path: 'test1_p' },
      { cert_type: 'import', type: 'cert', fullname: 'test2', path: 'test2_p' },
      { cert_type: 'root_ca', type: 'cert', fullname: 'test3', path: 'test3_p' },
      { cert_type: 'root_ca', type: 'wrong_type', fullname: 'test4', path: 'test4_p' },
      { cert_type: 'client', type: 'cert', fullname: 'test5', path: 'test5_p' },
      { cert_type: 'server', type: 'cert', fullname: 'test6', path: 'test6_p' },
      { type: 'key', fullname: 'test7', path: 'test7_p' }
    ]
  })

  it('isTypeSelected returns', async () => {
    expect(wrapper.vm.isTypeSelected).toEqual(false)
    wrapper = createWrapper(TestComponent, { props: { data: { s: { plugin: 'a' }, moduleName: 'a' } } })
    expect(wrapper.vm.isTypeSelected).toEqual(true)
  })

  it('getCertOptionsForNonRequired filters certificateData', () => {
    expect(wrapper.vm.getCertOptionsForNonRequired).toEqual([
      ['', 'None'],
      ['test3_p', 'test3'],
      ['test5_p', 'test5'],
      ['test6_p', 'test6']
    ])
    certificatesStore.generatedCertificates = []
    expect(wrapper.vm.getCertOptionsForNonRequired).toEqual([])
  })

  describe('getIoProps returns data', () => {
    it.each([
      ['max', '0', '1', 'voltage', { label: 'Max voltage value', help: 'Specifies maximum voltage value of analog pin.', placeholder: '12.5', rules: ['range(0,24)'] }],
      ['max', '0', '1', 'current', { label: 'Max current value', help: 'Specifies maximum current value of analog pin.', placeholder: '12.5', rules: ['range(4,20)'] }],
      ['max', '0', '1', 'percent', { label: 'Max percent value', help: 'Specifies maximum percent value of analog pin.', placeholder: '100', rules: ['range(0,100)'] }],
      ['max', '0', '1', '', { label: 'Max voltage value', help: 'Specifies maximum voltage value of analog pin.', placeholder: '12.5', rules: ['range(0,24)'] }],
      ['min', '0', '1', 'voltage', { label: 'Min voltage value', help: 'Specifies minimum voltage value of analog pin.', placeholder: '0.0', rules: ['range(0,24)'] }],
      ['min', '0', '1', 'current', { label: 'Min current value', help: 'Specifies minimum current value of analog pin.', placeholder: '4.0', rules: ['range(4,20)'] }],
      ['min', '0', '1', 'percent', { label: 'Min percent value', help: 'Specifies minimum percent value of analog pin.', placeholder: '0', rules: ['range(0,100)'] }],
      ['min', '0', '1', '', { label: 'Min voltage value', help: 'Specifies minimum voltage value of analog pin.', placeholder: '0.0', rules: ['range(0,24)'] }]
    ])('returns io props with type: %s minValue: %s maxValue: %s aclValue: %s', (type, minValue, maxValue, aclValue, expected) => {
      const res = wrapper.vm.getIoProps(type, minValue, maxValue, aclValue)
      type == 'max' && res.rules.pop()
      expect(res).toEqual(expected)
    })
  })

  it('getSaveParameters returns joined parameters', () => {
    expect(wrapper.vm.getSaveParameters()).toEqual('')
    expect(wrapper.vm.getSaveParameters(['a', 'b'])).toEqual('a=b')
    expect(wrapper.vm.getSaveParameters(['a', 'b'], ',')).toEqual('a,b')
  })

  it('getParameterProps returns parameter props', () => {
    const res = wrapper.vm.getParameterProps({ test: 'test' })
    expect(res[0].rules('=')).toEqual({ isValid: false, message: 'All characters are allowed except =.' })
    expect(res[0].rules('')).toEqual({ isValid: true, message: 'All characters are allowed except =.' })
    delete res[0].rules
    expect(res).toEqual([
      { prop: 'ParamInput', maxlength: 128, required: true, test: 'test' },
      { prop: 'ParamSelect', options: [] }
    ])
  })

  it('isBidirectionalSelected returns', () => {
    expect(wrapper.vm.isBidirectionalSelected([{ id: '1', bi_dir: '0' }])).toEqual(false)
    expect(wrapper.vm.isBidirectionalSelected([{ id: '1', bi_dir: '1' }])).toEqual(true)
  })

  it('downloadLuaExampleFile displays error on failed download', () => {
    const utilsSpy = vi.spyOn(utils, 'downloadFileApi').mockRejectedValue(false)
    wrapper.vm.downloadLuaExampleFile('operations')
    expect(utilsSpy).toHaveBeenCalledWith('/api/event_juggler/operations/actions/download_example_operation_lua', 'text/plain', 'POST')
    wrapper.vm.downloadLuaExampleFile('conditions')
    expect(utilsSpy).toHaveBeenCalledWith('/api/event_juggler/conditions/actions/download_example_condition_lua', 'text/plain', 'POST')
  })
})
