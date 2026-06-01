const route = '/status/system'
let hasMobile = false
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
          modemList = body.data
          if (hasMobile) cy.hitPage(route)
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

describe('System information', () => {
  describe('Modem section', () => {
    it('Check if internal modem section exists and its values', function () {
      if (modemList.length !== 1) this.skip()
      cy.document().its('body').find('.spin-content').should('not.exist')
      cy.get('#section-internal-modem > .header .title-info .info_hint').should('exist')
      cy.get('#section-internal-modem table > tbody > tr > td').eq(0).contains('Model')
      cy.get('#section-internal-modem table > tbody > tr > td').eq(1).should('not.have.text', '-')
      cy.get('#section-internal-modem table > tbody > tr > td').eq(2).contains('IMEI')
      cy.get('#section-internal-modem table > tbody > tr > td').eq(3).should('not.contain', '-')
      cy.get('#section-internal-modem table > tbody > tr > td').eq(4).contains('FW version')
      cy.get('#section-internal-modem table > tbody > tr > td').eq(5).should('not.have.text', '-')
      cy.get('#section-internal-modem table > tbody > tr > td').eq(6).contains('Temperature')
      cy.get('#section-internal-modem table > tbody > tr > td').eq(7).should('not.have.text', '-')
    })
    it('Check if primary modem section exists and its values', function () {
      if (modemList.length < 2) this.skip()
      cy.document().its('body').find('.spin-content').should('not.exist')
      cy.get('#section-primary-modem > .header .title-info .info_hint').should('exist')
      cy.get('#section-primary-modem table > tbody > tr > td').eq(0).contains('Model')
      cy.get('#section-primary-modem table > tbody > tr > td').eq(1).should('not.have.text', '-')
      cy.get('#section-primary-modem table > tbody > tr > td').eq(2).contains('IMEI')
      cy.get('#section-primary-modem table > tbody > tr > td').eq(3).should('not.contain', '-')
      cy.get('#section-primary-modem table > tbody > tr > td').eq(4).contains('FW version')
      cy.get('#section-primary-modem table > tbody > tr > td').eq(5).should('not.have.text', '-')
      cy.get('#section-primary-modem table > tbody > tr > td').eq(6).contains('Temperature')
      cy.get('#section-primary-modem table > tbody > tr > td').eq(7).should('not.have.text', '-')
    })
    it('Check if secondary modem section exists and its values', function () {
      if (modemList.length < 2) this.skip()
      cy.document().its('body').find('.spin-content').should('not.exist')
      cy.get('#section-secondary-modem > .header .title-info .info_hint').should('exist')
      cy.get('#section-secondary-modem table > tbody > tr > td').eq(0).contains('Model')
      cy.get('#section-secondary-modem table > tbody > tr > td').eq(1).should('not.have.text', '-')
      cy.get('#section-secondary-modem table > tbody > tr > td').eq(2).contains('IMEI')
      cy.get('#section-secondary-modem table > tbody > tr > td').eq(3).should('not.contain', '-')
      cy.get('#section-secondary-modem table > tbody > tr > td').eq(4).contains('FW version')
      cy.get('#section-secondary-modem table > tbody > tr > td').eq(5).should('not.have.text', '-')
      cy.get('#section-secondary-modem table > tbody > tr > td').eq(6).contains('Temperature')
      cy.get('#section-secondary-modem table > tbody > tr > td').eq(7).should('not.have.text', '-')
    })
  })
})
