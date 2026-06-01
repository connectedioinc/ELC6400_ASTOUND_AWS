const route = 'network/firewall/custom'
const endpoint = '/firewall/custom_rules/config/general'
const section = ''

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const customScript = { type: 'textarea', inputName: 'null' }

describe('Firewall: Custom Rules', () => {
  describe('Edit', () => {
    it('Save with exit 0', () => {
      const schema = [{ ...customScript, value: 'exit 0' }]
      cy.testNamedConfiguration(endpoint, schema, section)
    })
    it('Save empty', () => {
      const schema = [{ ...customScript, value: ' ' }]
      cy.testNamedConfiguration(endpoint, schema, section)
    })
    it('Test reset button', () => {
      cy.clickButton('reset')
      cy.checkMessage('Custom rules were reset')
    })
  })
})
