const route = '/services/hotspot/users'
const endpoint = '/hotspot/users/config'
before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})
const password = { type: 'input', inputName: 'password', value: 'test5' }
const group = { type: 'select', inputName: 'group', options: 'default', value: 'default' }

describe('Hotspot user configuration', () => {
  it('test configuration', () => {
    const schema = [password, group]
    const schema2 = [group]
    cy.get('input[id=username]').type('test7')
    cy.get('input[id=password]').type('test7')
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.setValues(endpoint, schema, sectionName)
      })
      cy.clickEditSave()
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.checkValues(endpoint, schema2, sectionName)
      })
      cy.clickEditClose()
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('update group in overview', () => {
    const schema = [password, group]
    const schema2 = [group]
    cy.get('input[id=username]').type('test7')
    cy.get('input[id=password]').type('test7')
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.setValues(endpoint, schema, sectionName)
      })
      cy.clickEditSave()
      cy.testNamedConfiguration(endpoint, schema2, sectionName)
      cy.clearSection(endpoint, sectionName)
    })
  })
})
