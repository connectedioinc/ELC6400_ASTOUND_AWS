const route = '/services/modbus/modbus_gateway'
const endpoint = '/modbus/serial_gateway/config'
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
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/api/certificates/actions/generate`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          days: '3560',
          delete: '0',
          sign: '0',
          key_size: '512',
          name: 'ca',
          subject: '',
          type: 'ca'
        }
      }
    })
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000)
    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/api/certificates/actions/generate`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          days: '3560',
          delete: '0',
          sign: '0',
          key_size: '512',
          name: 'server',
          subject: '',
          type: 'server'
        }
      }
    })
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000)
    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/api/certificates/actions/sign`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          ca_key: 'ca.key.pem',
          days: '3560',
          delete: '0',
          name: 'signedCA',
          req_file: 'ca.req.pem',
          type: 'ca'
        }
      }
    })
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000)
    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/api/certificates/actions/sign`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          ca: 'signedCA.cert.pem',
          ca_key: 'ca.key.pem',
          days: '3560',
          delete: '0',
          name: 'signedServer',
          req_file: 'server.req.pem',
          type: 'server'
        }
      }
    })
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
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(2000)
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.then(() => {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/server.key.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/signedServer.cert.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/signedCA.cert.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    // ca
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/ca.key.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/ca.req.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    // ca
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/server.req.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  }).then(() => {
    cy.logout()
  })
})

const instanceName = 'test' + Math.floor(Math.random() * 100) + 1
const enabled = {
  true: { type: 'switch', inputName: 'enabled', value: 'true' },
  false: { type: 'switch', inputName: 'enabled', value: 'false' }
}
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
const host = { type: 'input', inputName: 'host', value: '5.5.5.5' }
const port = { type: 'input', inputName: 'port', value: '50' }
const request = { type: 'input', inputName: 'request', value: 'test' }
const response = { type: 'input', inputName: 'response', value: 'test' }
const username = { type: 'input', inputName: 'user', value: 'test' }
const password = { type: 'input', inputName: 'pass', value: 'test' }
const client_id = { type: 'input', inputName: 'client_id', value: '15' }
const keepalive = { type: 'input', inputName: 'keepalive', value: '15' }
const tls = {
  true: { type: 'switch', inputName: 'tls', value: 'true' },
  false: { type: 'switch', inputName: 'tls', value: 'false' }
}
const qos = { type: 'select', inputName: 'qos', options: '1', value: '' }
const tls_type = {
  cert: { type: 'select', inputName: 'tls_type', options: 'cert', value: 'Certificate based' },
  psk: { type: 'select', inputName: 'tls_type', options: 'psk', value: 'Pre-Shared-Key based' }
}
const psk = { type: 'input', inputName: 'psk', value: '100' }
const identity = { type: 'input', inputName: 'identity', value: '100' }
const tls_insecure = {
  true: { type: 'switch', inputName: 'tls_insecure', value: 'true' },
  false: { type: 'switch', inputName: 'tls_insecure', value: 'false' }
}
const device_files = {
  true: { type: 'switch', inputName: 'device_files', value: 'true' },
  false: { type: 'switch', inputName: 'device_files', value: 'false' }
}
const cert = { type: 'button', inputName: 'certfile', value: 'tests/cypress/fixtures/ca.cert.pem' }
const key = { type: 'button', inputName: 'keyfile', value: 'tests/cypress/fixtures/ca.cert.pem' }
const CAfile = { type: 'button', inputName: 'cafile', value: 'tests/cypress/fixtures/ca.cert.pem' }

const certDevice = { type: 'select', inputName: 'certfile', options: '/etc/certificates/signedServer.cert.pem', value: 'signedServer.cert.pem' }
const caDevice = { type: 'select', inputName: 'cafile', options: '/etc/certificates/signedCA.cert.pem', value: 'signedCA.cert.pem' }
const keyDevice = { type: 'select', inputName: 'keyfile', options: '/etc/certificates/ca.key.pem', value: 'ca.key.pem' }

describe('Modbus gateway tests', () => {
  describe('Mqtt configuration', () => {
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
      cy.get('input[id=id]').type(instanceName)
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
    it('base mqtt configuration', function () {
      const schema = [enabled.true, host, port, request, response, username, password, client_id, keepalive, tls.true, tls_type.psk, psk, identity, tls_insecure.true]
      cy.testNamedConfiguration(endpoint, schema, 'gateway')
    })
    it('base mqtt configuration', function () {
      const schema = [enabled.true, host, port, request, response, qos, username, password, client_id, keepalive, tls.true, tls_type.cert, tls_insecure.true, device_files.false, cert, key, CAfile]
      cy.testNamedConfiguration(endpoint, schema, 'gateway')
    })
    it('base mqtt configuration', function () {
      const schema = [
        enabled.true,
        host,
        port,
        request,
        response,
        qos,
        username,
        password,
        client_id,
        keepalive,
        tls.true,
        tls_type.cert,
        tls_insecure.true,
        device_files.true,
        certDevice,
        keyDevice,
        caDevice
      ]
      cy.testNamedConfiguration(endpoint, schema, 'gateway')
    })
  })
  describe('Serial configuration', () => {
    beforeEach(function () {
      if (noSerial) this.skip()
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
      cy.get('input[id=id]').type(instanceName)
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
      const schema = [enable, device.rs485, baudrate, databits, stopbits, parity, duplex.true, flowcontrol]
      cy.get('input[id=id]').type(instanceName)
      cy.testConfigurationEdit(endpoint, schema, 'rtu_device')
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
      const schema = [enable, device.rs485, baudrate, databits, stopbits, parity, flowcontrol, duplex.false]
      cy.get('input[id=id]').type(instanceName)
      cy.testConfigurationEdit(endpoint, schema, 'rtu_device')
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
      const schema = [enable, device.rs232, baudrate, databits, stopbits, parity, flowcontrol]
      cy.get('input[id=id]').type(instanceName)
      cy.testConfigurationEdit(endpoint, schema, 'rtu_device')
    })
  })
})
