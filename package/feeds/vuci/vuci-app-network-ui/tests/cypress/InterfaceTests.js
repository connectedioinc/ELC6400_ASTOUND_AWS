export const tests = {
  testCardValues(endpoint, schema, sectionName) {
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let rowName = ''
    cy.clickSectionAdd(sectionName)
    cy.wait('@postSection').then(res => {
      cy.waitForEditModalOpen()
      cy.clickEditSave()
      rowName = res.response.body.data.id
      cy.get(`[test-id="rowCard-${rowName}"]`).within(() => {
        cy.setValues(endpoint, schema, sectionName)
      })
      cy.overviewSave()
      cy.get(`[test-id="rowCard-${rowName}"]`).within(() => {
        cy.checkValues(endpoint, schema, sectionName)
      })
      cy.clearCardSection(endpoint, rowName)
    })
  },
  fillInterfaceName(name) {
    cy.get('[test-id="tablerow-interfaces"]').within(() => {
      cy.get('input[id=id]').type(name)
    })
  }
}
