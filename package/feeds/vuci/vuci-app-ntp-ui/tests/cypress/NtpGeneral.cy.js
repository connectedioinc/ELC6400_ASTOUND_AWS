const route = '/system/admin/datetime/general'
const endpoint = '/date_time/ntp/client/config'
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
      gpsSyncDisabled.depend = hasGPS
      gpsSyncEnabled.depend = hasGPS
      gpsInterval.depend = hasGPS
    })
  })
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.logout()
})

const gpsSyncDisabled = { type: 'switch', inputName: 'gps_sync', value: 'false', depend: hasGPS }
const gpsSyncEnabled = { type: 'switch', inputName: 'gps_sync', value: 'true', depend: hasGPS }
const gpsInterval = { type: 'select', inputName: 'gps_interval', options: '1800', value: 'Every 30 minutes', depend: hasGPS }
const zoneName = {
  utc: { type: 'select', inputName: 'zoneName', options: 'UTC', value: 'UTC' },
  abidjan: { type: 'select', inputName: 'zoneName', options: 'Africa/Abidjan', value: 'Africa/Abidjan' }
}

describe('Configuration with NTP General service', () => {
  it('Clicks `Sync with browser` button', () => {
    cy.clickButton('syncWithBrowser')
  })
  it('GPS sync disabled and zoneName `Africa/Abidjan`', () => {
    const schema = [zoneName.abidjan, gpsSyncDisabled]
    cy.testNamedConfiguration(endpoint, schema, 'ntpclient')
  })
  it('GPS sync enabled and zoneName `UTC`', () => {
    const schema = [zoneName.utc, gpsSyncEnabled, gpsInterval]
    cy.testNamedConfiguration(endpoint, schema, 'ntpclient')
  })
})
