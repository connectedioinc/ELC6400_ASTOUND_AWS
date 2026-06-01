const route = '/io/scheduler'
const endpoint = '/io/scheduler/global'
const endpoint2 = '/io/scheduler/config'
let hasIO = false
let hasOutputIO = false

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/packages/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasIO = body.data.includes('iomand.control')
    })
  })

  cy.then(() => {
    if (hasIO) {
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/io/status`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        const ioFiltered = []
        for (const io of body.data) {
          if (io.block_pins && io.io_name) {
            io.name_with_pins = `${io.io_name} (${io.block_pins.join()})`
            io.name_with_params = `${io.io_name} (${io.block_pins.join()}) - %${io.io_param}`
            ioFiltered.push(io)
          }
        }
        const output = ioFiltered.filter(io => (io.type === 'gpio' && (io.direction === 'out' || io.bi_dir === '1')) || io.type === 'relay').map(io => [io.name, io.name_with_pins])
        if (output.length > 0) {
          hasOutputIO = true
          pin.options = output[0][0]
          pin.value = output[0][1]
        }
      })
    }
  })
  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasIO) this.skip()
})

after(() => {
  cy.logout()
})

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const pin = { type: 'select', inputName: 'pin', options: 'dout1', value: 'Output (4)' }
const period = {
  week: { type: 'select', inputName: 'period', options: 'week', value: 'Weekdays' },
  month: { type: 'select', inputName: 'period', options: 'month', value: 'Month Days' }
}

// Weekdays
const startDay = { type: 'select', inputName: 'start_day', options: '1', value: 'Monday' }
const startTime = { type: 'input', inputName: 'start_time', value: '12:00' }
const endDay = { type: 'select', inputName: 'end_day', options: '2', value: 'Tuesday' }
const endTime = { type: 'input', inputName: 'end_time', value: '12:00' }

// Month days
const startDay2 = { type: 'select', inputName: 'start_day', options: '1', value: '1' }
const startTime2 = { type: 'input', inputName: 'start_time', value: '12:00' }
const endDay2 = { type: 'select', inputName: 'end_day', options: '2', value: '2' }
const endTime2 = { type: 'input', inputName: 'end_time', value: '13:00' }
const forceLast = { type: 'switch', inputName: 'force_last', value: 'true' }

describe('I/O Scheduler configuration', () => {
  describe('I/O Scheduler general configuration', () => {
    it('Enables scheduler', () => {
      const schema = [enabled]
      cy.testNamedConfiguration(endpoint, schema, 'scheduler_general')
    })
    it('Disables scheduler', () => {
      enabled.value = 'false'
      const schema = [enabled]
      cy.testNamedConfiguration(endpoint, schema, 'scheduler_general')
    })
  })
  describe('I/O Scheduler edit configuration', function () {
    enabled.value = 'true'

    beforeEach(function () {
      if (!hasOutputIO) this.skip()
    })
    it('Creates new scheduler when period is week', () => {
      const schema = [enabled, pin, period.week, startDay, startTime, endDay, endTime]
      cy.testConfigurationEdit(endpoint2, schema)
    })
    it('Creates new scheduler when period is month', () => {
      const schema = [enabled, pin, period.month, startDay2, startTime2, endDay2, endTime2, forceLast]
      cy.testConfigurationEdit(endpoint2, schema)
    })
  })
})
