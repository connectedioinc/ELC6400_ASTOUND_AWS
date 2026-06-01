const route = '/cloud_solutions/cumulocity'
const endpoint = '/cumulocity/config'
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

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const ssl = { type: 'switch', inputName: 'ssl', value: 'true' }
const server = { type: 'input', inputName: 'server', value: 'server.cumulocity.com' }
const interval = { type: 'input', inputName: 'interval', value: '5' }

describe('Configuration with Cumulocity', () => {
  it('Clicks `Reset Auth` button and checks message', () => {
    cy.clickButton('resetAuth')
    cy.checkMessage(' Authentication data cleared. Now you can re-register device on Cumulocity Device Management ')
  })
  it('Configuration with enabled service', () => {
    const schema = [enabled, ssl, server, interval]
    cy.testNamedConfiguration(endpoint, schema, 'cumulocity')
  })
  it('Check require dependency on enable, with empty `server` option', () => {
    const empty_server = server
    empty_server.value = ''
    const schema = [enabled, ssl, empty_server, interval]
    cy.testNamedConfiguration(endpoint, schema, 'cumulocity', 'Some fields are invalid')
  })
  it('Check require dependency on enable, with empty `interval` option', () => {
    const empty_interval = interval
    empty_interval.value = ''
    const schema = [enabled, ssl, server, empty_interval]
    cy.testNamedConfiguration(endpoint, schema, 'cumulocity', 'Some fields are invalid')
    interval.value = '5'
  })
  it('`Disabled`, with empty `server` and`interval` option', () => {
    const empty_server = server
    empty_server.value = ''
    const empty_interval = interval
    empty_interval.value = ''
    const empty_enabled = enabled
    empty_enabled.value = 'false'
    const schema = [empty_enabled, ssl, empty_server, empty_interval]
    cy.testNamedConfiguration(endpoint, schema, 'cumulocity')
  })
})
