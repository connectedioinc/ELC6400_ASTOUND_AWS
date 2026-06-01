const route = '/system/maintenance/auto_reboot/reboot_scheduler'
const endpoint = '/auto_reboot/scheduler/config'
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
    })
    cy.hitPage(route)
  })
})
after(() => {
  cy.logout()
})
const enabled = { type: 'switch', inputName: 'enable', value: 'true' }
const action = {
  device_reboot: { type: 'select', inputName: 'action', options: '1', value: 'Device reboot' },
  modem_reboot: { type: 'select', inputName: 'action', options: '2', value: 'Modem reboot' }
}
const period = {
  week: { type: 'select', inputName: 'period', options: 'week', value: 'Week days' },
  month: { type: 'select', inputName: 'period', options: 'month', value: 'Month days' }
}
const days = {
  type: 'multiselect',
  inputName: 'days',
  value: [
    { options: 'mon', value: 'Monday' },
    { options: 'tue', value: 'Tuesday' }
  ]
}
const time = { type: 'list', inputName: 'time', value: ['12:00', '11:00'] }
const month_day = { type: 'multiselect', inputName: 'month_day', value: [{ options: '1', value: '1' }] }
const months = { type: 'multiselect', inputName: 'months', value: [{ options: '1', value: 'January' }] }
const force_last = { type: 'switch', inputName: 'force_last', value: 'true' }

describe('Periodic reboot configuration', () => {
  describe('Configuration of action with type `Device reboot`', () => {
    it('Configuration of Internal type with type `Week days`', () => {
      const schema = [enabled, action.device_reboot, period.week, days, time]
      cy.testConfigurationEdit(endpoint, schema, 'periodic_reboot')
    })
    it('Configuration of Internal type with type `Month days`', () => {
      const schema = [enabled, action.device_reboot, period.month, time, month_day, months, force_last]
      cy.testConfigurationEdit(endpoint, schema, 'periodic_reboot')
    })
  })
  describe('Configuration of action with type `Modem reboot`', () => {
    it('Configuration of Internal type with type `Week days`', function () {
      if (modemInfo.length === 0) this.skip()
      const schema = [enabled, action.modem_reboot, period.week, days, time]
      cy.testConfigurationEdit(endpoint, schema, 'periodic_reboot')
    })
    it('Configuration of Internal type with type `Month days`', function () {
      if (modemInfo.length === 0) this.skip()
      const schema = [enabled, action.modem_reboot, period.month, time, month_day, months, force_last]
      cy.testConfigurationEdit(endpoint, schema, 'periodic_reboot')
    })
  })
})
