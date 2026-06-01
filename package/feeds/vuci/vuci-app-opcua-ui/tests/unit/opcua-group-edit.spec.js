import createWrapper from '@tests/unit/mockFactory'
import OpcuaGroupEdit from '../../src/views/services/OpcuaGroupEdit.vue'

const groupValue = [
  {
    id: 'val',
    '.type': 'value_Value'
  }
]

function assertResultEqual(actual, expected) {
  if (expected.isValid) {
    expect(actual?.isValid).toBeTruthy()
  } else {
    expect(actual?.isValid).toBeFalsy()
    expect(actual?.message).toEqual(expected.message)
  }
}

describe('OpcuaGroupEdit.vue', () => {
  it.each`
    title                            | name       | returnedValue
    ${'hint if instance'}            | ${'Value'} | ${{ isValid: false, message: "Instance 'Value' already exists" }}
    ${"nothing if instance doesn't"} | ${'Test'}  | ${{ isValid: true }}
  `('displays $title exist with the same name', ({ name, returnedValue }) => {
    const props = {
      section: {
        id: 'Value',
        '.type': 'value'
      }
    }
    const wrapper = createWrapper(OpcuaGroupEdit, { props })
    wrapper.vm.formData = { groupValue: [{ name: 'Value', '.type': 'value_Value' }] }
    const result = wrapper.vm.groupValueExists(name)
    assertResultEqual(result, returnedValue)
  })

  it.each`
    title                            | name       | returnedValue
    ${'hint if instance'}            | ${'Value'} | ${{ isValid: false, message: "Instance 'Value' already exists" }}
    ${"nothing if instance doesn't"} | ${'Test'}  | ${{ isValid: true }}
  `('displays $title exist with the same name in overview', async ({ name, returnedValue }) => {
    const wrapper = createWrapper(OpcuaGroupEdit, { props: { section: {} } })
    await wrapper.setData({ formData: { group: [{ name: 'Value' }, { name: 'Value' }] } })
    const result = wrapper.vm.groupExists(name)
    assertResultEqual(result, returnedValue)
  })

  it.each([
    [51, { isValid: false, message: 'Group value limit was reached (50 max)' }],
    [36, { isValid: true }]
  ])('checks group value limit validation', (length, expected) => {
    const section = { id: 'Value' }
    const wrapper = createWrapper(OpcuaGroupEdit, { props: { section } })
    wrapper.vm.formData = { groupValue: Array(length).fill(groupValue[0]) }
    const result = wrapper.vm.groupValueLimit()
    assertResultEqual(result, expected)
  })

  it('returns Value data', () => {
    const wrapper = createWrapper(OpcuaGroupEdit, { props: { section: {} } })
    const section = {
      '.type': 'value_2',
      enabled: '1',
      id: '4',
      name: 'm',
      postfix: '}',
      prefix: '{',
      replacement: 'null',
      server_node: '3'
    }
    wrapper.vm.formData = {
      serverNodes: [
        {
          '.type': 'server_node_1',
          id: '3',
          node_id: '123',
          ns: '1',
          test: '',
          type: '0'
        }
      ],
      server: [
        {
          enabled: '1',
          id: '1',
          identity: '0',
          security_mode: '0',
          timeout: '5000',
          url: 'opc.tcp://awd'
        }
      ]
    }

    expect(wrapper.vm.getGroupValueTestData(section)).toEqual({
      group_value: {
        postfix: '}',
        prefix: '{',
        replacement: 'null'
      },
      server_node: {
        node_id: '123',
        ns: '1',
        type: '0'
      },
      server: {
        identity: '0',
        security_mode: '0',
        timeout: '5000',
        url: 'opc.tcp://awd'
      }
    })
  })
})
