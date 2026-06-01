const route = '/network/wan'

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
    })
  })
  cy.hitPage(route)
})
after(() => {
  cy.logout()
})
function editMobileDataLimit() {
  cy.get('.interface-card-wrapper').within(() => {
    cy.get('[test-id="rowCard-mob1s1a1"]').within(() => {
      cy.get('.action-buttons').within(() => {
        cy.clickButton('edit')
      })
    })
  })
}
function mobileDataLimit(schema) {
  cy.get('[test-id="tablerow-interfaces"]').within(() => {
    editMobileDataLimit()
    cy.waitForEditModalOpen()
  })
  cy.getModal().within(() => {
    cy.get('[test-id="tablerow-interfaces"]').within(() => {
      cy.setValues(null, schema, 'mobile-data-limit')
    })
  })
  cy.clickEditSave()
  editMobileDataLimit()
  cy.getModal().within(() => {
    cy.get('[test-id="tablerow-interfaces"]').within(() => {
      cy.checkValues(null, schema, 'mobile-data-limit')
    })
  })
  cy.clickEditClose()
}
const enable = {
  true: { type: 'switch', inputName: 'mob_limit_enabled', value: 'true' },
  false: { type: 'switch', inputName: 'mob_limit_enabled', value: 'false' }
}
const dataLimit = { type: 'input', inputName: 'data_limit', value: '500' }
const period = {
  day: { type: 'select', inputName: 'period', value: 'Day', options: 'day' },
  week: { type: 'select', inputName: 'period', value: 'Week', options: 'week' },
  month: { type: 'select', inputName: 'period', value: 'Month', options: 'month' }
}
const resetDay = { type: 'select', inputName: 'reset_day', value: '30', options: '30' }
const resetWeekday = { type: 'select', inputName: 'reset_weekday', value: 'Monday', options: '1' }
const enable_warning = {
  true: { type: 'switch', inputName: 'enable_warning', value: 'true' },
  false: { type: 'switch', inputName: 'enable_warning', value: 'false' }
}
const warningLimit = { type: 'input', inputName: 'warning_limit', value: '400' }
const warningNum = { type: 'input', inputName: 'warning_num', value: '+37000000000' }

describe('MobileDataLimit', () => {
  it.each([
    [`Enable data connection limit is ${enable.true.value}`, [enable.true]],
    [`Enable data connection limit is ${enable.true.value}, Data limit (MB) is ${dataLimit.value}`, [enable.true, dataLimit]],
    [`Enable data connection limit is ${enable.true.value}, Period is ${period.week.value}, Start day is ${resetWeekday.value}`, [enable.true, period.week, resetWeekday]],
    [`Enable data connection limit is ${enable.true.value}, Period is ${period.month.value}, Start day is ${resetDay.value}`, [enable.true, period.month, resetDay]],
    [
      `Enable data connection limit is ${enable.true.value}, Enable SMS warning ${enable_warning.true.value}, Data limit (MB) is ${warningLimit.value}, Phone number is ${warningNum.value}`,
      [enable.true, enable_warning.true, warningLimit, warningNum]
    ],
    [`Enable data connection limit is ${enable.false.value}`, [enable.false]]
  ])('check mobileDataLimit with this parameters: %s', (_, schema) => {
    mobileDataLimit(schema)
  })
  it('clear collected data', () => {
    cy.get('[test-id="tablerow-interfaces"]').within(() => {
      editMobileDataLimit()
      cy.waitForEditModalOpen()
    })
    cy.getModal().within(() => {
      cy.get('[test-id="tablerow-interfaces"]').within(() => {
        cy.clickButton('clearCollectedData')
      })
      cy.checkMessage('Mobile data limit cleared successfully')
    })
  })
})
