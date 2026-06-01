const route = '/services/gps/https'
const httpsServerEndpoint = '/gps/https/config'
const tavlEndpoint = '/gps/https/tavl_rules/config'
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const hostname = { type: 'input', inputName: 'hostname', value: '1.1.1.1' }
const interval = { type: 'input', inputName: 'interval', value: '1' }
let sectionNames = []
let hasGPS = false

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasGPS = body.data.board.hwinfo.gps
    })
  })
  if (hasGPS) {
    cy.then(() => {
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api${tavlEndpoint}`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        sectionNames = body.data.map(section => section.id)
      })
    })
  }
  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasGPS) this.skip()
})

after(() => {
  cy.logout()
})

describe('GPS HTTPS configuration', () => {
  describe('HTTPS/HTTP Server Settings', () => {
    it('Configuration with enabled ', () => {
      const schema = [enabled, hostname, interval]
      cy.testNamedConfiguration(httpsServerEndpoint, schema, 'httpsServer')
    })
    it('Configuration with enabled ', () => {
      const schema = [enabled]
      schema[0].value = 'false'
      cy.testNamedConfiguration(httpsServerEndpoint, schema, 'httpsServer')
    })
  })

  describe('TAVL Settings ', () => {
    it('Enable all configurations', () => {
      for (let i = 0; i < sectionNames.length; i++) {
        const schema = [enabled]
        cy.testNamedConfiguration(tavlEndpoint, schema, sectionNames[i])
      }
    })
    it('Disable all configurations', () => {
      for (let i = 0; i < sectionNames.length; i++) {
        const schema = [enabled]
        schema[0].value = 'false'
        cy.testNamedConfiguration(tavlEndpoint, schema, sectionNames[i])
      }
    })
  })
})
