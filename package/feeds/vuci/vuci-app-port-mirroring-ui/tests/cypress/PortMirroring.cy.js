const route = '/network/ports/port_mirroring'
const endpoint = '/port_mirroring/config'
let hasPortMirroring = false

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
      hasPortMirroring = body.data.includes('/usr/lib/opkg/info/vuci-app-port-mirroring-ui.control')
    })
  })
  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasPortMirroring) this.skip()
})

after(() => {
  if (hasPortMirroring) {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${endpoint}/general`,
      body: {
        data: {
          '.type': 'switch',
          mirror_monitor_port: 'disabled'
        }
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  }
  cy.logout()
})

const mirror_monitor_port_disabled = { type: 'select', inputName: 'mirror_monitor_port', options: 'disabled', value: 'Disabled' }
const mirror_monitor_port = { type: 'select', inputName: 'mirror_monitor_port', options: '1', value: 'LAN1' }
const mirror_source_port = { type: 'select', inputName: 'mirror_source_port', options: '2', value: 'LAN2' }
const enable_mirror_rx = { type: 'switch', inputName: 'enable_mirror_rx', value: 'true' }
const enable_mirror_tx = { type: 'switch', inputName: 'enable_mirror_tx', value: 'true' }

describe('Port mirroring configuration', () => {
  it('Configuration with disabled monitoring port', () => {
    const schema = [mirror_monitor_port_disabled]
    cy.testNamedConfiguration(endpoint, schema, 'switch')
  })
  it('Configuration with selected monitoring port', () => {
    const schema = [mirror_monitor_port, mirror_source_port, enable_mirror_rx, enable_mirror_tx]
    cy.testNamedConfiguration(endpoint, schema, 'switch')
  })
})
