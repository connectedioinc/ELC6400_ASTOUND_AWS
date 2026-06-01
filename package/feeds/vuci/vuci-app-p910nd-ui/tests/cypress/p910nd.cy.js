const route = '/services/sd_usb_tools/p910nd'
const endpoint = '/p910nd/config'
let restoreData = {}
let hasUSB = false
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
    }).then(({ body }) => {
      hasUSB = body.data.board.hwinfo.usb
    })
  })
  if (hasUSB) {
    cy.then(() => {
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api${endpoint}`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        restoreData = body.data
      })
    })
  }
  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasUSB) this.skip()
})

after(() => {
  if (hasUSB) {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${endpoint}`,
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
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const disabled = { type: 'switch', inputName: 'enabled', value: 'false' }
const device = {
  '/dev/usb/lp0': { type: 'select', inputName: 'device', options: '/dev/usb/lp0', value: '/dev/usb/lp0' }
}
const port = {
  9100: { type: 'select', inputName: 'port', options: '9100', value: '9100' },
  9101: { type: 'select', inputName: 'port', options: '9101', value: '9101' }
}
const bidirectional = { type: 'switch', inputName: 'bidirectional', value: 'true' }

describe('Configuration with Printer Server', () => {
  it('Configuration with enabled server', () => {
    const schema = [enabled, device['/dev/usb/lp0'], port[9101], bidirectional]
    cy.testNamedConfiguration(endpoint, schema, 'p910nd')
  })
  it('Configuration with disabled server', () => {
    bidirectional.value = 'false'
    const schema = [disabled, device['/dev/usb/lp0'], port[9100], bidirectional]
    cy.testNamedConfiguration(endpoint, schema, 'p910nd')
  })
})
