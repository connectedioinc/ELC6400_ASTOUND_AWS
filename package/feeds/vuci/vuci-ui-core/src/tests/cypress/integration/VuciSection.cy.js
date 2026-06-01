describe('Section Add and Save', () => {
  const sectionOne = 'test1'
  const sectionTwo = 'test2'
  const endpoint = '/vrrp/config'

  before(() => {
    cy.login()
    cy.clearSection(endpoint, sectionOne)
    cy.clearSection(endpoint, sectionTwo)
    cy.hitPage('/network/failover/vrrp')
  })

  it('check if few VRRP sections add and save work correctly', () => {
    cy.get('input[id="id"]').type(sectionOne)
    cy.clickSectionAdd()
    cy.waitForEditModalOpen()
    cy.get('.close-btn').click()
    cy.get('button:contains("Discard")').click()
    cy.get('input[id="id"]').type(sectionTwo)
    cy.clickSectionAdd()
    cy.waitForEditModalOpen()
    cy.clickEditSave()
  })
})

describe('Second level section', () => {
  const sectionName = 'test'
  const peerSectionName = 'testPeer'
  const endpoint = '/wireguard/config'

  before(() => {
    cy.login()
    cy.clearSection(endpoint, sectionName)
    cy.hitPage('/services/vpn/wireguard')
  })

  it('Check if wireguard peers section appear after second level edit cancellation', () => {
    cy.get('input[id="id"]').type(sectionName)
    cy.clickSectionAdd()
    cy.waitForEditModalOpen()
    cy.getModal().find('input[id="id"]').type(peerSectionName)
    cy.getModal().find('button:contains("Add")').click()
    cy.get('button:contains("Back")').click()
    cy.get('button:contains("Discard")').click()
    cy.get('tr').should('contain', 'testPeer')
  })
})
