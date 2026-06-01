const route = '/system/maintenance/reset'

before(() => {
  cy.login()
  cy.visit(route)
})

after(() => {
  cy.logout()
})

describe('Configuration backup', () => {
  it('Creates and deletes default configuration', () => {
    cy.clickButton('create')
    cy.get('[test-id="global-spinner"]').contains('Creating default configuration').should('be.visible')
    cy.checkMessage("User's default configuration created successfully")
    cy.getText('created').should('contain', ':')
    cy.scrollTo('bottom', { ensureScrollable: false })
    cy.get('[test-id="radio-option-user"]').should('be.visible')
    cy.scrollTo('top', { ensureScrollable: false })
    cy.clickButton('remove')
    cy.checkMessage("User's default configuration removed successfully")
    cy.getTextValue('created', '-')
  })
  it('Shows correct message on reset default settings click', () => {
    cy.get('[test-id="radio-option-factory"]').click()
    cy.clickButton('reset')
    cy.getModal().within(() => {
      cy.contains(`This will reset all changes to 'Factory defaults'.`).should('be.visible')
      cy.get('[test-id="button-ok"]').should('be.visible')
      cy.get('[test-id="button-cancel"]').should('be.visible')
      cy.clickButton('cancel')
    })
    cy.getModal().should('not.exist')
  })
  it('restores default users settings', () => {
    cy.visit(route)
    cy.clickButton('create')
    cy.get('[test-id="global-spinner"]', { timeout: 5000 }).should('not.exist')
    cy.visit('/network/lan')
    cy.clickButton('edit')
    cy.waitForEditModalOpen()
    cy.fillInput('name', 'test')
    cy.clickEditSave()
    cy.visit(route)
    cy.scrollTo('bottom', { ensureScrollable: true })
    cy.get('[test-id="radio-option-user"]').click()
    cy.clickButton('reset')
    cy.clickButton('ok')
    cy.get('[test-id="global-spinner"]').should('be.visible')
    // for slower devices
    cy.get('[test-id="global-spinner"]', { timeout: 360000 }).should('not.exist')
    cy.login()
    cy.visit('/network/lan')
    cy.contains('lan').should('be.visible')
    cy.visit(route)
    cy.clickButton('remove')
  })
})
