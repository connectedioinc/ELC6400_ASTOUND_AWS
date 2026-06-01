describe('VuciFormItemList validation', () => {
  const sectionName = 'test'
  const peerSectionName = 'testPeer'
  const endpoint = '/wireguard/config'

  before(() => {
    cy.login()
    cy.clearSection(endpoint, sectionName)
    cy.hitPage('/services/vpn/wireguard')
  })

  it('Check if duplicate list values validation work', () => {
    const listElement = 'input[test-id="input-addresses_0"]'
    cy.get('input[id="id"]').type(sectionName)
    cy.clickSectionAdd()
    cy.waitForEditModalOpen()
    cy.fillList('addresses', ['1.1.1.1/1', '1.1.1.1/1'])
    cy.getModal().find(listElement).eq(0).should('have.class', 'invalid')
    cy.getModal().find('input[id="id"]').type(peerSectionName)
    cy.getModal().find('button:contains("Add")').click()
    cy.get('button:contains("Back")').click()
    cy.get('button:contains("Discard")').click()
    cy.clickEditSave(' Some fields are invalid ')
    cy.getModal().find(listElement).eq(0).should('have.class', 'invalid')
  })
})
