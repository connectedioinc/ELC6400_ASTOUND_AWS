const route = '/services/serial_utilities/modem_control'
const endpoint = '/modem_control/config'
const consoleRoute = '/services/serial_utilities/console'
const consoleEndpoint = '/console/config'

let rs232Options = {}
let rs485Options = {}
let noSerial = false
let csdSupport = false
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
      rs232Options = body.data.board.serial ? body.data.board.serial.find(ser => ser.devices && ser.devices.includes('rs232')) : false
      rs485Options = body.data.board.serial ? body.data.board.serial.find(ser => ser.devices && ser.devices.includes('rs485')) : false
      noSerial = !!(!rs232Options && !rs485Options)
    })
  })
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/modems/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      const model = body.data[0].model
      if (model === 'EC25-EU' || model === 'EC21-EU') csdSupport = true
    })
  })
  cy.hitPage(route, endpoint)
})
beforeEach(function () {
  if (noSerial) this.skip()
})

after(() => {
  cy.logout()
})
const enabled = {
  true: { type: 'switch', inputName: 'enabled', value: 'true' },
  false: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const name = { type: 'input', inputName: 'name', value: 'test' }
const device = {
  rs485: { type: 'select', inputName: 'device', options: '/dev/rs485', value: 'rs485' },
  rs232: { type: 'select', inputName: 'device', options: '/dev/rs232', value: 'rs232' }
}
const baudrate = { type: 'select', inputName: 'baudrate', options: '1200', value: '1200' }
const databits = { type: 'select', inputName: 'databits', options: '8', value: '8' }
const stopbits = { type: 'select', inputName: 'stopbits', options: '1', value: '1' }
const parity = { type: 'select', inputName: 'parity', options: 'odd', value: 'Odd' }
const flowcontrol = { type: 'select', inputName: 'flowcontrol', options: 'none', value: 'None' }
const ctlMode = { type: 'select', inputName: 'ctl_mode', options: 'full', value: 'Full control' }
const fullDuplexEnabled = { type: 'switch', inputName: 'full_duplex_enabled', value: 'true' }
const start_up_msg = { type: 'list', inputName: 'start_up_msg', value: ['test', 'test1'] }

const csd_enabled = { type: 'switch', inputName: 'csd_enabled', value: 'true' }
const networkmode = { type: 'select', inputName: 'csd_scan_mode', options: '1', value: '2G only' }
const role = { type: 'select', inputName: 'csd_role', options: '1', value: 'Responder' }

describe('Modem console configuration', () => {
  it('csd option configuration test', function () {
    if (!csdSupport) this.skip()
    const schema = [csd_enabled, networkmode, role]
    cy.testConfigurationEdit(endpoint, schema, 'modem')
  })
  it('info indication when serial device is enabled validation test', function () {
    cy.hitPage(consoleRoute, consoleEndpoint)
    cy.intercept('POST', `/api${consoleEndpoint}`).as('postConsole')
    cy.clickSectionAdd()
    let sec = ''
    cy.wait('@postConsole').then(res => {
      sec = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-console"]').within(() => {
          cy.setValues(consoleEndpoint, [enabled.true], sec)
        })
      })
      cy.clickEditSave()
    })
    cy.hitPage(route, endpoint)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.clickSectionAdd()
    let sectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="switch-enabled"]').should('have.class', 'disabled')
        cy.get('[test-id="device-service-enabled-link"]').click()
        cy.url().should('contain', consoleRoute)
        cy.document().its('body').find('.spin-content')
        cy.document().its('body').find('.spin-content').should('not.exist')
      })
      cy.clearSection(consoleEndpoint, sec)
      cy.hitPage(route, endpoint)
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('disabled enable button test', function () {
    cy.hitPage(consoleRoute, consoleEndpoint)
    cy.intercept('POST', `/api${consoleEndpoint}`).as('postConsole')
    cy.clickSectionAdd()
    let sec = ''
    cy.wait('@postConsole').then(res => {
      sec = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-console"]').within(() => {
          cy.setValues(consoleEndpoint, [enabled.true], sec)
        })
      })
      cy.clickEditSave()
    })
    cy.hitPage(route, endpoint)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.clickSectionAdd()
    let sectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="switch-enabled"]').should('have.class', 'disabled')
      })
      cy.clickEditClose()
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.get(`[test-id="tablerow-${sectionName}"]`)
        .scrollIntoView()
        .within(() => {
          cy.get('[test-id="switch-enabled"]').should('have.class', 'disabled')
        })
      cy.clearSection(endpoint, sectionName)
      cy.hitPage(consoleRoute, consoleEndpoint)
      cy.clearSection(consoleEndpoint, sec)
      cy.hitPage(route, endpoint)
    })
  })
  it('tests rs232 device configurations ', function () {
    if (!rs232Options) this.skip()
    const schema = [enabled.true, name, device.rs232, baudrate, databits, stopbits, parity, flowcontrol, ctlMode, start_up_msg]
    cy.testConfigurationEdit(endpoint, schema, 'modem')
  })
  it('tests rs485 device configurations ', function () {
    if (!rs485Options) this.skip()
    const schema = [enabled.true, name, device.rs485, baudrate, databits, stopbits, parity, flowcontrol, ctlMode, fullDuplexEnabled, start_up_msg]
    cy.testConfigurationEdit(endpoint, schema, 'modem')
  })
})
