const route = '/system/wizard/step_rms'
const endpoint = '/rms/config'
let restoreData = {}

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${endpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      restoreData = body.data
    })
  })
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.config('baseUrl')}/api${endpoint}`,
    body: {
      data: restoreData
    },
    headers: {
      Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
      'Content-type': 'application/json'
    }
  })
  cy.logout()
})

const enable = {
  enabled: { type: 'select', inputName: 'enable', options: '1', value: 'Enabled' },
  standby: { type: 'select', inputName: 'enable', options: '2', value: 'Standby' },
  disabled: { type: 'select', inputName: 'enable', options: '0', value: 'Disabled' }
}
const remote = { type: 'input', inputName: 'remote', value: 'rms.teltonika-networks.com' }
const port = { type: 'input', inputName: 'port', value: '15009' }

describe('Configuration with RMS service', () => {
  it('Connection type `Enabled`', () => {
    const schema = [enable.enabled, remote, port]
    cy.testNamedConfiguration(endpoint, schema, 'rms_mqtt')
  })
  it('Clicks `Connect` button and checks message', () => {
    cy.clickButton('connect')
    cy.checkMessage(' Tried to connect successfully ')
  })
  it('Connection type `Standby`', () => {
    const schema = [enable.standby, remote, port]
    cy.hitPage(route)
    cy.testNamedConfiguration(endpoint, schema, 'rms_mqtt')
  })
  it('Connection type `Disabled`', () => {
    const schema = [enable.disabled, remote, port]
    cy.hitPage(route)
    cy.testNamedConfiguration(endpoint, schema, 'rms_mqtt')
  })
  it('Check require dependency on `Enable`, with empty `port` option', () => {
    port.value = ''
    const schema = [enable.enabled, remote, port]
    cy.hitPage(route)
    cy.testNamedConfiguration(endpoint, schema, 'rms_mqtt', 'Some fields are invalid')
  })
  it('Check require dependency on `Enable`, with empty `remote` option', () => {
    port.value = '15009'
    remote.value = ''
    const schema = [enable.enabled, remote, port]
    cy.testNamedConfiguration(endpoint, schema, 'rms_mqtt', 'Some fields are invalid')
  })
  it('Check require dependency on `Standby`, with empty `port` option', () => {
    remote.value = 'rms.teltonika-networks.com'
    port.value = ''
    const schema = [enable.standby, remote, port]
    cy.testNamedConfiguration(endpoint, schema, 'rms_mqtt', 'Some fields are invalid')
  })
  it('Check require dependency on `Standby`, with empty `remote` option', () => {
    port.value = '15009'
    remote.value = ''
    const schema = [enable.standby, remote, port]
    cy.testNamedConfiguration(endpoint, schema, 'rms_mqtt', 'Some fields are invalid')
  })
  it('`Disabled`, with empty `port` and`remote` option', () => {
    port.value = ''
    remote.value = ''
    const schema = [enable.disabled, remote, port]
    cy.testNamedConfiguration(endpoint, schema, 'rms_mqtt')
  })
})
