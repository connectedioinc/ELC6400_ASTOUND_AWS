const route = '/status/services'
const endpoint = '/services/status'
let services = []

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
      services = body.data
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

describe('Services status', () => {
  it('Checks if service settings routes are correct', () => {
    services.forEach((service, index) => {
      cy.contains(`[test-id="tablerow-${index}"]`, service.service).find('.btn').click()
      cy.url().should('include', service.path)
      cy.document().its('body').find('.spin-content')
      cy.document().its('body').find('.spin-content').should('not.exist')
      cy.hitPage(route)
    })
  })
})
