const route = '/services/vpn/wireguard'
const endpoint = '/wireguard/config'

const WireguardInstanceName = 'test' + Math.floor(Math.random() * 100) + 1
const peersInstanceName = 'test' + Math.floor(Math.random() * 100) + 1

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

//  WIREGUARD INSTANCE SETTINGS / general settings
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const ipAddresses = { type: 'input', inputName: 'addresses_0', value: '0.0.0.0/0' }

//  WIREGUARD INSTANCE SETTINGS / advanced settings
const metric = { type: 'input', inputName: 'metric', value: '0' }
const mtu = { type: 'input', inputName: 'mtu', value: '68' }
const dnsServers = { type: 'input', inputName: 'dns_0', value: '192.168.1.1' }

//  PEER / general setup
const publicKey = { type: 'input', inputName: 'public_key', value: '12345678901234567890123456789012345678901234' }
const allowedIps = { type: 'input', inputName: 'allowed_ips_0', value: '192.168.1.0/24' }
const description = { type: 'input', inputName: 'description', value: 'test description' }
const routeAllowedIps = { type: 'switch', inputName: 'route_allowed_ips', value: 'true' }

//  PEER / advanced settings
const presharedKey = { type: 'input', inputName: 'preshared_key', value: 'azAZ' }
const endpointHost = { type: 'input', inputName: 'endpoint_host', value: '192.168.1.1' }
const endpointPort = { type: 'input', inputName: 'endpoint_port', value: '51820' }
const persistentKeepAlive = { type: 'input', inputName: 'persistent_keepalive', value: '51820' }
const routingTable = { type: 'input', inputName: 'table', value: 'routing table' }

describe('Wireguard configuration end to end tests', () => {
  describe('Instance basic configuration tests ("General setup" and "Advanced settings")', () => {
    it('"Creates instance with data and deletes it (without generated keys)"', () => {
      const schema = [
        {
          tab: 'General Setup',
          inputs: [enabled, ipAddresses]
        },
        {
          tab: 'Advanced Settings',
          inputs: [metric, mtu, dnsServers]
        }
      ]
      cy.get('input[id=id]').type(WireguardInstanceName)
      cy.testConfigurationEdit(endpoint, schema, 'wireguard')
    })
    it('Creates instance with data, disables instance in overview and checks for changes in modal', () => {
      const schema = [enabled]
      cy.get('input[id=id]').type(WireguardInstanceName)
      cy.intercept('POST', `/api${endpoint}`).as('postSection')
      cy.clickSectionAdd()
      cy.wait('@postSection').then(() => {
        cy.waitForEditModalOpen()
        cy.getModal().within(() => {
          cy.setValues(null, schema)
        })
        cy.clickEditSave()
        cy.get('div[test-id=switch-enabled]').click()
        cy.openLastCreatedEdit()
        cy.getModal().within(() => {
          enabled.value = 'false'
          cy.checkValues(null, schema)
        })
        cy.clickEditClose()
        cy.clickButton('delete')
        cy.clickButton('ok')
        cy.checkMessage('Configuration has been removed')
      })
    })
    it('"Creates instance, generates "Private key" and "Public key" and deletes it', () => {
      cy.get('input[id=id]').type(WireguardInstanceName)
      cy.intercept('POST', `/api${endpoint}`).as('postSection')
      let sectionName = ''
      cy.clickSectionAdd()
      cy.wait('@postSection').then(() => {
        cy.waitForEditModalOpen()
        cy.get('[test-id="input-public_key"], [test-id="input-private_key"]').then(keys => {
          const publicKey = keys[0]._value
          const privateKey = keys[1]._value
          cy.clickEditSave()
          cy.openLastCreatedEdit()
          cy.getModal().within(() => {
            cy.get('button:contains("Generate")').click()
            cy.get('[test-id="input-public_key"]').should('not.equal', publicKey)
            cy.get('[test-id="input-private_key"]').should('not.equal', privateKey)
          })
        })
        cy.clickEditClose()
        cy.clearSection(endpoint, sectionName)
      })
    })
  })
  describe('Configures instance\'s "Peers"', () => {
    it('Configures instances "Peers" instance, checks it and deletes created data', () => {
      const schema = [
        {
          tab: 'General Setup',
          inputs: [publicKey, endpointHost, allowedIps, description, routeAllowedIps]
        },
        {
          tab: 'Advanced Settings',
          inputs: [presharedKey, endpointPort, persistentKeepAlive, routingTable]
        }
      ]
      cy.get('input[id=id]').type(WireguardInstanceName)
      cy.intercept('POST', `/api${endpoint}`).as('postSection')
      let sectionName = ''
      let requestPeersName = ''
      cy.clickSectionAdd()
      cy.wait('@postSection').then(res => {
        sectionName = res.response.body.data.id
        cy.waitForEditModalOpen()
        cy.intercept('POST', `/api/wireguard/${sectionName}/peers/config`).as('postSection2')
        cy.getModal().within(() => {
          cy.get('input[id=id]').type(peersInstanceName)
          cy.clickSectionAdd()
          cy.wait('@postSection2').then(res => {
            requestPeersName = res.response.body.data.id
            cy.get(`[id="section-wireguard-peer-${requestPeersName}"]`).within(() => {
              cy.setValues(null, schema)
            })
          })
          cy.clickButton('saveandapply')
          cy.get('.modal-content').scrollTo('bottom')
          cy.clickEditSave('Configuration has been applied ')
        })
        cy.scrollTo('top')
        cy.clickButton('edit')
        cy.getModal().within(() => {
          cy.clickButton('edit')
          cy.checkValues(null, schema)
        })
        cy.clickEditClose()
        cy.clickEditClose()
        cy.clearSection(null, sectionName)
      })
    })
  })
})
