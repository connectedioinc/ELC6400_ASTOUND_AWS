const route = '/status/overview'

before(() => {
  cy.login()
  cy.visit(route)
})

after(() => {
  cy.logout()
})

describe('Checks VuciHeader functionality', () => {
  it('Enables/disables advanced mode and checks if menu `status` items changed', () => {
    cy.get('div[class="secondary-menu-item"]').then(basicMenuItems => {
      cy.get('button[test-id="selectoption-false"]').should('contain', 'Basic')
      cy.get('button[test-id="selectoption-true selected"]').should('contain', 'Advanced')
      cy.get('button[test-id="selectoption-false"]').click()
      cy.get('div[class="secondary-menu-item"]').then(advancedMenuItems => {
        expect(advancedMenuItems.length).to.not.equal(basicMenuItems)
        cy.get('button[test-id="selectoption-true"]').click()
      })
      cy.log(cy.get('button[test-id="selectoption-true selected"]').should('contain', 'Advanced'))
    })
  })
  it('Checks if firmware upgrade icon redirects to "Update firmware"', () => {
    cy.get('[test-id="header-firmware"]').click()
    cy.url().should('include', '/system/flashops/general')
  })
  it('Checks if options menu have reboot button that opens prompt', () => {
    cy.get('div[test-id="header-expand-dropdown"]').click()
    cy.get('button[test-id="header-reboot"]').should('contain', 'Reboot')
    cy.get('button[test-id="header-reboot"]').click()
    cy.get('div').should('contain', 'During reboot, the device will not be reachable for 1-2 minutes.')
  })
})
