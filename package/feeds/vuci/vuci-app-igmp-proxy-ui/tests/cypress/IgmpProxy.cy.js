const route = '/network/igmp_proxy'
const endpoint = '/igmp_proxy/global'
const endpoint2 = '/igmp_proxy/routes/config'
let hasIgmpProxyControl = []

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
      hasIgmpProxyControl = body.data.includes('/usr/lib/opkg/info/igmpproxy.control')
    })
  })
  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasIgmpProxyControl) this.skip()
})

after(() => {
  cy.logout()
})

// general IGMP proxy settings configuration
const enabled = { type: 'switch', inputName: 'enabled', value: '1' }
const quickleave = { type: 'switch', inputName: 'enabled', value: '1' }

// routing interfaces configuration (upsteam lan)
const directionUp = { type: 'select', inputName: 'direction', options: 'upstream', value: 'Upstream' }
const interfaceUp = { type: 'select', inputName: 'network', options: 'lan', value: 'lan' }
const firewallZoneUp = { type: 'select', inputName: 'zone', options: 'lan', value: 'lan' }
const networksUp = { type: 'list', inputName: 'altnet', value: ['0.0.0.0/24'] }

// routing interfaces configuration (downstream wan)
const directionDown = { type: 'select', inputName: 'direction', options: 'downstream', value: 'Downstream' }
const interfaceDown = { type: 'select', inputName: 'network', options: 'wan', value: 'wan' }
const firewallZoneDown = { type: 'select', inputName: 'zone', options: 'wan', value: 'wan' }
const networksDown = { type: 'list', inputName: 'altnet', value: ['0.0.0.0/24'] }

describe('General IGMP proxy settings', () => {
  it('Enables everything', () => {
    const schema = [enabled, quickleave]
    cy.testNamedConfiguration(endpoint, schema, 'igmpproxy_general')
  })
  it('Disables everything', () => {
    enabled.value = '0'
    quickleave.value = '0'
    const schema = [enabled, quickleave]
    cy.testNamedConfiguration(endpoint, schema, 'igmpproxy_general')
  })
  describe('Routing interfaces configuration', () => {
    it('Creates new interface upstream lan configuration', () => {
      const schema = [directionUp, interfaceUp, firewallZoneUp, networksUp]
      cy.testConfigurationEdit(endpoint2, schema, 'igmpproxy')
    })
    it('Creates new interface downstream wan configuration', () => {
      const schema = [directionDown, interfaceDown, firewallZoneDown, networksDown]
      cy.testConfigurationEdit(endpoint2, schema, 'igmpproxy')
    })
  })
})
