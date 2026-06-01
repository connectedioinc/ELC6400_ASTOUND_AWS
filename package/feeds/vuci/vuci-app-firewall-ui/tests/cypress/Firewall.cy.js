const routeIpv4 = '/status/network/firewall/ipv4'
const routeIpv6 = '/status/network/firewall/ipv6'

before(() => {
  cy.login()
})

after(() => {
  cy.logout()
})

describe.each([
  ['ipv4', routeIpv4],
  ['ipv6', routeIpv6]
])('Firewall status: %s', (ipv, route) => {
  before(() => {
    cy.hitPage(route)
  })
  describe('Non-mocked API data', () => {
    it('Opens modal', () => {
      cy.get('#section-filter-table .table-row')
        .first()
        .within(() => {
          cy.clickButton('info')
        })
      cy.clickCloseModal()
      cy.getModal().should('not.exist')
    })
    it('Reset counters', () => {
      cy.clickButton('resetCounters')
      cy.checkMessage('Counters reset successfully')
    })
  })
  describe('Mocked API data', () => {
    it('Navigates modal', () => {
      cy.intercept('GET', `/api/firewall/iptables/${ipv}/status`, { fixture: 'API/status/firewall.json' })
      cy.hitPage(route)
      cy.get('#section-nat-table .table-row')
        .first()
        .within(() => {
          cy.clickButton('info')
        })
      cy.getModal().within(() => {
        cy.get('#section-prerouting-chain .table-row').within(() => {
          cy.clickButton('target')
        })
        cy.get('#section-prerouting_rule-chain .table-row').within(() => {
          cy.clickButton('target')
        })
        cy.get('#section-prerouting_rule_1-references .table-row').within(() => {
          cy.clickButton('info')
        })
        cy.get('#section-prerouting_rule-chain .table-row')
      })
      cy.clickCloseModal()
      cy.clickCloseModal()
      cy.getModal().should('not.exist')
    })
  })
})
