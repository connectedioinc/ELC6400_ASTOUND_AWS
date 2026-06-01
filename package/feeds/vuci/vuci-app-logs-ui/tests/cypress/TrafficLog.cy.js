const route = '/system/maintenance/traffic'
const settingsRoute = '/services/logging'

before(() => {
  cy.login()
  cy.visit(route)
})

after(() => {
  cy.logout()
})

describe('Traffic events log', () => {
  it('Checks if traffic events are enabled', () => {
    cy.hitPage(settingsRoute)
    cy.clickSwitch('enabled', 'true')
    cy.visit(route)
    cy.waitForContentLoad()
    cy.get('.side-messages').contains('Traffic logging is not').should('not.exist')
  })
  it('Checks if traffic events are disabled', () => {
    cy.hitPage(settingsRoute)
    cy.clickSwitch('enabled')
    cy.visit(route)
    cy.get('.side-messages').contains('Traffic logging is not').should('exist')
  })
})
