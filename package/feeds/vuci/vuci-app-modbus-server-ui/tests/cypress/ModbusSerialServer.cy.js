const route = '/services/modbus/modbus_serial_server'
const endpoint = '/modbus/server/serial/config'
const consoleRoute = '/services/serial_utilities/console'
const consoleEndpoint = '/console/config'
let rs232Options = {}
let rs485Options = {}
let rs232Status = false
let noSerial = false
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
      if (noSerial) return
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/serial/status`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        rs232Status = body.data.some(dat => dat.name === '/dev/rs232' && dat.is_used === '1')
      })
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

const instanceName = 'test' + Math.floor(Math.random() * 100) + 1
const enabled = {
  true: { type: 'switch', inputName: 'enabled', value: 'true' },
  false: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const name1 = { type: 'input', inputName: 'name', value: 'test' }
const device = {
  rs485: { type: 'select', inputName: 'device', options: '/dev/rs485', value: 'rs485' },
  rs232: { type: 'select', inputName: 'device', options: '/dev/rs232', value: 'rs232' }
}
const baudrate = { type: 'select', inputName: 'baudrate', options: '1200', value: '1200' }
const databits = { type: 'select', inputName: 'databits', options: '8', value: '8' }
const stopbits = { type: 'select', inputName: 'stopbits', options: '1', value: '1' }
const parity = { type: 'select', inputName: 'parity', options: 'odd', value: 'Odd' }
const flowcontrol = { type: 'select', inputName: 'flowcontrol', options: 'none', value: 'None' }
const duplex = {
  true: { type: 'switch', inputName: 'full_duplex_enabled', value: 'true' },
  false: { type: 'switch', inputName: 'full_duplex_enabled', value: 'false' }
}
const parityDisplay = {
  none: 'None',
  odd: 'Odd',
  even: 'Even',
  mark: 'Mark',
  space: 'Space'
}
const flowControlDisplay = {
  none: 'None',
  'rts/cts': 'RTS/CTS',
  'xon/xoff': 'Xon/Xoff'
}
const clientregs = { type: 'switch', inputName: 'clientregs', value: 'false' }

// Custom register block
const regfile = { type: 'input', inputName: 'regfile', value: '/tmp/regfile' }
const regfilestart = { type: 'input', inputName: 'regfilestart', value: '1025' }
const regfilesize = { type: 'input', inputName: 'regfilesize', value: '128' }

describe('Modbus serial server tests', () => {
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
    cy.get('input[id=name]').type(instanceName)
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
    cy.get('input[id=name]').type(instanceName)
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
  describe('Base Configuration', () => {
    it('base configuration with full duplex enabled and rs485 configuration', function () {
      if (!rs485Options) this.skip()
      clientregs.value = 'true'
      baudrate.value = rs485Options.bauds[0]
      baudrate.options = rs485Options.bauds[0]
      databits.value = rs485Options.data_bits[0]
      databits.options = rs485Options.data_bits[0]
      stopbits.value = rs485Options.stop_bits[0]
      stopbits.options = rs485Options.stop_bits[0]
      parity.value = parityDisplay[rs485Options.parity_types[0]]
      parity.options = rs485Options.parity_types[0]
      flowcontrol.value = flowControlDisplay[rs485Options.flow_control[0]]
      flowcontrol.options = rs485Options.flow_control[0]
      const enable = rs232Status ? enabled.false : enabled.true
      const schema = [enable, name1, device.rs485, baudrate, databits, stopbits, parity, duplex.true, flowcontrol, clientregs, regfile, regfilestart, regfilesize]
      cy.get('input[id=name]').type(instanceName)
      cy.testConfigurationEdit(endpoint, schema, 'modbusSerialServer')
    })
    it('base configuration with full duplex and instance disabled, rs485', function () {
      if (!rs485Options) this.skip()
      baudrate.value = rs485Options.bauds[0]
      baudrate.options = rs485Options.bauds[0]
      databits.value = rs485Options.data_bits[0]
      databits.options = rs485Options.data_bits[0]
      stopbits.value = rs485Options.stop_bits[0]
      stopbits.options = rs485Options.stop_bits[0]
      parity.value = parityDisplay[rs485Options.parity_types[0]]
      parity.options = rs485Options.parity_types[0]
      flowcontrol.value = flowControlDisplay.none
      flowcontrol.options = 'none'
      const enable = rs232Status ? enabled.false : enabled.true
      const schema = [enable, name1, device.rs485, baudrate, databits, stopbits, parity, flowcontrol, duplex.false, clientregs]
      cy.get('input[id=name]').type(instanceName)
      cy.testConfigurationEdit(endpoint, schema, 'modbusSerialServer')
    })
    it('base configuration rs232', function () {
      if (!rs232Options) this.skip()
      baudrate.value = rs232Options.bauds[0]
      baudrate.options = rs232Options.bauds[0]
      databits.value = rs232Options.data_bits[0]
      databits.options = rs232Options.data_bits[0]
      stopbits.value = rs232Options.stop_bits[0]
      stopbits.options = rs232Options.stop_bits[0]
      parity.value = parityDisplay[rs232Options.parity_types[0]]
      parity.options = rs232Options.parity_types[0]
      flowcontrol.value = flowControlDisplay[rs232Options.flow_control[0]]
      flowcontrol.options = rs232Options.flow_control[0]
      const enable = rs232Status ? enabled.false : enabled.true
      const schema = [enable, name1, device.rs232, baudrate, databits, stopbits, parity, flowcontrol, clientregs]
      cy.get('input[id=name]').type(instanceName)
      cy.testConfigurationEdit(endpoint, schema, 'modbusSerialServer')
    })
  })
})
