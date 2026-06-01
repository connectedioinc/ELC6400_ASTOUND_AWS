const route = '/snmp/snmp_settings'
const endpointSettings = '/snmp/agent/config'
const endpointSystem = '/snmp/system/config'
let hasPackage = false
let initialSettings = {}
let initialSystem = {}

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
      hasPackage = body.data.includes('/usr/lib/opkg/info/snmp.control')
    })
  })

  cy.then(() => {
    if (!hasPackage) return

    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${endpointSettings}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      initialSettings = body.data[0]
    })

    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${endpointSystem}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      initialSystem = body.data[0]
    })
  })
})

beforeEach(function () {
  if (!hasPackage) this.skip()
  cy.hitPage(route)
})

after(() => {
  if (!hasPackage) return
  delete initialSystem.oid
  cy.then(() => {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${endpointSettings}/general`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: initialSettings
      }
    })
  })

  cy.then(() => {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${endpointSystem}/general`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: initialSystem
      }
    })
  })

  cy.logout()
})

// Snmp agent settings

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const allow_ra = { type: 'switch', inputName: 'allow_ra', value: 'true' }
const ip_type = { type: 'select', inputName: 'ip_type', options: 'ipv6', value: 'IPv6' }
const port = { type: 'input', inputName: 'port', value: '1234' }
const v1mode = { type: 'switch', inputName: 'v1mode', value: 'true' }
const v2cmode = { type: 'switch', inputName: 'v2cmode', value: 'true' }
const v3mode = { type: 'switch', inputName: 'v3mode', value: 'true' }

// Snmp system summary

const sysLocation = { type: 'input', inputName: 'sysLocation', value: 'testLoc' }
const sysContact = { type: 'input', inputName: 'sysContact', value: 'test@mail.com' }
const sysName = { type: 'input', inputName: 'sysName', value: 'testName' }

describe('SNMP Settings configuration', () => {
  it('Snmp Agent Settings configuration', function () {
    const schema = [enabled, allow_ra, ip_type, port, v1mode, v2cmode, v3mode]
    cy.testNamedConfiguration(endpointSettings, schema, 'settings')
  })
  it('SNMP System Summary configuration', function () {
    const schema = [sysLocation, sysContact, sysName]
    cy.clickButton('downloadMib')
    cy.testNamedConfiguration(endpointSystem, schema, 'system')
  })
})
