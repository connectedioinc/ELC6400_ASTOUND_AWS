const route = '/services/wol'
const setupEndpoint = '/wol/setup/config'
const devicesEndpoint = '/wol/devices/config'
const message = 'Wol Packet sent'

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

// Wake on LAN
const broadcast = { type: 'switch', inputName: 'broadcast', value: 'true' }

// Wake on LAN devices
const wolName = { type: 'input', inputName: 'name', value: 'test' }
const mac = { type: 'input', inputName: 'mac', value: '12:23:34:45:56:67' }
const password = { type: 'input', inputName: 'password', value: 'aabbaabb' }
const wakeonboot = { type: 'switch', inputName: 'wakeonboot', value: 'true' }

describe('Wake on LAN configuration', () => {
  describe('Wake on LAN section', () => {
    it('Enables Broadcast and clicks `Wake all devices`', () => {
      const schema = [broadcast]
      cy.testNamedConfiguration(setupEndpoint, schema, 'general')
      cy.clickButton('wakeAllDevices')
      cy.checkMessage(message)
    })
    it('Disables Broadcast and clicks `Wake all devices`', () => {
      broadcast.value = 'false'
      const schema = [broadcast]
      cy.testNamedConfiguration(setupEndpoint, schema, 'general')
      cy.clickButton('wakeAllDevices')
      cy.checkMessage(message)
    })
  })
  describe('Wake on LAN devices section', () => {
    it('Adds new wake on LAN device', () => {
      const schema = [wolName, mac, password, wakeonboot]
      cy.testTypedOverviewConfiguration(devicesEndpoint, schema, 'target')
    })
    it('Clicks `Wake device`', () => {
      let sections
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api${devicesEndpoint}`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        sections = body.data
      })
      cy.then(() => {
        cy.get(`[test-id="tablerow-${sections[0].id}"]`).within(() => {
          cy.clickButton('wakeSingleDevice')
        })
      })
      cy.checkMessage(message)
    })
  })
})
