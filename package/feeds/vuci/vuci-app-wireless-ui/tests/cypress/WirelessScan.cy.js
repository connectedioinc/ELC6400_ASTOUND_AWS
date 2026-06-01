const route = '/network/wireless/ssids'
const endpoint = '/wireless/actions/scan'
const joinEndpoint = '/wireless/actions/join'
const wifiSection2_4 = 'radio0'
const wifiSection5 = 'radio1'

before(function () {
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
      const hasWifi = body.data.board.hwinfo.wifi
      if (!hasWifi) this.skip()
    })
  })
  cy.hitPage(route)
})
let encription
const instanceName = 'test' + Math.floor(Math.random() * 100) + 1
const wpaPassphrase = { type: 'input', inputName: 'key', value: 'Admin123' }
const networkName = { type: 'input', inputName: 'network_name', value: instanceName }
const joinSchemaEncription = [wpaPassphrase, networkName]
const joinSchemaNoEncription = [networkName]

after(() => {
  cy.logout()
})
function wifiScanner(section) {
  cy.intercept('POST', `/api${endpoint}`).as('postSection')
  cy.get(`[test-id="tablerow-${section}"]`).within(() => {
    cy.clickButton('scan')
  })
  cy.wait('@postSection').then(({ response }) => {
    if (response.body.data.length === 0) this.skip()
    let joinNetwork
    cy.getModal().within(() => {
      cy.get('[test-id="tablecolumns-ssid"]')
        .first()
        .then(td => {
          joinNetwork = td.text().split(' ')[3]
          if (!joinNetwork || joinNetwork === 'This section contains no values yet') this.skip()
        })
      cy.get('[test-id="tablecolumns-encryption_description"]')
        .first()
        .then(td => {
          if (td.text().split(' ')[3] === 'None') {
            encription = false
          } else {
            encription = true
          }
        })
      cy.get('[test-id="button-joinnetwork"]').first().click()
    })
    cy.get('[test-id="tablerow-wifiInterfaces"]').within(() => {
      cy.setValues(joinEndpoint, encription ? joinSchemaEncription : joinSchemaNoEncription, `joining-network:-${joinNetwork}`)
    })
    cy.intercept('POST', `/api${joinEndpoint}`).as('postSection2')
    cy.clickButton('submit')
  })
  cy.wait('@postSection2').then(res => {
    const sectionId = res.response.body.data.id
    cy.getModal().within(() => {
      cy.intercept('PUT', `/api/wireless/devices/config/${sectionId}`).as('putSection')
      cy.clickButton('saveandapply')
    })
  })
  cy.wait('@putSection').then(() => {
    cy.get('[test-id="tablerow-interfaces"]').within(() => {
      cy.intercept('POST', '/api/bulk').as('postBulk')
      cy.clickButton('saveandapply')
    })
  })
  cy.wait('@postBulk').then(() => {
    cy.get('[test-id="tablerow-interfaces"]').within(() => {
      cy.get('.interface-card-wrapper')
        .eq(5)
        .should('contain', instanceName)
        .within(() => {
          cy.get('.action-buttons').within(() => {
            cy.clickButton('delete')
          })
        })
    })
    cy.intercept('DELETE', '/api//interfaces/config').as('deleteSection')
    cy.clickButton('ok')
  })
  cy.wait('@deleteSection').then(() => {
    cy.hitPage(route)
  })
}
describe('Wireless: SCAN', () => {
  it('Check WIFI 2.4GHZ', () => {
    wifiScanner(wifiSection2_4)
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(30000)
  })
  it('Check WIFI 5GHZ', () => {
    wifiScanner(wifiSection5)
  })
})
