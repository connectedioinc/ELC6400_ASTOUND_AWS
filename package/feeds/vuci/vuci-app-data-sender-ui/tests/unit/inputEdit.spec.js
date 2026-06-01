import InputEdit from '../../src/views/services/InputEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Collection section', () => {
  let wrapper

  const section = { id: '3', mqtt_in_password: 'set', mqtt_in_psk: 'set', name: 'inpt1', mqtt_in_tls: '0' }

  beforeEach(() => {
    wrapper = createWrapper(InputEdit, {
      props: {
        section,
        tltCardUciData: { inputs: [{ id: '3' }, { id: '4' }] }
      }
    })
    wrapper.setData({
      formData: {
        collection: [{ id: '1', input: ['3'], format_str: '%formatStr%' }],
        outputs: [{ id: '2' }],
        inputs: [{ id: '3' }, { id: '4' }]
      }
    })
  })
  it.each`
    initialName    | promise       | mqttCerts | result
    ${'inpt1'}     | ${'resolves'} | ${true}   | ${undefined}
    ${'aaa'}       | ${'resolves'} | ${true}   | ${undefined}
    ${'aaa'}       | ${'resolves'} | ${false}  | ${undefined}
    ${'formatStr'} | ${'rejects'}  | ${true}   | ${'Cannot modify data input name when it is used in collection "Format String" field'}
  `('returns undefined when section is not enabled', async ({ initialName, promise, mqttCerts, result }) => {
    await wrapper.setProps({ section: { id: '3', name: 'inpt1', mqtt_in_tls: '1', mqtt_in_cafile: '0' } })
    wrapper.setData({
      initialName,
      mqttCerts
    })
    await expect(wrapper.vm.validate())[promise].toEqual(result)
  })
})
