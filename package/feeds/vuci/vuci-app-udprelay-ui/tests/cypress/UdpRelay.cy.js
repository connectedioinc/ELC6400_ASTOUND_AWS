const route = '/network/other/udprelay'
const endpoint = '/udprelay/config'
const interfacesEndpoint = '/interfaces/config'
const section = 'udpRelay'

let hasWan = false

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${interfacesEndpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasWan = body.data.some(iface => iface.id === 'wan')
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const interface_mark = {
  lan: { type: 'select', inputName: 'interface_mark', options: 'lan', value: 'lan' },
  wan: { type: 'select', inputName: 'interface_mark', options: 'wan', value: 'wan' }
}
const port = { type: 'input', inputName: 'port', value: '65535' }
const interfaces = {
  lan: { type: 'multiselect', inputName: 'interfaces', value: [{ options: 'lan', value: 'lan' }] },
  wan: { type: 'multiselect', inputName: 'interfaces', value: [{ options: 'wan', value: 'wan' }] },
  all: {
    type: 'multiselect',
    inputName: 'interfaces',
    value: [
      { options: 'lan', value: 'lan' },
      { options: 'wan', value: 'wan' }
    ]
  }
}
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }

describe('UDP Relay configuration', () => {
  it('Configuration with enabled service (lan)', () => {
    const schema = [interface_mark.lan, port, interfaces.lan, enabled]
    cy.testTypedOverviewConfiguration(endpoint, schema, section)
  })
  it('Configuration with enabled service (wan)', function () {
    if (!hasWan) this.skip()
    port.value = '8080'
    const schema = [interface_mark.wan, port, interfaces.wan, enabled]
    cy.testTypedOverviewConfiguration(endpoint, schema, section)
  })
  it('Configuration with enabled service (lan and wan)', function () {
    if (!hasWan) this.skip()
    port.value = '8181'
    const schema = [interface_mark.lan, port, interfaces.all, enabled]
    cy.testTypedOverviewConfiguration(endpoint, schema, section)
  })
  it('Configuration with disabled service', () => {
    port.value = '80'
    enabled.value = 'false'
    const schema = [interface_mark.lan, port, interfaces.lan, enabled]
    cy.testTypedOverviewConfiguration(endpoint, schema, section)
  })
})
