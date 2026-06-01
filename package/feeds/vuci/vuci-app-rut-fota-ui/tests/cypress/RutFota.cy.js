const route = '/system/flashops/fota'
const endpoint = '/fota/config'
before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }

describe('Configuration with FOTA enabled', () => {
  it('Configuration with FOTA enabled', () => {
    const schema = [enabled]
    cy.testNamedConfiguration(endpoint, schema, 'rutFota')
  })
  it('Configuration with FOTA disabled', () => {
    const schema = [enabled]
    schema[0].value = 'false'
    cy.testNamedConfiguration(endpoint, schema, 'rutFota')
  })
})
