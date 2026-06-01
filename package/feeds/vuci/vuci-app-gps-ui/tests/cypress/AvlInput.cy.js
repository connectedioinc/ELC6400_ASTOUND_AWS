const route = '/services/gps/input'
const endpoint = '/gps/avl/io_rules/config'
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const min = { type: 'input', inputName: 'min', value: '1' }
const max = { type: 'input', inputName: 'max', value: '2' }
const event = { type: 'select', inputName: 'event', options: 'in', value: 'Inside range' }
const priority = { type: 'select', inputName: 'priority', options: 'high', value: 'High' }
let ioInfo = []
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
        url: `${Cypress.config('baseUrl')}/api/status/config`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        ioInfo = body.data.filter(io => io.block_pins && io.io_name)
      })
    }
  })
  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasGPS) this.skip()
})

after(() => {
  cy.logout()
})

describe('GPS AVL input configuration', () => {
  it('base configuration with adc type', function () {
    const adc = ioInfo.find(pin => pin.type === 'adc')
    if (!adc) this.skip()
    const ioName = { type: 'select', inputName: 'io_name', options: adc.name, value: `${adc.io_name} (${adc.block_pins.join()})` }
    const schema = [enabled, ioName, min, max, event, priority]
    cy.testConfigurationEdit(endpoint, schema, 'inputs')
  })
  it('base configuration with gpio type', function () {
    const gpio = ioInfo.find(pin => pin.type === 'gpio' && pin.direction === 'in')
    if (!gpio) this.skip()
    const ioName = { type: 'select', inputName: 'io_name', options: gpio.name, value: `${gpio.io_name} (${gpio.block_pins.join()})` }
    const gpioEvent = { type: 'select', inputName: 'event', options: 'nc', value: 'Input low' }
    const schema = [enabled, ioName, gpioEvent, priority]
    cy.testConfigurationEdit(endpoint, schema, 'inputs')
  })
})
