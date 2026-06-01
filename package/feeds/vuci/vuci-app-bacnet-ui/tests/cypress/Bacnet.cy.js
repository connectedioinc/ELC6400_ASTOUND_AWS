const route = '/services/bacnet'
const endpoint = '/bacnet/config'
const consoleRoute = '/services/serial_utilities/console'
const consoleEndpoint = '/console/config'

let rs485Options = {}
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
      rs485Options = body.data.board.serial ? body.data.board.serial.find(ser => ser.devices && ser.devices.includes('rs485')) : false
    })
  })
  cy.hitPage(route, endpoint)
})
beforeEach(function () {
  if (!rs485Options) this.skip()
})

after(() => {
  cy.logout()
})

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const bbmdEnabled = { type: 'switch', inputName: 'bbmd_enabled', value: 'true' }
const portForward = { type: 'switch', inputName: 'allow_ra', value: 'true' }
const forceGateway = {
  true: { type: 'switch', inputName: 'force_gateway', value: 'true' },
  false: { type: 'switch', inputName: 'force_gateway', value: 'false' }
}
const gatewayAddress = { type: 'input', inputName: 'gateway_address', value: '192.168.1.1' }
const gatewayPort = { type: 'input', inputName: 'gateway_port', value: '8888' }
const port = { type: 'input', inputName: 'port', value: '8888' }
const mac = { type: 'input', inputName: 'mac', value: '120' }
const maxClient = { type: 'input', inputName: 'max_client', value: '120' }
const baudrate = { type: 'select', inputName: 'baud', options: '1200', value: '1200' }
const parity = { type: 'select', inputName: 'parity', options: 'odd', value: 'Odd' }
const databits = { type: 'select', inputName: 'databits', options: '8', value: '8' }
const stopbits = { type: 'select', inputName: 'stopbits', options: '1', value: '1' }
describe('Bacnet configuration', () => {
  it('info indication when serial device is enabled validation test', function () {
    cy.hitPage(consoleRoute, consoleEndpoint)
    cy.intercept('POST', `/api${consoleEndpoint}`).as('postConsole')
    cy.selectValue('device', '/dev/rs485', 'rs485', false)
    cy.clickSectionAdd()
    let sec = '1'
    cy.wait('@postConsole').then(res => {
      sec = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-console"]').within(() => {
          cy.setValues(consoleEndpoint, [enabled], sec)
        })
      })
      cy.clickEditSave()
    })
    cy.hitPage(route, endpoint)
    cy.get('[test-id="switch-enabled"]').should('have.class', 'disabled')
    cy.get('[test-id="device-service-enabled-link"]').click()
    cy.clearSection(consoleEndpoint, sec)
    cy.hitPage(route, endpoint)
  })
  it('disabled enable button test', function () {
    cy.hitPage(consoleRoute, consoleEndpoint)
    cy.intercept('POST', `/api${consoleEndpoint}`).as('postConsole')
    cy.selectValue('device', '/dev/rs485', 'rs485', false)
    cy.clickSectionAdd()
    let sec = '1'
    cy.wait('@postConsole').then(res => {
      sec = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-console"]').within(() => {
          cy.setValues(consoleEndpoint, [enabled], sec)
        })
      })
      cy.clickEditSave()
    })
    cy.hitPage(route, endpoint)
    cy.get('[test-id="switch-enabled"]').should('have.class', 'disabled')
    cy.hitPage(consoleRoute, consoleEndpoint)
    cy.clearSection(consoleEndpoint, sec)
    cy.hitPage(route, endpoint)
  })
  it('tests bacnet general with enabled configurations', function () {
    if (!rs485Options) this.skip()
    const schema = [enabled, bbmdEnabled, portForward, forceGateway.true, gatewayAddress, gatewayPort]
    cy.testNamedConfiguration(endpoint, schema, 'general')
  })
  it('tests bacnet general with disabled configurations', function () {
    if (!rs485Options) this.skip()
    const schema = [enabled, bbmdEnabled]
    schema[0].value = 'false'
    schema[1].value = 'false'
    cy.testNamedConfiguration(endpoint, schema, 'general')
  })
  it('tests bacnet bip configurations', function () {
    if (!rs485Options) this.skip()
    const schema = [port]
    cy.testNamedConfiguration(endpoint, schema, 'bip')
  })
  it('tests bacnet mstp configurations', function () {
    if (!rs485Options) this.skip()
    const schema = [mac, maxClient, baudrate, parity, databits, stopbits]
    cy.testNamedConfiguration(endpoint, schema, 'mstp')
  })
})
