import PPTPEdit from '../../src/views/services/PPTPEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const response = { isValid: false, message: 'The value of remote IP range begin or end is invalid: IP adresses must be in the same /24 subnet and the range cannot exceed 100 adresses.' }

describe('PPTPEdit.vue', () => {
  const sixClients = [{ '.type': 'interface' }, { '.type': 'interface' }, { '.type': 'interface' }, { '.type': 'interface' }, { '.type': 'interface' }, { '.type': 'interface' }]
  const serverExists = [{ '.type': 'service' }]
  const oneClient = [{ '.type': 'interface' }]
  it.each([
    ['192.168.0.30', { isValid: true }],
    ['192.168.1.0', response],
    ['192.168.0', response]
  ])('validates remote IP range begin and end, when end is %s', async (value, response) => {
    const wrapper = createWrapper(PPTPEdit, {
      props: {
        section: {
          start: '192.168.0.20',
          limit: '192.168.0.30'
        }
      }
    })
    const res = await wrapper.vm.validateLimit(value)
    expect(res).toEqual(response)
  })

  it.each`
    valid    | value         | result
    ${true}  | ${'1'}        | ${{ isValid: true }}
    ${true}  | ${'12345'}    | ${{ isValid: true }}
    ${true}  | ${'@._-'}     | ${{ isValid: true }}
    ${true}  | ${'@#$%^'}    | ${{ isValid: false, message: 'Alphanumeric and @, ., _, - characters are allowed.' }}
    ${false} | ${'Č'}        | ${{ isValid: false, message: 'Alphanumeric and @, ., _, - characters are allowed.' }}
    ${false} | ${'"'}        | ${{ isValid: false, message: 'Alphanumeric and @, ., _, - characters are allowed.' }}
    ${false} | ${'test tab'} | ${{ isValid: false, message: 'Alphanumeric and @, ., _, - characters are allowed.' }}
  `('credentials_validate_no_diacritics returns isValid $valid', ({ value, result }) => {
    const wrapper = createWrapper(PPTPEdit, { props: { section: {} } })
    const res = wrapper.vm.credentials_validate_no_diacritics(value)
    expect(res).toEqual(result)
  })

  it.each`
    data                                                                | input      | result
    ${[{ username: 'test1', id: '1' }, { username: 'test1', id: '2' }]} | ${'test1'} | ${{ isValid: false, message: "Username 'test1' already exists" }}
    ${[{ username: 'test1', id: '1' }, { username: 'test2', id: '2' }]} | ${'test1'} | ${{ isValid: true }}
  `('Validate username duplicates %s', async ({ data, input, result }) => {
    const wrapper = createWrapper(PPTPEdit, { props: { section: {} } })
    wrapper.vm.formData = { pptp_server_users: data }
    const val = await wrapper.vm.validateDuplicate(input)
    expect(val).toEqual(result)
  })

  it.each([
    ['interface', serverExists, true],
    ['interface', [], false],
    ['service', serverExists, false]
  ])('Tests serverLimitReached', (sectionType, data, res) => {
    const wrapper = createWrapper(PPTPEdit, { props: { section: { '.type': sectionType } } })
    wrapper.vm.formData = { pptp: data }
    const val = wrapper.vm.serverLimitReached
    expect(val).toEqual(res)
  })
  it.each([
    ['service', sixClients, true],
    ['service', [], false],
    ['interface', sixClients, false]
  ])('Tests clientLimitReached', (sectionType, data, res) => {
    const wrapper = createWrapper(PPTPEdit, { props: { section: { '.type': sectionType } } })
    wrapper.vm.formData = { pptp: data }
    const val = wrapper.vm.clientLimitReached
    expect(val).toEqual(res)
  })
  it.each([
    ['service', serverExists, sixClients, 'Maximum number of PPTP client instances has been reached.'],
    ['service', serverExists, oneClient, false],
    ['service', [], oneClient, false],
    ['service', [], [], false],
    ['interface', serverExists, sixClients, 'Maximum number of PPTP server instances has been reached.'],
    ['interface', serverExists, oneClient, 'Maximum number of PPTP server instances has been reached.'],
    ['interface', serverExists, [], 'Maximum number of PPTP server instances has been reached.'],
    ['interface', [], [], false]
  ])('Tests limitReachedMessage', (sectionType, servers, clients, res) => {
    const wrapper = createWrapper(PPTPEdit, { props: { section: { '.type': sectionType } } })
    wrapper.vm.formData = { pptp: [...servers, ...clients] }
    const val = wrapper.vm.limitReachedMessage
    expect(val).toEqual(res)
  })
})
