const route = '/tr069'
const endpoint = '/tr069/config'
let restoreData = {}
before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${endpoint}/general`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      restoreData = body.data
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.config('baseUrl')}/api${endpoint}/general`,
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
const periodicEnable = { type: 'switch', inputName: 'periodic_enable', value: 'true' }
const serverRequest = { type: 'switch', inputName: 'allow_ra', value: 'true' }
const periodicInterval = { type: 'input', inputName: 'periodic_interval', value: '69' }
const username = { type: 'input', inputName: 'username', value: 'tester' }
const password = { type: 'input', inputName: 'password', value: 'tester' }
const url = { type: 'input', inputName: 'url', value: 'http://192.168.1.11:8080/test' }

const inputs = [enabled, periodicEnable, serverRequest, periodicInterval, username, password, url]

describe('Tr069 configuration', () => {
  it('Configuration with enabled service', () => {
    cy.testNamedConfiguration(endpoint, inputs, 'acs')
  })
  it('Check require dependency on enable, with empty `periodicInterval` option', () => {
    const emptyPeriodicInterval = periodicInterval
    emptyPeriodicInterval.value = ''
    const schema = [enabled, periodicEnable, serverRequest, emptyPeriodicInterval, username, password, url]
    cy.testNamedConfiguration(endpoint, schema, 'acs', 'Some fields are invalid')
  })
  it('Check require dependency on enable, with empty `username` option', () => {
    const emptyUsername = username
    emptyUsername.value = ''
    const schema = [enabled, periodicEnable, serverRequest, periodicInterval, emptyUsername, password, url]
    cy.testNamedConfiguration(endpoint, schema, 'acs', 'Some fields are invalid')
  })
  it('Check require dependency on enable, with empty `password` option', () => {
    const emptyPassword = password
    emptyPassword.value = ''
    const schema = [enabled, periodicEnable, serverRequest, periodicInterval, username, emptyPassword, url]
    cy.testNamedConfiguration(endpoint, schema, 'acs', 'Some fields are invalid')
  })
  it('Check require dependency on enable, with empty `url` option', () => {
    const emptyUrl = url
    emptyUrl.value = ''
    const schema = [enabled, periodicEnable, serverRequest, periodicInterval, username, password, emptyUrl]
    cy.testNamedConfiguration(endpoint, schema, 'acs', 'Some fields are invalid')
  })
  it('Configuration with disabled service', () => {
    const customInputs = [...inputs]
    customInputs[0].value = 'false'
    cy.testNamedConfiguration(endpoint, customInputs, 'acs')
  })
})
