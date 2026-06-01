const route = '/system/admin/datetime/ntp'
const endpoint = '/date_time/ntp/client/config'
const serverListEndpoint = '/date_time/ntp/time_servers/config'
const serverEndpoint = '/date_time/ntp/server/config'
let modemInfo = []

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/modems/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      modemInfo = body.data
      const hasModem = modemInfo.length > 0
      syncDisabled.depend = hasModem
      syncEnabled.depend = hasModem
      failover.depend = hasModem
      tmzEnabled.depend = hasModem
    })
  })
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.logout()
})

const ntpClient = {
  enabled: { type: 'switch', inputName: 'enabled', value: 'true' },
  disabled: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const save = { type: 'switch', inputName: 'save', value: 'true' }
const force = { type: 'switch', inputName: 'force', value: 'true' }
const interval = { type: 'input', inputName: 'interval', value: '86400' }
const freq = { type: 'input', inputName: 'freq', value: '1' }
const count = { type: 'input', inputName: 'count', value: '0' }
const syncDisabled = { type: 'switch', inputName: 'sync_enabled', value: 'false', depend: modemInfo.length > 0 }
const syncEnabled = { type: 'switch', inputName: 'sync_enabled', value: 'true', depend: modemInfo.length > 0 }
const tmzEnabled = { type: 'switch', inputName: 'tmz_sync_enabled', value: 'true', depend: modemInfo.length > 0 }
const failover = { type: 'input', inputName: 'failover', value: '10', depend: modemInfo.length > 0 }
const hostname = { type: 'input', inputName: 'hostname', value: 'myhost.example.com' }
const ntpServer = {
  enabled: { type: 'switch', inputName: 'enabled', value: 'true' },
  disabled: { type: 'switch', inputName: 'enabled', value: 'false' }
}

describe('Configuration with NTP service', () => {
  describe('Time synchronization configuration', () => {
    it('Everything enabled except `Operator station synchronization`', () => {
      const schema = [ntpClient.enabled, save, force, interval, freq, count, syncDisabled]
      cy.testNamedConfiguration(endpoint, schema, 'ntpclient')
    })
    it('`NTP client` disabled and `Operator station synchronization` enabled', () => {
      const schema = [ntpClient.disabled, syncEnabled]
      cy.testNamedConfiguration(endpoint, schema, 'ntpclient')
    })
    it('`NTP client` enabled and `Operator station synchronization` enabled', () => {
      const schema = [ntpClient.enabled, syncEnabled, tmzEnabled, failover]
      cy.testNamedConfiguration(endpoint, schema, 'ntpclient')
    })
    it('Everything disabled except `NTP Client`', () => {
      save.value = 'false'
      force.value = 'false'
      freq.value = '0'
      tmzEnabled.value = 'false'
      const schema = [ntpClient.enabled, save, force, interval, freq, count, syncDisabled, tmzEnabled]
      cy.testNamedConfiguration(endpoint, schema, 'ntpclient')
    })
  })
  describe('Time servers configuration', () => {
    it('Time servers', () => {
      const schema = [hostname]
      cy.testTypedOverviewConfiguration(serverListEndpoint, schema)
    })
  })
  describe('NTP server configuration', () => {
    it('`NTP server` enabled', () => {
      const schema = [ntpServer.enabled]
      cy.testNamedConfiguration(serverEndpoint, schema, 'ntpserver')
    })
    it('`NTP server` disabled', () => {
      const schema = [ntpServer.disabled]
      cy.testNamedConfiguration(serverEndpoint, schema, 'ntpserver')
    })
  })
})
