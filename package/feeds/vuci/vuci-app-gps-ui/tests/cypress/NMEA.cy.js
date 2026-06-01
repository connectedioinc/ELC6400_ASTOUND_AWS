const route = '/services/gps/nmea'
const nmeaEndpoint = '/gps/nmea/config'
const rulesEndpoint = '/gps/nmea/rules/config'
let sectionNames = []
let restoreData = {}
let restoreData2 = {}
let hasGPS = false

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
      hasGPS = body.data.board.hwinfo.gps
    })
  })
  cy.then(() => {
    if (hasGPS) {
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api${rulesEndpoint}`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        sectionNames = body.data.map(section => section.id)
        restoreData = body.data
      })
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api${nmeaEndpoint}`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        restoreData2 = body.data
      })
    }
  })
  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasGPS) this.skip()
})
after(() => {
  if (hasGPS) {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${rulesEndpoint}`,
      body: {
        data: restoreData
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${nmeaEndpoint}`,
      body: {
        data: restoreData2
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  }
  cy.logout()
})

// NMEA forwarding
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const hostname = { type: 'input', inputName: 'hostname', value: '1.1.1.1' }
const proto = {
  tcp: { type: 'select', inputName: 'proto', options: 'tcp', value: 'TCP' },
  udp: { type: 'select', inputName: 'proto', options: 'udp', value: 'UDP' }
}
const port = { type: 'input', inputName: 'port', value: '8500' }
const conCont = { type: 'switch', inputName: 'con_contain', value: 'true' }
const sendPrefix = { type: 'select', inputName: 'send_prefix', value: 'None', options: 'none' }

// NMEA forwarding cache
const type = {
  ram: { type: 'select', inputName: 'type', options: 'ram', value: 'RAM memory' },
  flash: { type: 'select', inputName: 'type', options: 'flash', value: 'Flash memory' }
}
const sentencesMax = { type: 'input', inputName: 'sentences_max', value: '5000' }
const location = { type: 'input', inputName: 'location', value: '/mnt/file' }

// NMEA collecting
const collectingEnabled = { type: 'switch', inputName: 'collecting_enabled', value: 'true' }
const collectingLocation = { type: 'input', inputName: 'collecting_location', value: '/mnt/file' }

// NMEA sentence settings
const forwardingEnabled = { type: 'switch', inputName: 'forwarding_enabled', value: 'true' }
const forwardingInterval = { type: 'input', inputName: 'forwarding_interval', value: '5' }
const collectingEnabled2 = { type: 'switch', inputName: 'collecting_enabled', value: 'true' }
const collectingInterval = { type: 'input', inputName: 'collecting_interval', value: '5' }

describe('GPS NMEA configuration', () => {
  describe('NMEA forwarding configuration', () => {
    it('Configuration with enabled forwarding and protocol is TCP', () => {
      const schema = [enabled, hostname, proto.tcp, port, conCont, sendPrefix]
      cy.testNamedConfiguration(nmeaEndpoint, schema, 'nmeaGeneral')
    })
    it('Configuration with disabled forwarding and protocol is UDP', () => {
      enabled.value = 'false'
      conCont.value = 'false'
      const schema = [enabled, hostname, proto.udp, port, conCont, sendPrefix]
      cy.testNamedConfiguration(nmeaEndpoint, schema, 'nmeaGeneral')
    })
  })
  describe('NMEA forwarding cache configuration', () => {
    it('Configuration with save cache in RAM memory', () => {
      const schema = [type.ram, sentencesMax]
      cy.testNamedConfiguration(nmeaEndpoint, schema, 'nmeaGeneral')
    })
    it('Configuration with save cache in Flash memory', () => {
      const schema = [type.flash, sentencesMax, location]
      cy.testNamedConfiguration(nmeaEndpoint, schema, 'nmeaGeneral')
    })
  })
  describe('NMEA collecting configuration', () => {
    it('Configuration with enabled collecting', () => {
      const schema = [collectingEnabled, collectingLocation]
      cy.testNamedConfiguration(nmeaEndpoint, schema, 'nmeaGeneral')
    })
  })
  describe('NMEA sentence settings configuration', () => {
    it('Enable all configurations', () => {
      for (let i = 0; i < sectionNames.length; i++) {
        const schema = [forwardingEnabled, forwardingInterval, collectingEnabled2, collectingInterval]
        cy.testNamedConfiguration(rulesEndpoint, schema, sectionNames[i])
      }
    })
  })
})
