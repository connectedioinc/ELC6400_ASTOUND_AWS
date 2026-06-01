const route = '/system/maintenance/speedtest'
let hasInternet = false

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/speedtest/servers`,
      failOnStatusCode: false,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasInternet = body.success
    })
  })
  cy.visit(route)
})

beforeEach(function () {
  if (!hasInternet) this.skip()
})

after(() => {
  cy.logout()
})

function speedTest() {
  cy.clickButton('starttest')
  cy.waitForEditModalOpen().get('[test-id="button-ok"]').click()
  // Download
  speedTestResult(20000)
  // Upload
  speedTestResult(20000)
}

function speedTestResult(wait) {
  cy.get('[test-id="speed-label-wrapper"]', { timeout: 10000 }).within(() => {
    cy.wait(wait)
    cy.get('[test-id="speed-label"]')
      .invoke('text')
      .then(value => {
        const splitValue = value.split(' ')[2]
        expect(Number.isNaN(splitValue), `input (${splitValue}) should be a number`).to.eq(false)
      })
  })
}

describe('Speed test', () => {
  it('Start Speed test by pressing `Start Speed test`', () => {
    speedTest()
  })

  it('Cancel Speed test by pressing `Start Speed test` and `Cancel`', () => {
    cy.clickButton('starttest')
    cy.waitForEditModalOpen()
    cy.clickButton('cancel')
  })

  it('Change server to first in the list and Start Speed test', () => {
    let name = ''
    cy.clickButton('changeserver')
    cy.waitForEditModalOpen()
    cy.get('[class="table-row selectable"][test-id="tablerow-0"]').within(() => {
      cy.get('[test-id="tablecolumns-name"]')
        .invoke('text')
        .then(value => {
          cy.log('Name', value)
          name = value.split(' ').slice(2).join(' ')
        })
    })
    cy.get('[class="table-row selectable"][test-id="tablerow-0"]').click()
    cy.get('[class="content-wrapper"]').within(() => {
      cy.contains(name)
    })
    speedTest()
  })
})
