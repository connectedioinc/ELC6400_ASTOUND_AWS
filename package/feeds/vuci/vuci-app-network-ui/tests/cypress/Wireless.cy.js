const route = '/status/wireless/interfaces'
const route2 = '/network/wireless/ssids'

const deviceEndpoint = '/wireless/devices/status'

let devices = []

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${deviceEndpoint}`,
      failOnStatusCode: false,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      devices = body?.data?.map(dev => dev.id) || []
      if (devices.length > 0) cy.hitPage(route)
    })
  })
})

beforeEach(function () {
  if (!devices.length) this.skip()
})

after(() => {
  cy.logout()
})

const checkInterfaces = expectedCount => {
  cy.waitForContentLoad()
  cy.intercept('POST', '/api/bulk').as('postBulk')
  cy.wait('@postBulk').then(res => {
    expect(res.response.body.success).to.eq(true)
    devices.forEach((_, idx) => {
      expect(res.response.body.data[idx].data.length).to.eq(expectedCount)
    })
  })
}

const selectCards = deselect => {
  cy.get('[test-id="overview-card-default_radio0-"]').click()
  if (!deselect) cy.get('[test-id="wifi0"]').should('be.visible')
  if (devices.length > 1) {
    cy.get('[test-id="overview-card-default_radio1-"]').click()
    if (!deselect) {
      cy.get('[test-id="wifi0"]').should('be.visible')
      cy.get('[test-id="wifi1"]').should('be.visible')
    }
  }
}

describe('Wireless status', () => {
  it('Check card interactivity', () => {
    selectCards()
    selectCards(true)
    cy.get('[test-id="wifi0"]').should('not.exist')
    selectCards()
    cy.clickButton('clearAll')
    cy.get('[test-id="wifi0"]').should('not.exist')
    cy.get('[test-id="wifi1"]').should('not.exist')
    selectCards()
    cy.get('[test-id="wifi0"]').click()
    if (devices.length > 1) cy.get('[test-id="wifi1"]').click()
    cy.get('[test-id="wifi1"]').should('not.exist')
  })
  it('Check wireless information', () => {
    checkInterfaces(1)
  })
  it('Check wireless status with added interfaces', () => {
    cy.hitPage(route2)
    cy.wrap(devices).each(dev => {
      cy.clickSectionAdd(dev)
      cy.clickEditClose()
    })
    cy.hitPage(route)
    checkInterfaces(2)
    cy.hitPage(route2)
    cy.wrap(devices).each(dev => {
      cy.get(`[test-id="tablerow-${dev}"]`).within(() => {
        cy.deleteLastCreated()
      })
    })
  })
})
