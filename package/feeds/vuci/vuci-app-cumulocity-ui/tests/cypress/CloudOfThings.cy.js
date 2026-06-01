const route = '/cloud_solutions/cloud_of_things'
const endpoint = '/cloud_of_things/config'
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
const server = { type: 'input', inputName: 'server', value: 'server.cloudofthings.com' }
const interval = { type: 'input', inputName: 'interval', value: '5' }

describe('Configuration with Cloud Of Things', () => {
  it('Clicks `Reset Auth` button and checks message', () => {
    cy.clickButton('resetAuth')
    cy.checkMessage(' Authentication data cleared. Now you can re-register device on Cloud of Things Device Management. ')
  })
  it('Configuration with enabled service', () => {
    const schema = [enabled, server, interval]
    cy.testNamedConfiguration(endpoint, schema, 'cot')
  })
  it('Check require dependency on enable, with empty `server` option', () => {
    const empty_server = server
    empty_server.value = ''
    const schema = [enabled, empty_server, interval]
    cy.testNamedConfiguration(endpoint, schema, 'cot', 'Some fields are invalid')
  })
  it('Check require dependency on enable, with empty `interval` option', () => {
    const empty_interval = interval
    empty_interval.value = ''
    const schema = [enabled, server, empty_interval]
    cy.testNamedConfiguration(endpoint, schema, 'cot', 'Some fields are invalid')
    interval.value = '5'
  })
  it('`Disabled`, with empty `server` and `interval` option', () => {
    const empty_server = server
    empty_server.value = ''
    const empty_interval = interval
    empty_interval.value = ''
    const empty_enabled = enabled
    empty_enabled.value = 'false'
    const schema = [empty_enabled, empty_server, empty_interval]
    cy.testNamedConfiguration(endpoint, schema, 'cot')
  })
})
