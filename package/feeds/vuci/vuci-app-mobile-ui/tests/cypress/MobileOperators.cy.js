const route = '/network/mobile/operators/scan'
const endpoint = '/api/sim_cards/config'
const statusFullEndpoint = '/api/modems/status'
let hasMobile = false
let hasSeveralModems = false
let modemList = []
let sectionModem = ''

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
          sectionModem = modemList[0]
          modem.options = modemList[0].id
          modem.value = modemList[0].name
          modem.depend = hasSeveralModems
          cy.intercept('GET', `${statusFullEndpoint}`).as('getRequest')
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

const mode = {
  auto: { type: 'select', inputName: 'mode', options: 'auto', value: 'Auto' },
  manual: { type: 'select', inputName: 'mode', options: 'manual', value: 'Manual' },
  manualAuto: { type: 'select', inputName: 'mode', options: 'manual-auto', value: 'Manual-Auto' }
}
const opCode = {
  custom: { type: 'select', inputName: 'opCode', value: '1234', custom: true },
  custom2: { type: 'select', inputName: 'opCode', value: '12345', custom: true },
  na: { type: 'select', inputName: 'opCode', value: 'N/A' }
}

const operatorCodeUpdated = ' Operator code updated '

describe('Mobile network operators configuration', () => {
  it('Checks Active SIM and Current operator fields', () => {
    cy.waitForContentLoad()
    cy.wait('@getRequest', { timeout: 20000 }).then(() => {
      if (modemList[0].sim_count < 2) {
        cy.get('[test-id="text-sim"]').should('not.exist')
      } else {
        cy.get('[test-id="text-sim"]').contains('SIM1')
      }
      cy.get('[test-id="text-operator"]').should('be.visible')
    })
  })
  it('Selects connection mode Manual-Auto and enters custom operator code', () => {
    const schema = [modem, mode.manualAuto, opCode.custom]
    cy.waitForContentLoad()
    cy.testNamedConfiguration(endpoint, schema, '', operatorCodeUpdated)
  })
  it('Selects connection mode Manual and enters custom operator code', () => {
    const schema = [modem, mode.manual, opCode.custom2]
    cy.testNamedConfiguration(endpoint, schema, '', operatorCodeUpdated)
  })
  it('Selects connection mode Manual and start Scan for operators when enters first found operator code', function () {
    if (!sectionModem.operators_scan || sectionModem.simstate !== 'Inserted') this.skip()
    const schema = [mode.manual]
    cy.setValues(endpoint, schema, '')
    cy.clickButton('scan')
    cy.clickButton('ok')
    cy.get('.spin-overlay', { timeout: 200000 }).should('not.exist')
    cy.get('body').then($body => {
      if ($body.find(':nth-child(1) > [test-id="tablecolumns-numName"]').length > 0) {
        cy.get(':nth-child(1) > [test-id="tablecolumns-numName"]')
          .invoke('text')
          .then(value => {
            const splitValue = value.split(' ')[4]
            expect(Number.isInteger(+splitValue), `input (${splitValue}) should be an integer`).to.eq(true)
            const newSchema = [mode.manual, { type: 'select', inputName: 'opCode', value: +splitValue }]
            cy.setValues(endpoint, newSchema, '')
            cy.clickButton('saveandapply')
            cy.checkMessage(operatorCodeUpdated)
          })
      } else {
        cy.get('td').contains("Currently no operators available, click 'Scan for operators' button to start scan")
      }
    })
  })
  it('Selects connection mode Auto-Manual and start Scan for operators when add first found operator code to the list', function () {
    if (!sectionModem.operators_scan || sectionModem.simstate !== 'Inserted') this.skip()
    cy.get('body').then($body => {
      if ($body.find(':nth-child(1) > [test-id="tablecolumns-numName"]').length > 0) {
        cy.get('button[test-id="button-add"]').first().click()
        const newSchema = [{ type: 'select', inputName: 'list', value: 'test', custom: true }]
        cy.setValues(endpoint, newSchema, '')
        cy.intercept('POST', '/api/operator_lists/config').as('postRequest')
        cy.waitForEditModalOpen().find('button[test-id="button-add"]').click()
        cy.wait('@postRequest', { timeout: 20000 }).then(res => {
          const config = res.response.body.data.id
          cy.checkMessage(' Operator added successfully ')
          cy.request({
            method: 'DELETE',
            url: `${Cypress.config('baseUrl')}/api/operator_lists/config`,
            body: {
              data: [config]
            },
            headers: {
              Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
              'Content-type': 'application/json'
            }
          })
        })
      } else {
        cy.get('td').contains("Currently no operators available, click 'Scan for operators' button to start scan")
      }
    })
  })
  it('Selects connection mode Auto', () => {
    const schema = [mode.auto]
    cy.testNamedConfiguration(endpoint, schema, '', operatorCodeUpdated)
  })
})
