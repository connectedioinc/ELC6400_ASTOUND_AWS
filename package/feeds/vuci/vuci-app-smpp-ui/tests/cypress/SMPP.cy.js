const route = '/mobile_utilities/sms_gateway/smpp'
const endpoint = '/smpp/config'
let restoreData = []
let modemCount = 0
const modemData = {}
let hasPackage = ''

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/packages/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasPackage = body.data.includes('/usr/lib/opkg/info/smpp.control')
      if (hasPackage) {
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
      }
    })
  })
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/modems/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      if (body.data) {
        modemCount = body.data.length
        modemData.options = body.data[modemCount - 1].id
        modemData.value = body.data[modemCount - 1].name
        modemData.depend = modemCount > 1
      }
    })
  })
  cy.hitPage(route)
})

after(() => {
  delete restoreData['.type']
  if (hasPackage) {
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
  }
  cy.then(() => {
    cy.logout()
  })
})

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const username = { type: 'input', inputName: 'username', value: 'user' }
const password = { type: 'input', inputName: 'password', value: 'pass123' }
const port = { type: 'input', inputName: 'port', value: '1234' }
const modem = { type: 'select', inputName: 'modem' }

describe('SMPP configuration', () => {
  it('Configuration when enabled', function () {
    if (!hasPackage) this.skip()
    cy.hitPage(route)
    if (modemCount > 1) {
      modem.options = modemData.options
      modem.value = modemData.value
      modem.depend = modemData.depend
    } else modem.depend = false
    const schema = [enabled, username, password, port, modem]
    cy.testNamedConfiguration(endpoint, schema, 'smpp')
  })
  it('Configuration when enabled with empty `username` option', function () {
    if (modemCount > 1) {
      modem.options = modemData.options
      modem.value = modemData.value
      modem.depend = modemData.depend
    } else modem.depend = false
    const emptyUsername = { type: 'input', inputName: 'username', value: '' }
    const schema = [enabled, emptyUsername, password, port, modem]
    cy.testNamedConfiguration(endpoint, schema, 'smpp', 'Some fields are invalid')
  })
  it('Configuration when enabled with empty `password` option', function () {
    if (modemCount > 1) {
      modem.options = modemData.options
      modem.value = modemData.value
      modem.depend = modemData.depend
    } else modem.depend = false
    const emptyPassword = { type: 'input', inputName: 'password', value: '' }
    const schema = [enabled, username, emptyPassword, port, modem]
    cy.testNamedConfiguration(endpoint, schema, 'smpp', 'Some fields are invalid')
  })
  it('Configuration when enabled with empty `password` option', function () {
    if (modemCount > 1) {
      modem.options = modemData.options
      modem.value = modemData.value
      modem.depend = modemData.depend
    } else modem.depend = false
    const emptyPort = { type: 'input', inputName: 'port', value: '' }
    const schema = [enabled, username, password, emptyPort, modem]
    cy.testNamedConfiguration(endpoint, schema, 'smpp', 'Some fields are invalid')
  })
})
