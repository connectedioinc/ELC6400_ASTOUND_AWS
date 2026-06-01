const route = '/status/wireless/channel_analysis'
let hasWifi = false
let radioDevices = []

before(function () {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasWifi = body.data.board.hwinfo.wifi
    })
  })
  cy.then(() => {
    if (!hasWifi) this.skip()
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/wireless/devices/config`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      radioDevices = body.data.map(device => device.id)
    })
  })
  cy.then(() => {
    cy.hitPage(route)
  })
})

beforeEach(function () {
  if (!hasWifi) this.skip()
})

after(() => {
  cy.logout()
})

const checkScan = tab => {
  cy.changeInnerTab(tab)
  cy.intercept('POST', '/api/bulk').as('postBulk')
  cy.clickButton('scan')
  cy.wait('@postBulk').then(res => {
    const data = res?.response?.body?.data
    radioDevices.length > 1 ? expect(data?.length).to.eq(2) : expect(data?.length).to.eq(1)
  })
}

describe('Channel analysis page', () => {
  it('Checks tab information', () => {
    cy.get('.inner-tab-navigation').within(() => {
      cy.get('[test-id=inner-tab]').first().should('contain', '2.4 GHz')
      if (radioDevices.length > 1) cy.get('[test-id=inner-tab]').eq(1).should('contain', '5 GHz')
      cy.get('[test-id=inner-tab]').last().should('contain', 'Rating')
    })
  })
  it('Checks manual scan operation 2.4GHz', () => {
    checkScan('2.4 GHz')
  })
  it('Checks manual scan operation 5GHz', function () {
    if (radioDevices.length === 1) this.skip()
    checkScan('5 GHz')
  })
})
