const route = '/system/admin/group/phone'
const endpoint = '/recipients/phone_groups/config'
let hasModem = false

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/modems/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasModem = body.data.length > 0
    })
  })
  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasModem) this.skip()
})

after(() => {
  cy.logout()
})
const groupName = 'test' + Math.floor(Math.random() * 100) + 1
const tel = { type: 'list', inputName: 'tel', value: ['+37012345678'] }

describe('Phone groups configuration', () => {
  it('Create and add phone nubmer to configuration', () => {
    const schema = [tel]
    cy.get('input[id=name]').type(groupName)
    cy.testConfigurationEdit(endpoint, schema, 'groups')
  })
})
