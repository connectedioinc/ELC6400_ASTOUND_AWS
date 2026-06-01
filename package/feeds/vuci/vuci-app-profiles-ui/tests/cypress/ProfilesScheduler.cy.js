const route = '/system/admin/profiles/scheduler'
const generalEndpoint = '/profiles/scheduler/global'
const instancesEndpoint = '/profiles/scheduler/config'
const profileName = 'test2'

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/api/profiles/config`,
      body: {
        data: { id: profileName, from_current_profile: '1' }
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  })
  cy.hitPage(route, generalEndpoint)
})

after(() => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.config('baseUrl')}/api/profiles/config`,
    body: {
      data: [profileName]
    },
    headers: {
      Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
      'Content-type': 'application/json'
    }
  })
  cy.logout()
})

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const period = {
  week: { type: 'select', inputName: 'period', options: 'week', value: 'Weekdays' },
  month: { type: 'select', inputName: 'period', options: 'month', value: 'Month days' }
}
const startTime = { type: 'input', inputName: 'start_time', value: '12:30' }
const endTime = { type: 'input', inputName: 'end_time', value: '13:00' }

// Week
const startDay = { type: 'select', inputName: 'start_day', options: '2', value: 'Tuesday' }
const endDay = { type: 'select', inputName: 'end_day', options: '3', value: 'Wednesday' }

// Month
const startDay2 = { type: 'select', inputName: 'start_day', options: '2', value: '2' }
const endDay2 = { type: 'select', inputName: 'end_day', options: '3', value: '3' }
const forceLast = { type: 'switch', inputName: 'force_last', value: 'true' }

describe('Profile scheduler configuration', () => {
  it('Enables scheduler', () => {
    const schema = [enabled]
    cy.testNamedConfiguration(generalEndpoint, schema, 'general')
  })
  it('Create scheduler instance when period is week', () => {
    const schema = [enabled, period.week, startDay, startTime, endDay, endTime]
    cy.testConfigurationEdit(instancesEndpoint, schema)
  })
  it('Create scheduler instance when period is month', () => {
    const schema = [enabled, period.month, startDay2, startTime, endDay2, endTime, forceLast]
    cy.testConfigurationEdit(instancesEndpoint, schema)
  })
  it('Disables scheduler', () => {
    enabled.value = 'false'
    const schema = [enabled]
    cy.testNamedConfiguration(generalEndpoint, schema, 'general')
  })
})
