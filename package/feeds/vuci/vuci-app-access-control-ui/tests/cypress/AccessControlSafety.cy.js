const route = '/system/admin/access_control/safety'
const endpoint = '/access_control/security/attempts/config'
let restoreData = {}

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${endpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      restoreData = body.data
    })
  })
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.config('baseUrl')}/api${endpoint}`,
    body: {
      data: restoreData
    },
    headers: {
      Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
      'Content-type': 'application/json'
    }
  })
  cy.logout()
})

// IP Block Settings
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const maxAttemptCount = { type: 'input', inputName: 'max_attempt_count', value: '100' }
const rebootClear = { type: 'switch', inputName: 'reboot_clear', value: 'true' }

describe('Access Control Safety configuration', () => {
  describe('IP Block Settings configuration', () => {
    it('enables all options', () => {
      const schema = [enabled, maxAttemptCount, rebootClear]
      cy.testNamedConfiguration(endpoint, schema, 'general')
    })
  })
})
