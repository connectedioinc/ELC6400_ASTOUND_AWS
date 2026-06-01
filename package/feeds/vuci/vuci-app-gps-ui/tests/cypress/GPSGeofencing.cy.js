const route = '/services/gps/geofencing'
const endpoint = '/gps/geofencing/config'
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
  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasGPS) this.skip()
})

after(() => {
  cy.logout()
})

const instanceName = 'test' + Math.floor(Math.random() * 100) + 1
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const longitude = { type: 'input', inputName: 'longitude', value: '1.000000' }
const latitude = { type: 'input', inputName: 'latitude', value: '1.000000' }
const radius = { type: 'input', inputName: 'radius', value: '100' }
const generateEvent = {
  exit: { type: 'select', inputName: 'generate_event', options: 'on_exit', value: 'Exit' },
  enter: { type: 'select', inputName: 'generate_event', options: 'on_enter', value: 'Enter' }
}
const switchProfile = {
  none: { type: 'select', inputName: 'switch_profile', options: '', value: 'None' },
  default: { type: 'select', inputName: 'switch_profile', options: 'default', value: 'default' }
}

describe('Geofencing configuration', () => {
  it('Create configuration when event is exit and profile none', () => {
    const schema = [enabled, longitude, latitude, radius, generateEvent.exit, switchProfile.none]
    cy.get('input[id=id]').type(instanceName)
    cy.testConfigurationEdit(endpoint, schema, 'geofences')
  })
  it('Create configuration when event is enter and profile default', () => {
    const schema = [enabled, longitude, latitude, radius, generateEvent.enter, switchProfile.default]
    cy.get('input[id=id]').type(instanceName)
    cy.testConfigurationEdit(endpoint, schema, 'geofences')
  })
})
