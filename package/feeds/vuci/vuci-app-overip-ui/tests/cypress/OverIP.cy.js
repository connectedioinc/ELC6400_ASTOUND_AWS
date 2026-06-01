const route = '/serial_utilities/overip'
const endpoint = '/overip/config'
const consoleRoute = '/serial_utilities/console'
const consoleEndpoint = '/console/config'

let rs232Options = undefined
let rs485Options = undefined
let deviceName = ''
let noSerial = false
const apiURL = `${Cypress.config('baseUrl')}/api`

function getRequestHeaders() {
  return {
    Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
    'Content-type': 'application/json'
  }
}

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${apiURL}/system/device/status`,
      headers: getRequestHeaders()
    }).then(({ body }) => {
      const serial = body.data.board.serial
      if (serial) {
        rs232Options = serial.find(ser => ser.devices && ser.devices.includes('rs232'))
        rs485Options = serial.find(ser => ser.devices && ser.devices.includes('rs485'))
      }
      noSerial = !!(!rs232Options && !rs485Options)
      deviceName = body.data.static.device_name
    })
  })

  cy.hitPage(route, endpoint)
})

before(function () {
  if (noSerial) this.skip()
})

after(() => {
  cy.logout()
})

function createSwitch(inputName, value) {
  return { type: 'switch', inputName, value }
}
function createInput(inputName, value) {
  return { type: 'input', inputName, value }
}
function createSelect(inputName, options, value) {
  return { type: 'select', inputName, options, value }
}
function createUploadFile(inputName, value) {
  return { type: 'uploadFile', inputName, value }
}

///
// General tab
const baudrate = createSelect('baudrate', '1200', '1200')
const databits = createSelect('databits', '8', '8')
const stopbits = createSelect('stopbits', '1', '1')
const parity = createSelect('parity', 'odd', 'Odd')
const flowcontrol = createSelect('flowcontrol', 'none', 'None')

const enabled = {
  true: createSwitch('enabled', 'true'),
  false: createSwitch('enabled', 'false')
}
const device = {
  rs485: createSelect('device', '/dev/rs485', 'rs485'),
  rs232: createSelect('device', '/dev/rs232', 'rs232')
}
const mode = {
  server: createSelect('mode', 'server', 'Server'),
  client: createSelect('mode', 'client', 'Client'),
  bidirect: createSelect('mode', 'bidirect', 'Bidirect')
}
const protocol = {
  tcp: createSelect('protocol', '0', 'TCP'),
  udp: createSelect('protocol', '1', 'UDP')
}
const serverAddress = {
  ip: createInput('ip_connect', '1.1.1.1'),
  port: createInput('port_connect', '50')
}

// Advanced tab
const raw = createSwitch('raw', 'true')
const removeAllZeros = createSwitch('remove_all_zeros', 'true')
const echoEnabled = createSwitch('echo_enabled', 'true')
const fullDuplexEnabled = createSwitch('full_duplex_enabled', 'true')
const tcpEchoEnabled = createSwitch('tcp_echo_enabled', 'true')
const alwaysReconnect = createSwitch('close_connections', 'true')
const reconInterval = createInput('recon_interval', '10')
const portListen = createInput('port_listen', '10')
const timeout = createInput('timeout', '10')
const readDuration = createInput('read_duration', '10')
const keepaliveEnabled = createSwitch('keepalive_time', 'true')
const keepaliveTime = createInput('keepalive_time', '8000')
const keepaliveInterval = createInput('keepalive_interval', '8000')
const keepaliveProbes = createInput('keepalive_probes', '8000')
const maxClients = createSelect('max_clients', '10', '10')

// Security tab
const useTLS = createSwitch('use_tls', 'true')
const verifyHost = createSwitch('verify_host', 'true')
const tlsVersion = {
  tcp: createSelect('tls_version', 'tlsv1.0', 'tlsv1.0'),
  udp: createSelect('tls_version', 'dtlsv1.0', 'dtlsv1.0')
}
const tlsType = {
  cert: createSelect('tls_type', 'cert', 'Certificate based'),
  psk: createSelect('tls_type', 'psk', 'Pre-Shared-Key based')
}

const certFileUpload = {
  client: createUploadFile('cert_file', 'tests/cypress/fixtures/client.cert.pem'),
  server: createUploadFile('cert_file', 'tests/cypress/fixtures/server.cert.pem')
}
const keyFileUpload = {
  client: createUploadFile('key_file', 'tests/cypress/fixtures/client.key'),
  server: createUploadFile('key_file', 'tests/cypress/fixtures/server.key')
}

// TRB142 specific
const cdEnable = createSwitch('cd_enable', 'true')
const dsrEnable = createSwitch('dsr_enable', 'true')
const cdInvert = createSwitch('cd_invert', 'true')
const dsrInvert = createSwitch('dsr_invert', 'true')
///

describe('Overip configuration', () => {
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
      cy.clearCardSection(endpoint, sectionName)
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
      cy.get('.modal-container').within(() => {
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
      cy.get('.modal-container').within(() => {
        cy.get('[test-id="switch-enabled"]').should('have.class', 'disabled')
      })
      cy.clickEditClose()
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.get(`[test-id="rowCard-${sectionName}"]`)
        .scrollIntoView()
        .within(() => {
          cy.get('[test-id="switch-enabled"]').should('have.class', 'disabled')
        })
      cy.clearCardSection(endpoint, sectionName)
      cy.hitPage(consoleRoute, consoleEndpoint)
      cy.clearSection(consoleEndpoint, sec)
      cy.hitPage(route, endpoint)
    })
  })
  it('overview validation test', function () {
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.clickSectionAdd()
    let sectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.clickEditClose()
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.get(`[test-id="rowCard-${sectionName}"]`)
        .scrollIntoView()
        .within(() => {
          cy.clickSwitch('enabled', '1')
        })
      cy.overviewSave('Port value is required')
      cy.clearCardSection(endpoint, sectionName)
    })
  })

  const defaultAdvancedOptions = [raw, removeAllZeros, readDuration]
  if (deviceName === 'TRB142') {
    defaultAdvancedOptions.push(cdEnable)
    defaultAdvancedOptions.push(dsrEnable)
    defaultAdvancedOptions.push(cdInvert)
    defaultAdvancedOptions.push(dsrInvert)
  }

  const serialVariants = {
    rs232: {
      serialOptions: () => rs232Options,
      generalSerialOptions: [device.rs232, echoEnabled]
    },
    rs485: {
      serialOptions: () => rs485Options,
      generalSerialOptions: [device.rs485, fullDuplexEnabled, echoEnabled]
    }
  }

  for (let name in serialVariants) {
    const { serialOptions, generalSerialOptions } = serialVariants[name]

    const defaultGeneralOptions = [name, enabled.true, baudrate, databits, stopbits, parity, flowcontrol, ...generalSerialOptions]
    const createConfigurationEditSchema = (generalOptions, advancedOptions, securityOptions) => [
      { tab: 'General', inputs: [...defaultGeneralOptions, ...generalOptions] },
      { tab: 'Advanced', inputs: [...defaultAdvancedOptions, ...advancedOptions] },
      { tab: 'Security', inputs: securityOptions || [] }
    ]
    const testConfigurationEdit = (generalOptions, advancedOptions, securityOptions) => {
      const schema = createConfigurationEditSchema(generalOptions, advancedOptions, securityOptions)
      cy.testCardConfigurationEdit(endpoint, schema, 'overip')
    }

    describe(`tests ${name} device configurations`, function () {
      before(function () {
        if (!serialOptions()) this.skip()
      })

      const testCases = {
        server: {
          tcp: {
            general: [mode.server, protocol.tcp, portListen],
            advanced: [timeout, maxClients, tcpEchoEnabled, alwaysReconnect],
            security: [useTLS, tlsVersion.tcp, tlsType.cert, certFileUpload.server, keyFileUpload.server]
          },
          udp: {
            general: [echoEnabled, mode.server, protocol.udp, portListen, serverAddress.ip, serverAddress.port],
            advanced: [],
            security: [useTLS, tlsVersion.udp, tlsType.cert, certFileUpload.server, keyFileUpload.server]
          }
        },
        client: {
          tcp: {
            general: [mode.client, protocol.tcp, serverAddress.ip, serverAddress.port],
            advanced: [reconInterval, timeout, keepaliveEnabled, alwaysReconnect, keepaliveTime, keepaliveInterval, keepaliveProbes],
            security: [useTLS, tlsVersion.tcp, tlsType.cert, verifyHost, certFileUpload.server, keyFileUpload.server]
          },
          udp: {
            general: [mode.client, protocol.udp, serverAddress.ip, serverAddress.port],
            advanced: [],
            security: [useTLS, tlsVersion.udp, tlsType.cert, verifyHost, certFileUpload.server, keyFileUpload.server]
          }
        }
      }

      for (const modeName in testCases) {
        describe(`with ${modeName} mode`, () => {
          const tcpOptions = testCases[modeName].tcp
          const udpOptions = testCases[modeName].udp

          it('and TCP protocol', () => {
            testConfigurationEdit(tcpOptions.general, tcpOptions.advanced)
          })
          it('and TCP with TLS protocol', function () {
            testConfigurationEdit(tcpOptions.general, tcpOptions.advanced, tcpOptions.security)
          })
          it('and UDP protocol', () => {
            testConfigurationEdit(udpOptions.general, udpOptions.advanced)
          })
          it('and UDP with TLS protocol', function () {
            testConfigurationEdit(udpOptions.general, udpOptions.advanced, udpOptions.security)
          })
        })
      }

      it('with bidirect mode and tcp protocol', () => {
        testConfigurationEdit(
          [mode.bidirect, protocol.tcp, serverAddress.ip, serverAddress.port, portListen],
          [reconInterval, maxClients, keepaliveEnabled, keepaliveTime, keepaliveInterval, keepaliveProbes]
        )
      })

      it('tests ip filter configurations', () => {
        const schema = createConfigurationEditSchema([mode.server, protocol.tcp, portListen], [timeout, maxClients, tcpEchoEnabled, alwaysReconnect])

        cy.intercept('POST', `/api${endpoint}`).as('postSection')
        let sectionName = ''
        cy.clickSectionAdd()
        cy.wait('@postSection').then(res => {
          sectionName = res.response.body.data.id
          cy.waitForEditModalOpen()
          cy.get('.modal-container').within(() => {
            cy.setValues(endpoint, schema, sectionName)
            cy.clickSectionAdd()
            cy.fillInput('src_ip_0', '1.1.11.1')
          })
          cy.clickEditSave()
          cy.openLastCreatedEdit()
          cy.get('.modal-container').within(() => {
            cy.checkValues(endpoint, schema, sectionName)
            cy.get('[id="section-ip-filter"]').within(() => {
              cy.getInputValue('src_ip_0', '1.1.11.1')
            })
          })
          cy.clickEditClose()
          cy.clearCardSection(endpoint, sectionName)
        })
      })
    })
  }
})
