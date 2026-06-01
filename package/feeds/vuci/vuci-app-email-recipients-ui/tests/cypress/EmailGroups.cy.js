const route = '/system/admin/group/email'
const endpoint = '/recipients/email_users/config'
before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})
const groupName = 'test' + Math.floor(Math.random() * 100) + 1
const secure_conn = { type: 'switch', inputName: 'secure_conn', value: 'true' }
const smtp_ip = { type: 'input', inputName: 'smtp_ip', value: 'smtp.domain.com' }
const smtp_port = { type: 'input', inputName: 'smtp_port', value: '465' }
const credentials = { type: 'switch', inputName: 'credentials', value: 'false' }
const username = { type: 'input', inputName: 'username', value: 'test' }
const password = { type: 'input', inputName: 'password', value: 'pass' }
const senderemail = { type: 'input', inputName: 'senderemail', value: 'email@domain.com' }

describe('Phone groups configuration', () => {
  it('Create configuration with disabled credentials', () => {
    const schema = [secure_conn, smtp_ip, smtp_port, credentials, senderemail]
    cy.get('input[id=name]').type(groupName)
    cy.testConfigurationEdit(endpoint, schema, 'users')
  })
  it('Create configuration with enabled credentials', () => {
    secure_conn.value = 'false'
    credentials.value = 'true'
    const schema = [secure_conn, smtp_ip, smtp_port, credentials, username, password, senderemail]
    cy.get('input[id=name]').type(groupName)
    cy.testConfigurationEdit(endpoint, schema, 'users')
  })
})
