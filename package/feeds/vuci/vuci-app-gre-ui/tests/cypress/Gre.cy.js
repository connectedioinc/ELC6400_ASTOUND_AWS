const route = '/services/vpn/gre'
const endpoint = '/gre/config'

const tunnelOptions = []

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
      body.data.map(iface => {
        if (iface.ifname === 'lo') return
        if (iface.proto === 'pppoe' || iface.proto === 'static' || iface.proto === 'dhcp') {
          tunnelOptions.push([iface.id, iface.id.toUpperCase() + ' (' + iface.ifname + ')'])
        } else if (iface.proto === 'wwan' || iface.proto === 'connm') {
          tunnelOptions.push([iface.id + '_4', iface.id.toUpperCase()])
        }
      })
    })
  })
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.logout()
})

const greInstanceName = 'test' + Math.floor(Math.random() * 100) + 1

// tunnel source
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const tunnelSource = { type: 'select', inputName: 'ipaddr_tunlink', options: '', value: '' }
const remoteEndpointIpAddress = { type: 'input', inputName: 'peeraddr', value: '0.0.0.0' }
const mtu = { type: 'input', inputName: 'mtu', value: '1476' }
const outboundKey = { type: 'input', inputName: 'okey', value: '65000' }
const inboundKey = { type: 'input', inputName: 'ikey', value: '65000' }
const pathMtuDiscovery = {
  true: { type: 'switch', inputName: 'df', value: 'true' },
  false: { type: 'switch', inputName: 'df', value: 'false' }
}
const keepAlive = {
  true: { type: 'switch', inputName: 'keep_alive', value: 'true' },
  false: { type: 'switch', inputName: 'keep_alive', value: 'false' }
}

//  if "path MTU discovery" disabled
const tlt = { type: 'input', inputName: 'ttl', value: '255' }

//  if "Keep alive" enabled
const keepAliveInterval = { type: 'input', inputName: 'keep_alive_interval', value: '20' }
// if "Keep alive" enabled
const keepAliveRetries = { type: 'input', inputName: 'keep_alive_retries', value: '3' }

//  tuneel settings
const localGreInterfaceIpAddress = { type: 'input', inputName: 'tun_ipaddr', value: '172.16.0.1' }
const localGreInterfaceNetmask = { type: 'input', inputName: 'tun_netmask', value: '255.255.255.0' }

//	routing settings configuration
const remoteSubnetIpAddress = { type: 'input', inputName: 'target', value: '0.0.0.0' }
const remoteSubnetNetmask = { type: 'input', inputName: 'netmask', value: '255.255.255.0' }

