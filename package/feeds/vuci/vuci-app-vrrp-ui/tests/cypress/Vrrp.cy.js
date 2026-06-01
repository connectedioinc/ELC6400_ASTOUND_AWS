const route = '/network/failover/vrrp'
const endpoint = '/vrrp/config'
const instanceName = 'test999'

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const generalScheme = [
  { type: 'switch', inputName: 'enabled', value: 'false' },
  { type: 'switch', inputName: 'virtual_mac', value: 'true' },
  { type: 'input', inputName: 'virtual_id', value: '99' },
  { type: 'input', inputName: 'priority', value: '255' },
  { type: 'input', inputName: 'delay', value: '9' },
  { type: 'select', inputName: 'interface', options: 'lan', value: 'lan' },
  { type: 'input', inputName: 'virtual_ip_0', value: '0.0.0.0' }
]

const connectionScheme = [
  { type: 'switch', inputName: 'ping_enabled', value: 'true' },
  { type: 'input', inputName: 'host', value: '1.1.1.1' },
  { type: 'input', inputName: 'interval', value: '999' },
  { type: 'input', inputName: 'time_out', value: '999' },
  { type: 'input', inputName: 'packet_size', value: '500' },
  { type: 'input', inputName: 'ping_attempts', value: '50' },
  { type: 'input', inputName: 'retry', value: '99' }
]

describe('VRRP configuration', () => {
  it('Disabled VRRP configuration', () => {
    cy.get('[test-id="tablerow-vrrp"]').within(() => {
      cy.get('input[id=id]').type(instanceName)
    })
    cy.testCardConfigurationEdit(endpoint, generalScheme, 'vrrp')
  })
  it('Enabled VRRP configuration with Connection section', () => {
    cy.get('[test-id="tablerow-vrrp"]').within(() => {
      cy.get('input[id=id]').type(instanceName)
    })
    generalScheme[0].value = 'true'
    const scheme = generalScheme.concat(connectionScheme)
    cy.testCardConfigurationEdit(endpoint, scheme, 'vrrp')
  })
})
