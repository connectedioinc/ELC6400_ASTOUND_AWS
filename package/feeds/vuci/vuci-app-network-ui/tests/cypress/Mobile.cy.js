const route = '/status/network/mobile'
let hasMobile = false
let modemList = []

const rebootError = {
  2: 'Failed to restart connection, modem not found',
  4: 'Failed to restart connection, modem not ready',
  default: 'An unexpected error occurred'
}

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
          modemList = body.data
          cy.intercept('GET', `/api/modems/status/${body.data[0].id}`).as('getRequest')
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

describe('Mobile information', () => {
  it('Checks modem IMSI and SIM card state', () => {
    cy.wait('@getRequest').then(({ response }) => {
      cy.get('header > div > span').eq(0).contains('SIM card')
      cy.get('header > div > span').eq(1).contains('Connection')
      cy.get('header > div > span').eq(2).contains('Data transmission')
      cy.get('header > div > span').eq(3).contains('Cell info')
      cy.get('#section-bands .title-info > div').contains('Bands')
      if (modemList[0].sim_count > 1) {
        cy.get('div > ul > li .info_hint').eq(0).contains(`SIM ${response.body.data.active_sim}`)
        cy.get('div > ul > li .info_hint').eq(1).contains(response.body.data.simstate)
        cy.get('div > ul > li .info_hint').eq(3).contains(response.body.data.imsi)
      } else {
        cy.get('div > ul > li .info_hint').eq(0).contains(response.body.data.simstate)
        cy.get('div > ul > li .info_hint').eq(2).contains(response.body.data.imsi)
      }
    })
  })
  it('Clicks Restart connection and checks returned message', () => {
    cy.intercept('POST', '/api/modems/actions/restart_connection').as('restartConnection')
    cy.clickButton('reboot')
    cy.wait('@restartConnection').then(({ response }) => {
      if (response.body.success) cy.checkMessage(' Connection restarted successfully ')
      else cy.checkMessage(` ${rebootError[response.body.errors[0].code] || rebootError.default} `)
    })
  })
  it('Switch to second modem tab and checks modem IMSI', function () {
    if (modemList.length === 1) this.skip()
    cy.intercept('GET', `/api/modems/status/${modemList[1].id}`).as('getRequest2')
    cy.get('.tab-navigation > :nth-child(2)').click()
    cy.wait('@getRequest2').then(({ response }) => {
      cy.document().its('body').find('.spin-content').should('not.exist')
      cy.get('header > div > span').eq(0).contains('SIM card')
      cy.get('header > div > span').eq(1).contains('Connection')
      cy.get('header > div > span').eq(2).contains('Data transmission')
      cy.get('header > div > span').eq(3).contains('Cell info')
      cy.get('#section-bands .title-info > div').contains('Bands')
      if (modemList[1].sim_count > 1) {
        cy.get('div > ul > li .info_hint').eq(3).contains(response.body.data.imsi)
      } else {
        cy.get('div > ul > li .info_hint').eq(2).contains(response.body.data.imsi)
      }
    })
  })
  it('Clicks Restart connection and checks returned message on second modem', function () {
    if (modemList.length === 1) this.skip()
    cy.intercept('POST', '/api/modems/actions/restart_connection').as('restartConnection')
    cy.clickButton('reboot')
    cy.wait('@restartConnection').then(({ response }) => {
      if (response.body.success) cy.checkMessage(' Connection restarted successfully ')
      else cy.checkMessage(` ${rebootError[response.body.errors[0].code] || rebootError.default} `)
    })
  })
})
