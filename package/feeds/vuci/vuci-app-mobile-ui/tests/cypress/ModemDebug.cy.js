const route = '/system/maintenance/troubleshoot'
const endpoint = '/api/modems/actions/exec_at'
let hasMobile = false
let hasSeveralModems = false
let modemList = []

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
      hasMobile = body.data.includes('/usr/lib/opkg/info/mobifd.control')
      if (hasMobile) {
        cy.request({
          method: 'GET',
          url: `${Cypress.config('baseUrl')}/api/modems/status`,
          headers: {
            Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
            'Content-type': 'application/json'
          }
        }).then(({ body }) => {
          hasSeveralModems = body.data.length > 1
          modemList = body.data
          if (hasSeveralModems) {
            modem.options = modemList[1].id
            modem.value = modemList[1].name
            modem.depend = hasSeveralModems
          }
          cy.hitPage(route)
        })
      }
    })
  })
})
beforeEach(function () {
  if (!hasMobile) this.skip()
})
after(() => {
  cy.logout()
})

const modem = { type: 'select', inputName: 'modem', options: '3-1', value: 'Internal modem', depend: hasSeveralModems }
const at = { type: 'input', inputName: 'command', value: 'AT' }
const response = { type: 'textarea', inputName: 'response', value: 'OK' }

describe('Modem debug', () => {
  it('Checks error message when AT command field is empty', () => {
    cy.clickButton('send')
    cy.checkMessage(' Some fields are invalid ')
  })
  it('Send AT command and check if response is added to history', () => {
    cy.intercept('POST', endpoint).as('postAT')
    cy.fillValues(at)
    cy.clickButton('send')
    cy.wait('@postAT', { timeout: 200000 }).then(() => {
      cy.getValues(response)
      cy.checkMessage(' AT command sent successfully ')
      cy.get('[test-id="tablecolumns-command"]').contains(at.value)
      cy.get('[test-id="tablecolumns-response"]').contains('OK')
    })
  })
  it('Select second modem and send AT command', function () {
    if (modemList.length === 1) this.skip()
    cy.selectValue(modem.inputName, modem.options, modem.value, false)
    cy.intercept('POST', endpoint).as('postAT')
    cy.fillValues(at)
    cy.clickButton('send')
    cy.wait('@postAT', { timeout: 200000 }).then(() => {
      cy.getValues(response)
      cy.checkMessage(' AT command sent successfully ')
      cy.get('[test-id="tablecolumns-command"]').contains(at.value)
      cy.get('[test-id="tablecolumns-response"]').contains('OK')
    })
  })
})
