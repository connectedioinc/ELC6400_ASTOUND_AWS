const route = '/services/vpn/dmvpn'
const routeIpsec = '/services/vpn/dmvpn'
const endpoint = '/dmvpn/config'

let isRutx = false
let greOptions = []
const tunnelOptions = []

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
      isRutx = body.data.mnfinfo.name.includes('RUTX')
    })
  })

  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/gre/config`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      greOptions = body.data.map(iface => [`${iface.id}_static`, `${iface.id.toUpperCase()}_static` + `(@${iface.id})`])
    })
  })
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
      tunnelOptions.push(...greOptions)
    })
  })
  cy.hitPage(route)
})

beforeEach(function () {
  if (!isRutx) this.skip()
})

after(() => {
  cy.logout()
})

const DMVPNInstanceName = 'test' + Math.floor(Math.random() * 100) + 1

// dmvpn parameters configuration
const enabled = {
  true: { type: 'switch', inputName: 'enabled', value: 'true' },
  false: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const workingMode = {
  hub: { type: 'select', inputName: 'config_mode', options: 'hub', value: 'Hub' },
  spoke: { type: 'select', inputName: 'config_mode', options: 'spoke', value: 'Spoke' }
}
const hubAddress = { type: 'input', inputName: 'hub_address', value: '0.0.0.0' }

//  gre parameters configuration
const tunnelSource = { type: 'select', inputName: 'ipaddr_tunlink' }
const localGreInterfaceIpAddress = { type: 'input', inputName: 'gre_ipaddr', value: '192.168.1.1' }
const remoteGreInterfaceIpAddress = { type: 'input', inputName: 'gre_remote_ipaddr', value: '192.168.1.1' }
const localGreInterfaceNetmask = { type: 'input', inputName: 'netmask', value: '255.255.255.0' }

const greMtu = { type: 'input', inputName: 'mtu', value: '1476' }
const outboundKey = { type: 'input', inputName: 'okey', value: '65000' }
const inboundKey = { type: 'input', inputName: 'ikey', value: '65000' }

//  ip parameters configuration
const localIndentifier = { type: 'input', inputName: 'local_identifier', value: 'IP' }
const remoteIndentifier = { type: 'input', inputName: 'remote_identifier', value: '%any' }
const preSharedKey = { type: 'input', inputName: 'pre_shared_key', value: 'key123' }

//  ipsec proposal configuration
//  ph1
const encryptionAlgorithmPh1 = { type: 'select', inputName: 'encryption_algorithm', options: '3des', value: '3DES' }
const authentication = { type: 'select', inputName: 'hash_algorithm', options: 'md5', value: 'MD5' }
const dhGroup = { type: 'select', inputName: 'dh_group', options: 'modp768', value: 'MODP768' }
const forceCryptoProposal = { type: 'switch', inputName: 'force_crypto_proposal', value: 'true' }
const ikeLifetime = { type: 'input', inputName: 'ikelifetime', value: '3h' }

//  ipsec proposal configuration
//  ph2
const encryptionAlgorithmPh2 = { type: 'select', inputName: 'encryption_algorithm_2', options: '3des', value: '3DES' }
const hashAlgorithm = { type: 'select', inputName: 'hash_algorithm_2', options: 'md5', value: 'MD5' }
const forceCryptoProposalPh2 = { type: 'switch', inputName: 'force_crypto_proposal_2', value: 'true' }
const lifetime = { type: 'input', inputName: 'lifetime', value: '3h' }

//  nhrp parameters configuration
const nhrpNetworkId = { type: 'input', inputName: 'network_id', value: '1' }
const nhrpAuthenticationKey = { type: 'input', inputName: 'auth', value: '12345678' }
const nhrpHoldTime = { type: 'input', inputName: 'holdtime', value: '7200' }
const redirect = { type: 'switch', inputName: 'redirect', value: 'true' }
const nflogGroup = { type: 'input', inputName: 'nflog_group', value: '65535' }

describe('DMVPN configuration end to end tests', () => {
  it('Enables DMVPN parameters configuration with "Phase 1", "Working mode" = "Spoke" and first "Tunnel source" option', () => {
    const schema = [
      enabled.true,
      workingMode.spoke,
      hubAddress,
      localGreInterfaceIpAddress,
      remoteGreInterfaceIpAddress,
      greMtu,
      outboundKey,
      inboundKey,
      localIndentifier,
      remoteIndentifier,
      preSharedKey,
      encryptionAlgorithmPh1,
      authentication,
      dhGroup,
      forceCryptoProposal,
      ikeLifetime,
      nhrpNetworkId,
      nhrpAuthenticationKey,
      nhrpHoldTime,
      redirect
    ]
    if (tunnelOptions.length > 0) {
      tunnelSource.options = tunnelOptions[0][0]
      tunnelSource.value = tunnelOptions[0][1]
      schema.splice(3, 0, tunnelSource)
    }
    cy.get('input[id=id]').type(DMVPNInstanceName)
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
      cy.hitPage(routeIpsec)
      cy.get(`tr[test-id=tablerow-${DMVPNInstanceName}]`).should('be.visible')
      cy.hitPage(route)
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.checkValues(endpoint, schema, sectionName)
      })
      cy.clickEditClose()
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('Enables DMVPN parameters configuration with "Phase 1", "Working mode" = "Spoke" and 6th "Tunnel source" option if it exists', () => {
    cy.log(JSON.stringify(tunnelOptions))
    cy.log(JSON.stringify(greOptions))
    const schema = [
      enabled.true,
      workingMode.spoke,
      hubAddress,
      localGreInterfaceIpAddress,
      remoteGreInterfaceIpAddress,
      greMtu,
      outboundKey,
      inboundKey,
      localIndentifier,
      remoteIndentifier,
      preSharedKey,
      encryptionAlgorithmPh1,
      authentication,
      dhGroup,
      forceCryptoProposal,
      ikeLifetime,
      nhrpNetworkId,
      nhrpAuthenticationKey,
      nhrpHoldTime,
      redirect
    ]
    if (tunnelOptions.length >= 6) {
      tunnelSource.options = tunnelOptions[5][0]
      tunnelSource.value = tunnelOptions[5][1]
      schema.splice(3, 0, tunnelSource)
    }
    cy.get('input[id=id]').type(DMVPNInstanceName)
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
      cy.hitPage(routeIpsec)
      cy.get(`tr[test-id=tablerow-${DMVPNInstanceName}]`).should('be.visible')
      cy.hitPage(route)
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.checkValues(endpoint, schema, sectionName)
      })
      cy.clickEditClose()
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('Enables DMVPN parameters configuration with "Phase 2", "Working mode" = "Hub" and first "Tunnel source" option', () => {
    const schema = [
      enabled.true,
      workingMode.hub,
      localGreInterfaceIpAddress,
      localGreInterfaceNetmask,
      greMtu,
      outboundKey,
      inboundKey,
      localIndentifier,
      remoteIndentifier,
      preSharedKey,
      encryptionAlgorithmPh2,
      hashAlgorithm,
      forceCryptoProposalPh2,
      lifetime,
      nhrpNetworkId,
      nhrpAuthenticationKey,
      nhrpHoldTime,
      redirect,
      nflogGroup
    ]
    if (tunnelOptions.length > 0) {
      tunnelSource.options = tunnelOptions[0][0]
      tunnelSource.value = tunnelOptions[0][1]
      schema.splice(2, 0, tunnelSource)
    }
    cy.get('input[id=id]').type(DMVPNInstanceName)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.get('.inner-tab-item').click({ multiple: true })
      cy.get('.modal-content').scrollTo('top')
      cy.getModal().within(() => {
        cy.setValues(endpoint, schema, sectionName)
      })
      cy.clickEditSave()
      cy.openLastCreatedEdit()
      cy.get('.inner-tab-item').click({ multiple: true })
      cy.get('.modal-content').scrollTo('top')
      cy.getModal().within(() => {
        cy.checkValues(endpoint, schema, sectionName)
      })
      cy.clickEditClose()
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('Enables DMVPN parameters configuration with "Phase 2", "Working mode" = "Hub" and 6th "Tunnel source" option if it exists', () => {
    const schema = [
      enabled.true,
      workingMode.hub,
      localGreInterfaceIpAddress,
      localGreInterfaceNetmask,
      greMtu,
      outboundKey,
      inboundKey,
      localIndentifier,
      remoteIndentifier,
      preSharedKey,
      hashAlgorithm,
      forceCryptoProposalPh2,
      lifetime,
      nhrpNetworkId,
      nhrpAuthenticationKey,
      nhrpHoldTime,
      redirect,
      nflogGroup
    ]
    if (tunnelOptions.length >= 6) {
      tunnelSource.options = tunnelOptions[5][0]
      tunnelSource.value = tunnelOptions[5][1]
      schema.splice(2, 0, tunnelSource)
    }
    cy.get('input[id=id]').type(DMVPNInstanceName)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.get('.inner-tab-item').click({ multiple: true })
      cy.get('.modal-content').scrollTo('top')
      cy.getModal().within(() => {
        cy.setValues(endpoint, schema, sectionName)
      })
      cy.clickEditSave()
      cy.hitPage(routeIpsec)
      cy.get(`tr[test-id=tablerow-${DMVPNInstanceName}]`).should('be.visible')
      cy.hitPage(route)
      cy.openLastCreatedEdit()
      cy.get('.inner-tab-item').click({ multiple: true })
      cy.get('.modal-content').scrollTo('top')
      cy.getModal().within(() => {
        cy.checkValues(endpoint, schema, sectionName)
      })
      cy.clickEditClose()
      cy.clearSection(endpoint, sectionName)
    })
  })
})
