const route = '/services/serial_utilities/console'
const endpoint = '/console/config'
const overipRoute = '/services/serial_utilities/overip'
const overipEndpoint = '/overip/config'

let rs232Options = {}
let rs485Options = {}
let rs232Status = false
let noSerial = {}
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
const portListen = { type: 'input', inputName: 'port_listen', value: '10' }

describe('Console end to end tests', () => {
  it('info indication when serial device is enabled validation test', function () {
    cy.hitPage(overipRoute, overipEndpoint)
    cy.intercept('POST', `/api${overipEndpoint}`).as('postOverIP')
    cy.clickSectionAdd()
    let sec = ''
    cy.wait('@postOverIP').then(res => {
      sec = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-overip"]').within(() => {
          cy.setValues(overipEndpoint, [enabled.true, portListen], sec)
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
        cy.url().should('contain', route)
        cy.document().its('body').find('.spin-content')
        cy.document().its('body').find('.spin-content').should('not.exist')
      })
      cy.clearCardSection(overipEndpoint, sec)
      cy.hitPage(route, endpoint)
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('disabled enable button test', function () {
    cy.hitPage(overipRoute, overipEndpoint)
    cy.intercept('POST', `/api${overipEndpoint}`).as('postOverIP')
    cy.clickSectionAdd()
    let sec = ''
    cy.wait('@postOverIP').then(res => {
      sec = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-overip"]').within(() => {
          cy.setValues(overipEndpoint, [enabled.true, portListen], sec)
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
      cy.hitPage(overipRoute, overipEndpoint)
      cy.clearCardSection(overipEndpoint, sec)
      cy.hitPage(route, endpoint)
    })
  })
  describe('Base Configuration', () => {
    it('base configuration with full duplex enabled and rs485 configuration', function () {
      if (!rs485Options) this.skip()
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
      const schema = [enable, name1, device.rs485, baudrate, databits, stopbits, parity, duplex.true, flowcontrol]
      cy.testConfigurationEdit(endpoint, schema, 'console')
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
      flowcontrol.value = flowControlDisplay[rs485Options.flow_control[0]]
      flowcontrol.options = rs485Options.flow_control[0]
      const enable = rs232Status ? enabled.false : enabled.true
      const schema = [enable, name1, device.rs485, baudrate, databits, stopbits, parity, duplex.false]
      cy.testConfigurationEdit(endpoint, schema, 'console')
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
      const schema = [enable, name1, device.rs232, baudrate, databits, stopbits, parity, flowcontrol]
      cy.testConfigurationEdit(endpoint, schema, 'console')
    })
  })
})
