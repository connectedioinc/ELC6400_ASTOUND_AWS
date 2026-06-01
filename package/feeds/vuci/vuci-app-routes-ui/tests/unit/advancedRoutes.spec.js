import AdvancedRoutes from '../../src/views/network/AdvancedRoutes.vue'
import RoutesRulesEdit from '../../src/views/network/RoutesRulesEdit.vue'
import RoutingTableEdit from '../../src/views/network/RoutingTableEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Advanced routes tests', () => {
  it.each([
    ['exists', 'yay', 'yay'],
    ['doesnt exist', '', 'Automatic']
  ])('returns priority options when value %s', (text, data, response) => {
    const wrapper = createWrapper(AdvancedRoutes)
    const val = wrapper.vm.priority(data)
    expect(val).toEqual(response)
  })
  it.each([
    ['when type is system', 'system', false],
    ['when type isnt system', 'test', []]
  ])('returns default value %s', (text, data, response) => {
    const wrapper = createWrapper(AdvancedRoutes)
    const val = wrapper.vm.showError(data)
    expect(val).toEqual(response)
  })
  it.each([
    ['id exists', [{ table_id: '1' }], { table_id: '1' }, { message: '1 table ID is reserved for other table', valid: false }],
    ['name exists', [{ name: 'test', table_id: '1' }], { name: 'test', table_id: '2' }, { message: 'Table with test route name already exists', valid: false }],
    ['id is in excluded options', [{ name: 'test', table_id: '1' }], { name: 'test2', table_id: '255' }, { message: '255 table ID is reserved for other service or kernel', valid: false }],
    ['it is valid', [{ table_id: '1', name: 'test1' }], { table_id: '2', name: 'test2' }, { valid: true }]
  ])('returns validation results when %s', (text, section, add, response) => {
    const wrapper = createWrapper(AdvancedRoutes)
    const val = wrapper.vm.addValidate(add, section)
    expect(val).toEqual(response)
  })
  const props = {
    section: {
      id: 'test',
      table_id: '3',
      name: 'test'
    }
  }
  const formOptions = {
    interfaces: []
  }
  const formData = { table: [], rules: [] }
  it.each([
    [
      'when interfaces and vpns exist',
      [
        { id: 'test', name: 'test', proto: 'wireguard' },
        { id: 'testVpn', name: 'testVpn', proto: 'wireguard' }
      ],
      [
        ['test', 'test'],
        ['testVpn', 'testVpn']
      ]
    ],
    ['when interfaces and vpns dont exists', [], []]
  ])('maps interfaces %s', async (text, ifaces, response) => {
    const wrapper = createWrapper(AdvancedRoutes)
    wrapper.setData({ interfacesAndVpns: ifaces })
    const result = wrapper.vm.interfaceOptions
    expect(result).toEqual(response)
  })

  it('returns in interface options', () => {
    const wrapper = createWrapper(RoutesRulesEdit, { data: () => ({ formData }), props, global: { provide: { formOptions: () => formOptions, interfaces: () => [] } } })
    const val = wrapper.vm.inInterfaces
    expect(val).toEqual([['', 'Any']])
  })
  it('returns out interface options', () => {
    const wrapper = createWrapper(RoutesRulesEdit, { data: () => ({ formData }), props, global: { provide: { formOptions: () => formOptions, interfaces: () => [] } } })
    const val = wrapper.vm.outInterfaces
    expect(val).toEqual([['', 'None']])
  })
  it.each([
    [
      'when table exists',
      [
        { table_id: '1', name: 'test' },
        { table_id: '2', name: 'test2' }
      ],
      [
        ['1', 'test (1)'],
        ['2', 'test2 (2)']
      ]
    ],
    ['when table doesnt exist', [], [['nil', 'No routing tables found']]]
  ])('returns table options %s', (text, table, response) => {
    const wrapper = createWrapper(RoutesRulesEdit, { data: () => ({ formData: { table, rules: [] } }), props, global: { provide: { formOptions: () => formOptions, interfaces: () => [] } } })
    const result = wrapper.vm.tableOptions
    expect(result).toEqual(response)
  })
  it.each([
    ['when rule exists', [{ priority: '1' }, { priority: '2' }], ['1', '2']],
    ['when rule doesnt exist', [], [['nil', 'No routing rules found']]]
  ])('returns table options %s', (text, rules, response) => {
    const wrapper = createWrapper(RoutesRulesEdit, { data: () => ({ formData: { rules, table: [] } }), props, global: { provide: { formOptions: () => formOptions, interfaces: () => [] } } })
    const result = wrapper.vm.ruleOptions
    expect(result).toEqual(response)
  })
  it.each`
    value            | isValid
    ${'0xfF'}        | ${true}
    ${'0x0/0x1'}     | ${true}
    ${'0xfffffffff'} | ${false}
    ${'0xq'}         | ${false}
    ${'0x0/0x0/0x0'} | ${false}
  `('returns result of extended subnet validation #%#', ({ value, isValid }) => {
    const wrapper = createWrapper(RoutesRulesEdit, { data: () => ({ formData }), props, global: { provide: { formOptions: () => formOptions, interfaces: () => [] } } })
    expect(wrapper.vm.validateMark(value).isValid).toEqual(isValid)
  })
  it.each([
    ['when interfaces and vpns exist', ['test', ['testVpn', 'testVpn']], ['test', ['testVpn', 'testVpn']]],
    ['when interfaces and vpns dont exists', [], []]
  ])('returns interfaces %s', (text, ifaces, response) => {
    const wrapper = createWrapper(RoutingTableEdit, { props, global: { provide: { formOptions: () => formOptions, interfaces: ifaces } } })
    const result = wrapper.vm.interfaces
    expect(result).toEqual(response)
  })
  it('returns section id', () => {
    const wrapper = createWrapper(RoutingTableEdit, { props, global: { provide: { formOptions: () => formOptions, interfaces: () => [] } } })
    wrapper.vm.setID()
    expect(wrapper.vm.id).toEqual('test')
  })
  it.each([
    ['when table id exists', [{ table_id: '3' }, { table_id: '3' }], 'Table with this route table ID already exists'],
    [
      'when table name exists',
      [
        { id: 'test4', name: 'test' },
        { id: 'test', name: 'test' }
      ],
      'Table with this route table name already exists'
    ]
  ])('returns validation results %s', async (text, table, response) => {
    const wrapper = createWrapper(RoutingTableEdit, { props, global: { provide: { formOptions: () => formOptions, interfaces: () => [] } } })
    wrapper.vm.formData = { table }
    await expect(wrapper.vm.validate()).rejects.toEqual(response)
  })
  it('resolved validation', async () => {
    const wrapper = createWrapper(RoutingTableEdit, { props, global: { provide: { formOptions: () => formOptions, interfaces: () => [] } } })
    wrapper.vm.formData = { table: [{ id: '7', name: 's' }] }
    await expect(wrapper.vm.validate()).resolves.toEqual()
  })
})
