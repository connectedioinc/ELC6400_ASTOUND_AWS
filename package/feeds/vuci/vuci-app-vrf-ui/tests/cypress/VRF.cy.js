const route = '/network/vrf'
const endpoint = '/vrf/config'

let isDsa = false

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      isDsa = body.data.board.hwinfo.dsa
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const linkValue = isDsa ? 'port1' : 'eth0'
const scheme = [
  { type: 'switch', inputName: 'enabled', value: 'false' },
  { type: 'input', inputName: 'table', value: '101' },
  { type: 'multiselect', inputName: 'link', value: [{ options: linkValue, value: linkValue }] }
]

describe('VRF configuration', () => {
  it('VRF configuration', () => {
    cy.get('[id="section-add-new-instance"]').within(() => {
      cy.get('input[id=id]').type('vrf123')
    })
    cy.testCardConfigurationEdit(endpoint, scheme, 'vrf')
  })
})
