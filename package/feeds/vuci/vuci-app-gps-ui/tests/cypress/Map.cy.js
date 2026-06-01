const route = '/services/gps/map'
const endpoint = '/gps/position'
const configEndpoint = '/gps/config'
const gpsTimeout = 10
let skipTests = false
let restoreData = {}
let hasGPS = false

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
      hasGPS = body.data.board.hwinfo.gps
      if (hasGPS) {
        cy.then(() => {
          cy.request({
            method: 'GET',
            url: `${Cypress.config('baseUrl')}/api${configEndpoint}`,
            headers: {
              Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
              'Content-type': 'application/json'
            }
          }).then(({ body }) => {
            restoreData = body.data
            if (body.data[0].enabled === '0') {
              cy.request({
                method: 'PUT',
                url: `${Cypress.config('baseUrl')}/api/gps/config/gpsd`,
                headers: {
                  Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
                  'Content-type': 'application/json'
                },
                body: {
                  data: {
                    enabled: '1',
                    glonass_sup: '1',
                    beidou_sup: '1',
                    galileo_sup: '1'
                  }
                }
              }).then(() => {
                // eslint-disable-next-line cypress/no-unnecessary-waiting
                cy.wait(5000)
              })
            }
            // eslint-disable-next-line cypress/no-unnecessary-waiting
            cy.wait(2000)
            let fixStatus = '0'
            for (let i = 0; i <= gpsTimeout; i++) {
              cy.request({
                method: 'GET',
                url: `${Cypress.config('baseUrl')}/api${endpoint}`,
                headers: {
                  Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
                  'Content-type': 'application/json'
                }
              }).then(({ body: coordinates }) => {
                fixStatus = coordinates.fix_status
              })
              if (i === gpsTimeout) skipTests = true
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              if (!fixStatus || ['N/A', '0'].includes(fixStatus)) cy.wait(2000)
              else i = gpsTimeout + 1
            }
          })
        })
      }
    })
  })
  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasGPS) this.skip()
})

after(() => {
  if (hasGPS) {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${configEndpoint}`,
      body: {
        data: restoreData
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  }
  cy.logout()
})

describe('Geofencing configuration', () => {
  it('Checks fix time, latitude, longitude, satellites and accuracy', function () {
    if (skipTests) this.skip()
    cy.get('[class=""][test-id="tablecolumns-fixTime"]')
      .invoke('text')
      .then(value => {
        const splitValue = value.split(' ')[4]
        expect(Number.isInteger(+splitValue), `input (${splitValue}) should be an integer`).to.eq(true)
      })
    cy.get('[test-id="tablecolumns-latitude"]')
      .invoke('text')
      .then(value => {
        const splitValue = value.split(' ')[3]
        expect(Number.isNaN(+splitValue), `input (${splitValue}) should be a number`).to.eq(false)
      })
    cy.get('[test-id="tablecolumns-longitude"]')
      .invoke('text')
      .then(value => {
        const splitValue = value.split(' ')[3]
        expect(Number.isNaN(+splitValue), `input (${splitValue}) should be a number`).to.eq(false)
      })
    cy.get('[test-id="tablecolumns-satellites"]')
      .invoke('text')
      .then(value => {
        const splitValue = value.split(' ')[3]
        expect(Number.isInteger(+splitValue), `input (${splitValue}) should be an integer`).to.eq(true)
      })
    cy.get('[test-id="tablecolumns-accuracy"]')
      .invoke('text')
      .then(value => {
        const splitValue = value.split(' ')[3]
        expect(Number.isNaN(+splitValue), `input (${splitValue}) should be a number`).to.eq(false)
      })
  })
})
