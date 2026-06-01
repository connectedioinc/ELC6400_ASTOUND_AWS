const route = '/services/ntrip'
const endpoint = '/ntrip/config'
const consoleRoute = '/services/serial_utilities/console'
const consoleEndpoint = '/console/config'

let rs232Options = {}
let rs485Options = {}
let noSerial = false
let hasGps = false
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
      hasGps = body.data.board.hwinfo.gps
      noSerial = !!(!rs232Options && !rs485Options)
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

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
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
const fullDuplexEnabled = { type: 'switch', inputName: 'full_duplex_enabled', value: 'false' }
const ntripIp = { type: 'input', inputName: 'ntrip_ip', value: '192.168.1.1' }
const ntripPort = { type: 'input', inputName: 'ntrip_port', value: '8888' }
const ntripMountPoint = { type: 'input', inputName: 'ntrip_mount_point', value: 'test' }
const ntripDataFormat = { type: 'select', inputName: 'ntrip_data_format', options: 'h', value: 'NTRIP v2.0 TCP' }
const ntripUser = { type: 'input', inputName: 'ntrip_user', value: 'test' }
const ntripPassword = { type: 'input', inputName: 'ntrip_password', value: 'test' }
const nmeaSource = {
  predefined_string: { type: 'select', inputName: 'nmea_source', options: '1', value: 'Predefined string' },
  predefined_coordinates: { type: 'select', inputName: 'nmea_source', options: '2', value: 'Predefined coordinates' },
  serial_device: { type: 'select', inputName: 'nmea_source', options: '4', value: 'Serial device' },
  gps: { type: 'select', inputName: 'nmea_source', options: '3', value: 'Router GPS device' }
}

const userNmea = { type: 'input', inputName: 'user_nmea', value: '$GPGGA,1' }
const lattitude = { type: 'input', inputName: 'lattitude', value: '-90.000000' }
const longitude = { type: 'input', inputName: 'longitude', value: '-90.000000' }
const reportInterval = { type: 'input', inputName: 'report_interval', value: '90' }

describe('NTRIP configuration tests', () => {
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
          cy.setValues(consoleEndpoint, [enabled], sec)
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
          cy.setValues(consoleEndpoint, [enabled], sec)
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
  it('overview validation test', function () {
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.clickSectionAdd()
    let sectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.clickEditClose()
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.get(`[test-id="tablerow-${sectionName}"]`)
        .scrollIntoView()
        .within(() => {
          cy.clickSwitch('enabled', '1')
        })
      cy.overviewSave('Missing required options: Server address and/or Server port')
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('tests rs232 device configurations with predefined string as nmea source', function () {
    if (!rs232Options) this.skip()
    const schema = [
      enabled,
      name,
      device.rs232,
      baudrate,
      databits,
      stopbits,
      parity,
      flowcontrol,
      ntripIp,
      ntripPort,
      ntripMountPoint,
      ntripDataFormat,
      ntripUser,
      ntripPassword,
      nmeaSource.predefined_string,
      userNmea,
      reportInterval
    ]
    cy.testConfigurationEdit(endpoint, schema, 'ntrip')
  })
  it('tests rs485 device configurations with predefined string as nmea source', function () {
    if (!rs485Options) this.skip()
    const schema = [
      enabled,
      name,
      device.rs485,
      baudrate,
      databits,
      stopbits,
      parity,
      flowcontrol,
      fullDuplexEnabled,
      ntripIp,
      ntripPort,
      ntripMountPoint,
      ntripDataFormat,
      ntripUser,
      ntripPassword,
      nmeaSource.predefined_string,
      userNmea,
      reportInterval
    ]
    cy.testConfigurationEdit(endpoint, schema, 'ntrip')
  })
  it('tests rs232 device configurations with predefined coordinates as nmea source', function () {
    if (!rs232Options) this.skip()
    const schema = [
      enabled,
      name,
      device.rs232,
      baudrate,
      databits,
      stopbits,
      parity,
      flowcontrol,
      ntripIp,
      ntripPort,
      ntripMountPoint,
      ntripDataFormat,
      ntripUser,
      ntripPassword,
      nmeaSource.predefined_coordinates,
      lattitude,
      longitude,
      reportInterval
    ]
    cy.testConfigurationEdit(endpoint, schema, 'ntrip')
  })
  it('tests rs485 device configurations with predefined coordinates as nmea source', function () {
    if (!rs485Options) this.skip()
    const schema = [
      enabled,
      name,
      device.rs485,
      baudrate,
      databits,
      stopbits,
      parity,
      flowcontrol,
      fullDuplexEnabled,
      ntripIp,
      ntripPort,
      ntripMountPoint,
      ntripDataFormat,
      ntripUser,
      ntripPassword,
      nmeaSource.predefined_coordinates,
      lattitude,
      longitude,
      reportInterval
    ]
    cy.testConfigurationEdit(endpoint, schema, 'ntrip')
  })
  it('tests rs232 device configurations with serial device as nmea source', function () {
    if (!rs232Options) this.skip()
    const schema = [
      enabled,
      name,
      device.rs232,
      baudrate,
      databits,
      stopbits,
      parity,
      flowcontrol,
      ntripIp,
      ntripPort,
      ntripMountPoint,
      ntripDataFormat,
      ntripUser,
      ntripPassword,
      nmeaSource.serial_device,
      reportInterval
    ]
    cy.testConfigurationEdit(endpoint, schema, 'ntrip')
  })
  it('tests rs485 device configurations with serial device as nmea source', function () {
    if (!rs485Options) this.skip()
    const schema = [
      enabled,
      name,
      device.rs485,
      baudrate,
      databits,
      stopbits,
      parity,
      flowcontrol,
      fullDuplexEnabled,
      ntripIp,
      ntripPort,
      ntripMountPoint,
      ntripDataFormat,
      ntripUser,
      ntripPassword,
      nmeaSource.serial_device,
      reportInterval
    ]
    cy.testConfigurationEdit(endpoint, schema, 'ntrip')
  })
  it('tests rs232 device configurations with router GPS device as nmea source', function () {
    if (!rs232Options || !hasGps) this.skip()
    const schema = [
      enabled,
      name,
      device.rs232,
      baudrate,
      databits,
      stopbits,
      parity,
      flowcontrol,
      ntripIp,
      ntripPort,
      ntripMountPoint,
      ntripDataFormat,
      ntripUser,
      ntripPassword,
      nmeaSource.gps,
      reportInterval
    ]
    cy.testConfigurationEdit(endpoint, schema, 'ntrip')
  })
  it('tests rs485 device configurations with router GPS device as nmea source', function () {
    if (!rs485Options || !hasGps) this.skip()
    const schema = [
      enabled,
      name,
      device.rs485,
      baudrate,
      databits,
      stopbits,
      parity,
      flowcontrol,
      fullDuplexEnabled,
      ntripIp,
      ntripPort,
      ntripMountPoint,
      ntripDataFormat,
      ntripUser,
      ntripPassword,
      nmeaSource.gps,
      reportInterval
    ]
    cy.testConfigurationEdit(endpoint, schema, 'ntrip')
  })
})
