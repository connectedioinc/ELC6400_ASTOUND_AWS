const route = '/network/mobile/operators/list'
const endpoint = '/operator_lists/config'
let hasMobile = false

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/packages/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasMobile = body.data.includes('/usr/lib/opkg/info/mobifd.control')
      if (hasMobile) cy.hitPage(route, endpoint)
    })
  })
})

beforeEach(function () {
  if (!hasMobile) this.skip()
})

after(() => {
  cy.logout()
})

const instanceName = 'test1'
const operator = { type: 'select', inputName: 'mcc_mnc_0', value: '479', custom: true }
const operator2 = { type: 'select', inputName: 'mcc_mnc_0', options: '202', value: '202 - Greece' }

describe('Mobile operator list configuration', () => {
  it('Create and add operator code to configuration', () => {
    const schema = [operator]
    cy.get('input[id=name]').type(instanceName)
    cy.testConfigurationEdit(endpoint, schema, 'operators')
  })
  it('Create and select country for configuration', () => {
    const schema = [operator2]
    cy.get('input[id=name]').type(instanceName)
    cy.testConfigurationEdit(endpoint, schema, 'operators')
  })
})
