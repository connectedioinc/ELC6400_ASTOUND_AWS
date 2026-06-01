const route = '/system/admin'

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

describe('Side widget', () => {
  it('toggles all services', () => {
    cy.intercept('PUT', '**/api/bluetooth/general/config/general').as('toggleBluetooth')
    cy.intercept('GET', '**/api/wireless/interfaces/config').as('toggleWifi')
    cy.intercept('GET', '**/api/interfaces/config').as('toggleMobile')
    cy.intercept('PUT', '**/api/cloud_solutions/rms/config/general').as('toggleRms')
    cy.get('[test-id="side-btn-service-settings"]').click()
    cy.get('[test-id="side-widget"]').should('be.visible')
    cy.get('[test-id="toggle-btn"]').each(btn => {
      const active = btn.attr('class').includes('active')
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.wrap(btn)
        .click()
        .should(`have${active ? '.not' : ''}.class`, 'active')
    })
    cy.wait('@toggleBluetooth')
    cy.wait('@toggleWifi')
    cy.wait('@toggleMobile')
    cy.wait('@toggleRms')
    cy.get('[test-id="side-btn"]').click()
    cy.waitForContentLoad()
  })
  it('toggles all cards', () => {
    cy.intercept('PUT', '**/api/widget/config/*').as('toggleCard')
    cy.get('[test-id="side-btn-overview-card-settings"]').click()
    cy.get('#edit_side_boxes').click()
    cy.get('.side-boxes-form input').each(check => {
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.wrap(check).click().wait('@toggleCard')
    })
    cy.get('.side-btn').click()
    cy.waitForContentLoad()
  })
})
