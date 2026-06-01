const route = '/system/admin/profiles/config'
const endpoint = '/profiles/config'

const id = { type: 'input', inputName: 'id', value: 'test' }
const fromCurrentProfile = { type: 'switch', inputName: 'from_current_profile', value: 'false' }

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

describe('Profiles configuration', () => {
  it('Creates new profile with current configuration disabled and then removes created profile', () => {
    const schema = [id, fromCurrentProfile]
    cy.setValues(endpoint, schema, '')
    cy.clickSectionAdd()
    cy.get('.spin-overlay', { timeout: 20000 }).should('not.exist')
    cy.get(`[test-id="tablerow-${id.value}"]`).within(() => {
      cy.clickButton('delete')
    })
    cy.waitForEditModalOpen().get('[test-id="button-ok"]').click()
    cy.checkMessage(' Configuration has been removed ')
  })
  it('Creates new profile with current configuration enabled ', () => {
    fromCurrentProfile.value = 'true'
    const schema = [id, fromCurrentProfile]
    cy.setValues(endpoint, schema, '')
    cy.clickSectionAdd()
    cy.get('.spin-overlay', { timeout: 20000 }).should('not.exist')
    cy.get(`[test-id="tablerow-${id.value}"]`).within(() => {
      cy.clickButton('delete')
    })
    cy.waitForEditModalOpen().get('[test-id="button-ok"]').click()
    cy.checkMessage(' Configuration has been removed ')
  })
  it('Applies new profile and checks if Profile applied', () => {
    const schema = [id, fromCurrentProfile]
    cy.setValues(endpoint, schema, '')
    cy.clickSectionAdd()
    cy.clickButton('apply')
    cy.checkMessage(' Profile applied ')
    cy.url().should('include', '/login')
    cy.login()
    cy.hitPage(route)
    cy.clickButton('apply')
    cy.checkMessage(' Profile applied ')
    cy.login()
    cy.hitPage(route)
    cy.clickButton('delete')
    cy.waitForEditModalOpen().get('[test-id="button-ok"]').click()
    cy.checkMessage(' Configuration has been removed ')
  })
})
