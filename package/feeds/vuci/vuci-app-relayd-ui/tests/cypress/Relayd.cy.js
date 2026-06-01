const route = '/network/wireless/relayd'
const endpoint = '/relayd/config'
const wirelessDeviceEndpoint = `${Cypress.config('baseUrl')}/api/wireless/interfaces/config`
let interfaceOptions = []
let wirelessExist = false
let wifiIfaceName = ''
let wifiOptionValue = ''

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/interfaces/config`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      interfaceOptions = body.data.filter(s => s.proto !== 'wwan' && s.proto !== 'connm' && s.proto !== 'none')?.map(s => s.id)
    })
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/packages/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      wirelessExist = body.data.some(pkg => pkg === '/usr/lib/opkg/info/vuci-app-wireless-api.control')
      // Add Wireless Client Interface for Wireless Interface select option
      if (wirelessExist) {
        cy.request({
          method: 'POST',
          url: wirelessDeviceEndpoint,
          headers: {
            Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
            'Content-type': 'application/json'
          },
          body: {
            data: {
              ssid: 'TESTER',
              mode: 'sta',
              network: 'TEST'
            }
          }
        }).then(({ body }) => {
          ;({ id: wifiIfaceName, network: wifiOptionValue } = body.data)
        })
      }
    })
  })
  cy.hitPage(route)
})

after(() => {
  if (wirelessExist) {
    cy.request({
      method: 'DELETE',
      url: wirelessDeviceEndpoint,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: [wifiIfaceName]
      }
    })
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${endpoint}/general`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          enabled: '0',
          lan_mark: '',
          network: ''
        }
      }
    })
    getZones().then(({ body }) => {
      // eslint-disable-next-line no-unused-expressions
      expect(body.data.some(zone => zone.name === 'relayd')).to.be.false
    })
  }
  cy.then(() => {
    cy.logout()
  })
})

const getZones = () =>
  cy.request({
    method: 'GET',
    url: `${Cypress.config('baseUrl')}/api/firewall/zones/config`,
    headers: {
      Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
      'Content-type': 'application/json'
    }
  })

describe('Relayd configuration', () => {
  it('Configuration', function () {
    if (!wirelessExist) this.skip()
    const selectOption = interfaceOptions[interfaceOptions.length - 1]
    const schema = [
      { type: 'switch', inputName: 'enabled', value: 'true' },
      { type: 'select', inputName: 'lan_mark', options: selectOption, value: selectOption },
      { type: 'select', inputName: 'network', options: wifiOptionValue, value: wifiOptionValue }
    ]
    cy.testNamedConfiguration(endpoint, schema, 'relayd')
    getZones().then(({ body }) => {
      // eslint-disable-next-line no-unused-expressions
      expect(body.data.some(zone => zone.name === 'relayd')).to.be.true
    })
  })
})