describe('GRE configuration end to end tests', () => {
  describe('Instance basic configuration tests', () => {
    describe('"Path MTU Discovery" = "false"', () => {
      it('"Keep alive" = "false"', () => {
        const schema = [
          enabled,
          tunnelSource,
          remoteEndpointIpAddress,
          mtu,
          outboundKey,
          inboundKey,
          pathMtuDiscovery.false,
          tlt,
          keepAlive.true,
          keepAliveInterval,
          keepAliveRetries,
          localGreInterfaceIpAddress,
          localGreInterfaceNetmask
        ]
        if (tunnelOptions.length > 0) {
          tunnelSource.options = tunnelOptions[0][0]
          tunnelSource.value = tunnelOptions[0][1]
          schema.splice(1, 0, tunnelSource)
        }
        cy.get('input[id=id]').type(greInstanceName)
        cy.testConfigurationEdit(endpoint, schema, 'gre')
      })
      it('"Keep alive" = "true"', () => {
        const schema = [
          enabled,
          tunnelSource,
          remoteEndpointIpAddress,
          mtu,
          outboundKey,
          inboundKey,
          pathMtuDiscovery.false,
          tlt,
          keepAlive.true,
          keepAliveInterval,
          keepAliveRetries,
          localGreInterfaceIpAddress,
          localGreInterfaceNetmask
        ]
        if (tunnelOptions.length > 0) {
          tunnelSource.options = tunnelOptions[0][0]
          tunnelSource.value = tunnelOptions[0][1]
          schema.splice(1, 0, tunnelSource)
        }
        cy.get('input[id=id]').type(greInstanceName)
        cy.testConfigurationEdit(endpoint, schema, 'gre')
      })
    })
    describe('"Path MTU Discovery" = "true"', () => {
      it('"Keep alive" = "false"', () => {
        const schema = [
          enabled,
          tunnelSource,
          remoteEndpointIpAddress,
          mtu,
          outboundKey,
          inboundKey,
          pathMtuDiscovery.false,
          tlt,
          keepAlive.false,
          localGreInterfaceIpAddress,
          localGreInterfaceNetmask
        ]
        if (tunnelOptions.length > 0) {
          tunnelSource.options = tunnelOptions[0][0]
          tunnelSource.value = tunnelOptions[0][1]
          schema.splice(1, 0, tunnelSource)
        }
        cy.get('input[id=id]').type(greInstanceName)
        cy.testConfigurationEdit(endpoint, schema, 'gre')
      })
      it('"Keep alive" = "true"', () => {
        const schema = [
          enabled,
          tunnelSource,
          remoteEndpointIpAddress,
          mtu,
          outboundKey,
          inboundKey,
          pathMtuDiscovery.false,
          tlt,
          keepAlive.true,
          keepAliveInterval,
          keepAliveRetries,
          localGreInterfaceIpAddress,
          localGreInterfaceNetmask
        ]
        if (tunnelOptions.length > 0) {
          tunnelSource.options = tunnelOptions[0][0]
          tunnelSource.value = tunnelOptions[0][1]
          schema.splice(1, 0, tunnelSource)
        }
        cy.get('input[id=id]').type(greInstanceName)
        cy.testConfigurationEdit(endpoint, schema, 'gre')
      })
    })
    it('Configures instance with enable = true, disables instance in overview and checks for changes in modal', () => {
      const schema = [
        enabled,
        remoteEndpointIpAddress,
        mtu,
        outboundKey,
        inboundKey,
        pathMtuDiscovery.false,
        keepAlive.true,
        keepAliveInterval,
        keepAliveRetries,
        localGreInterfaceIpAddress,
        localGreInterfaceNetmask
      ]
      if (tunnelOptions.length > 0) {
        tunnelSource.options = tunnelOptions[0][0]
        tunnelSource.value = tunnelOptions[0][1]
        schema.splice(1, 0, tunnelSource)
      }
      cy.get('input[id=id]').type(greInstanceName)
      cy.intercept('POST', `/api${endpoint}`).as('postSection')
      let sectionName = ''
      cy.clickSectionAdd()
      cy.wait('@postSection').then(res => {
        sectionName = res.response.body.data.id
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
        cy.get(`[test-id="tablerow-${sectionName}"]`).within(() => {
          cy.get('.info_hint').click()
        })
        cy.clickButton('ok')
        cy.checkMessage('Configuration has been removed')
      })
    })
  })
  describe('Instance\'s "routing settings" configuration tests', () => {
    it('Configures instances "routing settings", checks it and deletes created data', () => {
      const schema = [remoteSubnetIpAddress, remoteSubnetNetmask]
      cy.get('input[id=id]').type(greInstanceName)
      cy.intercept('POST', `/api${endpoint}`).as('postSection')
      let sectionName = ''
      cy.clickSectionAdd()
      cy.wait('@postSection').then(res => {
        sectionName = res.response.body.data.id
        cy.intercept('POST', `/api/gre/${sectionName}/routes/config`).as('postSectionRoutes')
        cy.waitForEditModalOpen()
        cy.getModal().within(() => {
          cy.clickSectionAdd()
          cy.setValues(null, schema)
        })
        cy.wait('@postSectionRoutes').then(() => {
          cy.clickEditSave()
          cy.openLastCreatedEdit()
          cy.get('.modal-content').scrollTo('bottom')
          cy.checkValues(null, schema)
          cy.getModal().within(() => {
            cy.clickButton('delete')
          })
          cy.get('[test-id="button-ok"]').click()
          cy.clickEditClose()
          cy.checkMessage('Configuration has been removed')
          cy.get(`[test-id="tablerow-${sectionName}"]`).within(() => {
            cy.get('.info_hint').click()
          })
          cy.clickButton('ok')
          cy.checkMessage('Configuration has been removed')
        })
      })
    })
  })
})
