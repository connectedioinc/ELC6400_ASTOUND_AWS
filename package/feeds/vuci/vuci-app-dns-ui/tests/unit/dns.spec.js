import Dns from '../../src/views/network/DNS.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'

describe('DNS.vue', () => {
  it('returns interface names', () => {
    const wrapper = createWrapper(Dns)
    wrapper.vm.interfaces = [{ id: 'lan' }, { id: 'mob' }]
    expect(wrapper.vm.interfaceNames).toEqual(['lan', 'mob'])
  })
  it('returns filtered active interface ids', () => {
    const wrapper = createWrapper(Dns)
    wrapper.vm.statuses = [
      { is_up: true, id: 'lan' },
      { is_up: false, id: 'wan' }
    ]
    expect(wrapper.vm.activeInterfaces).toEqual(['lan'])
  })
  it('returns filtered interfaces', () => {
    const wrapper = createWrapper(Dns)
    wrapper.vm.statuses = [
      { is_up: true, id: 'lan' },
      { is_up: false, id: 'wan' }
    ]
    wrapper.vm.interfaces = [{ id: 'lan' }, { id: 'mob' }]
    expect(wrapper.vm.filteredInterfaces).toEqual(['lan'])
  })
  it('loads statuses and interfaces with data', async () => {
    const defaultBulkData = [
      {
        success: true,
        data: [{ id: 'lan' }, { id: 'mob' }]
      },
      {
        success: true,
        data: [
          { is_up: true, id: 'lan' },
          { is_up: false, id: 'wan' }
        ]
      },
      {
        success: true,
        data: { enabled: true }
      }
    ]
    const wrapper = createWrapper(Dns)
    vi.spyOn(axios, 'bulkGet').mockResolvedValue(defaultBulkData)
    await wrapper.vm.loadInterfaceData()
    expect(wrapper.vm.interfaces).toEqual([{ id: 'lan' }, { id: 'mob' }])
    expect(wrapper.vm.statuses).toEqual([
      { is_up: true, id: 'lan' },
      { is_up: false, id: 'wan' }
    ])
    expect(wrapper.vm.httpsProxy).toEqual({ enabled: true })
  })
  it('invokes error messages for statuses and interfaces when requests are unsuccessful', async () => {
    const failBulkData = [{ success: false }, { success: false }, { success: false }]
    const wrapper = createWrapper(Dns)
    vi.spyOn(axios, 'bulkGet').mockResolvedValue(failBulkData)
    await wrapper.vm.loadInterfaceData()
    expect(wrapper.vm.interfaces).toEqual([])
    expect(wrapper.vm.statuses).toEqual([])
    expect(wrapper.vm.message.error).toHaveBeenCalledWith('Failed to load interfaces')
    expect(wrapper.vm.message.error).toHaveBeenCalledWith('Failed to load interface statuses')
    expect(wrapper.vm.message.error).toHaveBeenCalledWith('Failed to load HTTPS DNS proxy config')
  })
  it('invokes error message when bulk request fails', async () => {
    const wrapper = createWrapper(Dns)
    vi.spyOn(axios, 'bulkGet').mockRejectedValue([])
    await wrapper.vm.loadInterfaceData()
    expect(wrapper.vm.interfaces).toEqual([])
    expect(wrapper.vm.statuses).toEqual([])
    expect(wrapper.vm.message.error).toHaveBeenCalledWith('Unexpected error occurred')
  })
  it('returns DNS input props', () => {
    const prop1 = 'server_hostname'
    const prop2 = 'server_ipaddr'
    const expectedResult = [
      { prop: prop1, placeholder: 'example.org' },
      { prop: prop2, placeholder: '10.1.2.3' }
    ]
    const wrapper = createWrapper(Dns)
    expect(wrapper.vm.inputPropsDns(prop1, prop2)).toEqual(expectedResult)
  })
  it('loads and parses custom DNS forwardings values', () => {
    const wrapper = createWrapper(Dns)
    const values = ['/example.com/123.123.123.123', '/test/1.1.1.1']
    const expectedResult = ['example.com,123.123.123.123', 'test,1.1.1.1']
    expect(wrapper.vm.loadParseDns(values)).toEqual(expectedResult)
  })
  it('writes and parses custom DNS forwardings values', () => {
    const wrapper = createWrapper(Dns)
    const values = ['example.com', '123.123.123.123']
    const expectedResult = '/example.com/123.123.123.123'
    expect(wrapper.vm.writeParseDns(values)).toEqual(expectedResult)
  })
  it.each`
    hostname          | address         | name         | isHost   | result   | errorCause
    ${'#'}            | ${'#'}          | ${'address'} | ${true}  | ${true}  | ${undefined}
    ${'#'}            | ${'#'}          | ${'server'}  | ${false} | ${true}  | ${undefined}
    ${'example'}      | ${'#'}          | ${'server'}  | ${true}  | ${true}  | ${undefined}
    ${'example'}      | ${'#'}          | ${'server'}  | ${false} | ${true}  | ${undefined}
    ${'#'}            | ${'2.2.2.2'}    | ${'address'} | ${true}  | ${true}  | ${undefined}
    ${'#'}            | ${'2.2.2.2'}    | ${'server'}  | ${false} | ${true}  | ${undefined}
    ${'example.com'}  | ${'1.1.1.1'}    | ${'server'}  | ${true}  | ${true}  | ${undefined}
    ${'example.org'}  | ${'ffff::ffff'} | ${'server'}  | ${false} | ${true}  | ${undefined}
    ${'ru'}           | ${''}           | ${'server'}  | ${true}  | ${true}  | ${undefined}
    ${'*.ru'}         | ${''}           | ${'server'}  | ${true}  | ${true}  | ${undefined}
    ${'**.ru'}        | ${''}           | ${'server'}  | ${true}  | ${false} | ${'hostname'}
    ${'.ru'}          | ${''}           | ${'server'}  | ${true}  | ${false} | ${'hostname'}
    ${'ru*'}          | ${'1.1.1.1'}    | ${'server'}  | ${true}  | ${false} | ${'hostname'}
    ${'.*ru'}         | ${''}           | ${'server'}  | ${true}  | ${false} | ${'hostname'}
    ${''}             | ${''}           | ${'server'}  | ${true}  | ${false} | ${'hostname'}
    ${'example-.com'} | ${'1.1.1.1'}    | ${'server'}  | ${true}  | ${false} | ${'hostname'}
    ${'exa/mple'}     | ${'1.1.1.1'}    | ${'server'}  | ${true}  | ${false} | ${'hostname'}
    ${'$!@#$%'}       | ${'1.1.1.1'}    | ${'server'}  | ${true}  | ${false} | ${'hostname'}
    ${''}             | ${''}           | ${'server'}  | ${false} | ${false} | ${'ipaddr'}
    ${'example.com'}  | ${'1.1.1.1000'} | ${'server'}  | ${false} | ${false} | ${'ipaddr'}
  `('validates dns url #%#', ({ hostname, name, address, isHost, result, errorCause }) => {
    const messages = {
      hostname: 'Domain names are accepted (e.g., example.com). Wildcard symbol (*) at the start can also be used (e.g., *.example.com).',
      ipaddr: 'IPv4 and IPv6 addresses are accepted (e.g., 192.168.1.1).'
    }
    const wrapper = createWrapper(Dns)
    expect(wrapper.vm.validateDns(isHost, name, hostname, address).isValid).toEqual(result)
    expect(wrapper.vm.validateDns(isHost, name, hostname, address).message).toEqual(messages[errorCause])
  })
  it.each`
    allValues                                                    | rowValue                       | isValid
    ${[['example.com', '1.1.1.1'], ['example.com', '1.1.1.2']]}  | ${['example.com', '1.1.1.2']}  | ${true}
    ${[['example.com', '1.1.1.1'], ['example1.com', '1.1.1.1']]} | ${['example1.com', '1.1.1.1']} | ${true}
    ${[['example.com', '1.1.1.1'], ['example.com', '1.1.1.1']]}  | ${['example.com', '1.1.1.1']}  | ${false}
  `('validates dublicate custom fields #%#', ({ allValues, rowValue, isValid }) => {
    const wrapper = createWrapper(Dns)
    expect(wrapper.vm.validateDuplicateCustom(allValues, rowValue).isValid).toEqual(isValid)
  })
})
