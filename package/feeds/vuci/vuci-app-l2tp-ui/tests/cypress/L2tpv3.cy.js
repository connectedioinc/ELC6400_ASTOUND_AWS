const route = '/services/vpn/l2tpv3'
const endpoint = '/l2tpv3/config'
let interfaces = []
let isLan = false

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
      interfaces = body.data.filter(iface => iface['.type'] === 'interface' && iface.bridge === '1').map(iface => [iface.id, iface.id.toUpperCase()])
      interfaces.unshift(['none', 'None'])
      isLan = interfaces.find(x => x[0] === 'lan')
    })
  })
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.logout()
})

const instanceName = 'test' + Math.floor(Math.random() * 100) + 1

//	L2TPV3 instance configuration
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const localAddress = { type: 'input', inputName: 'localaddr', value: '0.0.0.0' }
const tunnelId = { type: 'input', inputName: 'tunnel_id', value: '30' }
const sessionId = { type: 'input', inputName: 'session_id', value: '40' }
const cookie = { type: 'input', inputName: 'cookie', value: '89ABCDEF' }

//	peer settings
const peerAddress = { type: 'input', inputName: 'peeraddr', value: '0.0.0.0' }
const peerTunnelId = { type: 'input', inputName: 'peer_tunnel_id', value: '30' }
const peerSessionId = { type: 'input', inputName: 'peer_session_id', value: '40' }
const peerCookie = { type: 'input', inputName: 'peer_cookie', value: '89ABCDEF' }

//	instance settings
const bridgeTo = { type: 'select', inputName: 'bridge_to', options: '', value: '' }
const encapsulation = {
  ip: { type: 'select', inputName: 'encap', options: 'ip', value: 'IP' },
  udp: { type: 'select', inputName: 'encap', options: 'udp', value: 'UDP' }
}
const layer2SpecificHeaderType = {
  none: { type: 'select', inputName: 'l2spec_type', options: 'none', value: 'None' },
  linuxDefault: { type: 'select', inputName: 'l2spec_type', options: 'default', value: 'Linux default' }
}

//	mtu = udp settings
const udpSourcePort = { type: 'input', inputName: 'udp_sport', value: '80' }
const udpDestinationPort = { type: 'input', inputName: 'udp_dport', value: '80' }

//	bridge to = none
const ipv4Address = { type: 'input', inputName: 'ipaddr', value: '0.0.0.0' }
const ipv6Address = { type: 'input', inputName: 'ip6addr', value: '0000:0000:0000:0000:0000:0000:0000:0000/23' }
const netmask = { type: 'input', inputName: 'netmask', value: '255.255.255.0' }
const mtu = { type: 'input', inputName: 'mtu', value: '1500' }

describe('L2TPV3 configuration end to end tests', () => {
  it('Configures instance with "bridgeTo" = "none", "encapsulation" = "ip" and "l2spec_type" = "none"', () => {
    bridgeTo.options = interfaces[0][0]
    bridgeTo.value = interfaces[0][1]
    const schema = [
      enabled,
      localAddress,
      tunnelId,
      sessionId,
      cookie,
      peerAddress,
      peerTunnelId,
      peerSessionId,
      peerCookie,
      bridgeTo,
      ipv4Address,
      ipv6Address,
      netmask,
      mtu,
      encapsulation.ip,
      layer2SpecificHeaderType.none
    ]
    cy.get('input[id=id]').type(instanceName)
    cy.testConfigurationEdit(endpoint, schema, 'l2tpdv3')
  })
  it('Configures instance with "bridgeTo" = "lan" and "encapsulation" = "udp" and "l2spec_type" = "Linux default"', () => {
    if (!isLan) this.skip()
    bridgeTo.options = interfaces.find(x => x[0] === 'lan')[0]
    bridgeTo.value = interfaces.find(x => x[0] === 'lan')[1]
    enabled.value = 'true'
    const schema = [
      enabled,
      localAddress,
      tunnelId,
      sessionId,
      cookie,
      peerAddress,
      peerTunnelId,
      peerSessionId,
      peerCookie,
      bridgeTo,
      mtu,
      encapsulation.udp,
      udpSourcePort,
      udpDestinationPort,
      layer2SpecificHeaderType.linuxDefault
    ]
    cy.get('input[id=id]').type(instanceName)
    cy.testConfigurationEdit(endpoint, schema, 'l2tpdv3')
  })
  it('Configures instance with "bridgeTo" = "none" and "encapsulation" = "ip", disables instance in overview and checks for changes in modal', () => {
    bridgeTo.options = interfaces[0][0]
    bridgeTo.value = interfaces[0][1]
    const schema = [
      enabled,
      localAddress,
      tunnelId,
      sessionId,
      cookie,
      peerAddress,
      peerTunnelId,
      peerSessionId,
      peerCookie,
      bridgeTo,
      ipv4Address,
      ipv6Address,
      netmask,
      mtu,
      encapsulation.ip,
      layer2SpecificHeaderType.none
    ]
    cy.get('input[id=id]').type(instanceName)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.setValues(endpoint, schema, sectionName)
      })
      cy.clickEditSave()
      cy.get('div[test-id=switch-enabled]').click()
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        enabled.value = 'false'
        cy.checkValues(endpoint, schema, sectionName)
      })
      cy.clickEditClose()
      cy.clearSection(endpoint, sectionName)
    })
  })
})
