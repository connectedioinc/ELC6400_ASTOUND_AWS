const route = '/services/bluetooth'
const endpoint = '/bluetooth/general/config/'
let hasBluetooth = false
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
      hasBluetooth = body.data.board.hwinfo.bluetooth
    })
  })
  cy.hitPage(route)
})
beforeEach(function () {
  if (!hasBluetooth) this.skip()
})
after(() => {
  cy.logout()
})

const enabled = {
  true: { type: 'switch', inputName: 'enabled', value: 'true' },
  false: { type: 'switch', inputName: 'enabled', value: 'false' }
}
// For the future figure out how to test the rest of bluetooth functionality
describe('tests bluetooth configuration', () => {
  it('Turns on bluetooth', () => {
    const schema = [enabled.true]
    const baseSchema = [enabled.false]
    cy.testNamedConfiguration(endpoint, schema, 'bluetooth')
    cy.testNamedConfiguration(endpoint, baseSchema, 'bluetooth')
  })
  it('Scans for available devices', () => {
    const schema = [enabled.true]
    const baseSchema = [enabled.false]
    cy.testNamedConfiguration(endpoint, schema, 'bluetooth')
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(10000)
    cy.get('[test-id="tablerow-bluetooth"]').within(() => {
      cy.get('[test-id="button-scan"]').click()
    })
    cy.testNamedConfiguration(endpoint, baseSchema, 'bluetooth')
  })
})
