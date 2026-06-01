const route = '/services/gps/general'
const endpoint = '/gps/config'
let restoreData = {}
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
        url: `${Cypress.config('baseUrl')}/api${endpoint}`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        restoreData = body.data
      })
    })
  }
  cy.hitPage(route)
})
beforeEach(function () {
  if (!hasGPS) this.skip()
})

after(() => {
  if (hasGPS) {
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
  cy.logout()
})

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const galileoSup = { type: 'switch', inputName: 'galileo_sup', value: 'true' }
const glonassSup = { type: 'switch', inputName: 'glonass_sup', value: 'true' }
const beidouSup = { type: 'switch', inputName: 'beidou_sup', value: 'true' }

describe('GPS General configuration', () => {
  describe('GPS configuration', () => {
    it('Enables GPS', () => {
      const schema = [enabled]
      cy.testNamedConfiguration(endpoint, schema, '')
    })
    it('Disables GPS', () => {
      enabled.value = 'false'
      const schema = [enabled]
      cy.testNamedConfiguration(endpoint, schema, '')
    })
  })
  describe('Satellite configuration', () => {
    it('Enables everything', () => {
      const schema = [galileoSup, glonassSup, beidouSup]
      cy.testNamedConfiguration(endpoint, schema, '')
    })
    it('Disables everything', () => {
      galileoSup.value = 'false'
      glonassSup.value = 'false'
      beidouSup.value = 'false'
      const schema = [galileoSup, glonassSup, beidouSup]
      cy.testNamedConfiguration(endpoint, schema, '')
    })
  })
})
