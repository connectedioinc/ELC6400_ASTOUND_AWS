const route = '/network/dhcp_servers/static_leases'
const endpoint = '/dhcp/static_leases/ipv4/config'

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const schema = [
  { type: 'input', inputName: 'mac', value: '11:22:33:44:55:66' },
  { type: 'input', inputName: 'ip', value: '192.168.20.20' },
  { type: 'input', inputName: 'name', value: 'tester' }
]

describe('Static Leases configuration', () => {
  it('Configuration', () => {
    cy.testTypedOverviewConfiguration(endpoint, schema, 'staticLeases')
  })
})
