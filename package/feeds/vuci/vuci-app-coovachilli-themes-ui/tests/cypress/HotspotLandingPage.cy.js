const route = '/services/hotspot/landing'
const endpoint = 'hotspot/themes/global'
const endpoint2 = 'hotspot/themes/config'
before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const landingPage = [{ '.type': 'landing', id: 'general', theme: 'default' }]
const themes = [{ '.type': 'theme', name: 'Default theme', id: 'default', active: '' }]

describe('HotspotLandingPage', () => {
  it('displays landing page general section', () => {
    const schema = [landingPage]
    cy.contains('Theme').should('be.visible')
    cy.testNamedConfiguration(endpoint, schema, 'landingPage')
  })
  it('displays themes section', () => {
    const schema = [themes]
    cy.testNamedConfiguration(endpoint2, schema, 'themes')
  })
  it('opens edit modal', () => {
    const sectionName = 'default'
    cy.get(`[test-id="tablerow-${sectionName}"]`).within(() => {
      cy.clickButton('edit')
    })
    cy.clickEditClose()
  })
  it('download default theme', () => {
    cy.get(`[test-id="tablerow-default"]`).within(() => {
      cy.get('[test-id="button-export"]').click()
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.checkMessage('Theme download was successful').should('be.visible')
    })
  })
  it('default theme delete button disabled', () => {
    cy.get(`[test-id="tablerow-default"]`).within(() => {
      cy.get('[test-id="button-delete"]').should('be.disabled')
    })
  })
  it('should display browse button', () => {
    cy.get(`[test-id="tablerow-"]`).within(() => {
      cy.get('button:contains("Browse")').should('be.visible')
    })
  })
})
