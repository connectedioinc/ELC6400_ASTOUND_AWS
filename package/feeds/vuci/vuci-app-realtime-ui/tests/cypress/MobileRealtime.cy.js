const route = '/status/realtime/mobile'
let hasMobile = false

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
      hasMobile = body.data.includes('/usr/lib/opkg/info/mobifd.control')
      if (hasMobile) {
        cy.hitPage(route)
      }
    })
  })
})

beforeEach(function () {
  if (!hasMobile) this.skip()
})

after(() => {
  cy.logout()
})

describe('Mobile signal information', () => {
  it('Checks RSSI card data', function () {
    cy.get('[test-id=tablerow-]')
      .first()
      .within(() => {
        cy.get('[test-id=rssi]').should('be.visible')
        cy.get('[test-id=band]').should('not.contain', 'N/A')
        cy.get('[test-id=rssi]').should('not.contain', 'N/A')
        cy.get('[test-id=rsrp]').should('not.contain', 'N/A')
        cy.get('[test-id=rsrq]').should('not.contain', 'N/A')
        cy.get('[test-id=sinr]').should('not.contain', 'N/A')
      })
  })
})
