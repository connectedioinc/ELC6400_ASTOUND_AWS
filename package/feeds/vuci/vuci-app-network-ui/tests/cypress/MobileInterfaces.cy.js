import { fields } from './InterfaceFields'

const pageRoute = '/network/wan'
const interfacesEndpoint = '/interfaces/config'

let hasMobile = false
let modemInfo = []
let simCount = 0
let builtInModemsCount = 0
let isTRB = false

before(() => {
  cy.login()
  cy.hitPage(pageRoute)
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/packages/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasMobile = body.data.includes('/usr/lib/opkg/info/mobifd.control')
      if (hasMobile) {
        cy.then(() => {
          cy.request({
            method: 'GET',
            url: `${Cypress.config('baseUrl')}/api/modems/status`,
            headers: {
              Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
              'Content-type': 'application/json'
            }
          }).then(({ body }) => {
            modemInfo = body.data
            builtInModemsCount = modemInfo.filter(e => e.builtin === true).length
            simCount =
              modemInfo.length > 0
                ? Math.max.apply(
                    Math,
                    modemInfo.map(o => o.sim_count)
                  )
                : 0
            cy.then(() => {
              cy.request({
                method: 'GET',
                url: `${Cypress.config('baseUrl')}/api/system/device/status`,
                headers: {
                  Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
                  'Content-type': 'application/json'
                }
              }).then(({ body }) => {
                isTRB = body.data.mnfinfo.name.includes('TRB1')
              })
            })
          })
        })
      }
    })
  })
})

beforeEach(function () {
  if (!hasMobile) this.skip()
})

after(() => {
  cy.logout()
})

// Interfaces General section inputs
const proto = {
  mobile: { type: 'select', inputName: 'proto' }
}
const enabled = { type: 'switch', inputName: 'enabled', value: 'false' }
const username = { type: 'input', inputName: 'username', value: 'test20' }
const password = { type: 'input', inputName: 'password', value: 'testpsswd' }
const method = { type: 'select', inputName: 'method' } // [['nat', this.$t('NAT')],['bridge', this.$t('Bridge')],['passthrough', this.$t('Passthrough')]]
const p2p = { type: 'select', inputName: 'p2p', options: '1', value: 'P2P' } // [['0', 'Auto'],['1', 'P2P']]
const pdptype = { type: 'select', inputName: 'pdptype', options: 'ipv6', value: 'IPv6' } // [['ip', 'IPv4'],['ipv6', 'IPv6'],['ipv4v6', 'IPv4/IPv6']]
const modem = { type: 'select', inputName: 'modem' }
const sim = { type: 'select', inputName: 'sim', options: '1', value: 'SIM1' }
const sim2 = { type: 'select', inputName: 'sim', options: '2', value: 'SIM2' }
const autoApn = { type: 'switch', inputName: 'auto_apn', value: 'false' }
const forceApn = { type: 'select', inputName: 'force_apn', options: '', value: '-- Custom --' }
const apn = { type: 'input', inputName: 'apn', value: 'banga' }
const auth = { type: 'select', inputName: 'auth' } // [['none', this.$t('None')],['pap', 'PAP'],['chap', 'CHAP']]
const passthroughMode = { type: 'switch', inputName: 'passthrough_mode' }

const fillInterfaceName = name => {
  cy.setValues(interfacesEndpoint, [{ type: 'input', inputName: 'id', value: name }], '')
}
const testInterfaceConfiguration = (name, schema) => {
  const section = 'interfaces'
  const message = ' Configuration has been applied '
  cy.intercept('POST', `/api${interfacesEndpoint}`).as('postSection')
  let sectionName = ''
  cy.clickSectionAdd(section)
  cy.wait('@postSection').then(res => {
    sectionName = res.response.body.data.id || name
    cy.waitForEditModalOpen()
    cy.getModal().within(() => {
      cy.get(`[test-id="tablerow-${section}"]`).within(() => {
        cy.setValues(interfacesEndpoint, schema, sectionName)
      })
    })
    cy.checkIfReady(message)
    cy.intercept('GET', '/api/modems/status').as('get')
    // eslint-disable-next-line cypress/unsafe-to-chain-command
    cy.get('.modal-content')
      .scrollTo('bottom', { ensureScrollable: false })
      .within(() => {
        cy.clickButton('saveandapply')
      })
    // Checks if Auto APN prompt is shown
    cy.wait('@get').then(() => {
      cy.get('body').then($body => {
        if ($body.find('.modal-container.small').length > 0) {
          cy.get('.title').should('contain', 'Auto APN')
          cy.get('[test-id="button-ok"]').click()
        }
      })
    })
    // ----
    cy.checkMessage(message)
    cy.openLastCreatedEdit()
    cy.getModal().within(() => {
      cy.get(`[test-id="tablerow-${section}"]`).within(() => {
        cy.checkValues(interfacesEndpoint, schema, sectionName)
      })
    })
    cy.clickEditClose()
    cy.clearCardSection(interfacesEndpoint, sectionName)
  })
}

describe('Interfaces configuration', () => {
  it('Protocol: Mobile configuration + Mode NAT', () => {
    const mobileProto = isTRB ? 'connm' : 'wwan'
    const generalInputs = [
      { ...proto.mobile, options: mobileProto, value: 'Mobile' },
      { ...method, options: 'nat', value: 'NAT' },
      pdptype,
      autoApn,
      forceApn,
      apn,
      { ...auth, options: 'none', value: 'None' }
    ]
    if (builtInModemsCount > 1) {
      generalInputs.push({ ...modem, options: modemInfo[0].id, value: modemInfo[0].name })
    }
    if (simCount > 1) {
      generalInputs.push(sim)
    }
    if (!modemInfo[0].multi_apn) {
      generalInputs.unshift(enabled)
    }
    const schema = [
      {
        tab: 'General Settings',
        inputs: generalInputs
      },
      {
        tab: 'Advanced Settings',
        inputs: [fields.force_link, fields.metric, fields.dns, fields.mtu, fields.ip4table]
      },
      {
        tab: 'Firewall Settings',
        inputs: [fields.wanFwZone]
      }
    ]
    fillInterfaceName('testIface2')
    testInterfaceConfiguration('testIface2', schema)
  })

  it('Protocol: Mobile configuration + Mode NAT + Second modem', function () {
    if (builtInModemsCount < 2) this.skip()
    const mobileProto = isTRB ? 'connm' : 'wwan'
    const generalInputs = [
      { ...proto.mobile, options: mobileProto, value: 'Mobile' },
      { ...method, options: 'nat', value: 'NAT' },
      pdptype,
      autoApn,
      forceApn,
      apn,
      { ...auth, options: 'none', value: 'None' }
    ]
    if (builtInModemsCount > 1) {
      generalInputs.push({ ...modem, options: modemInfo[1].id, value: modemInfo[1].name })
    }
    if (simCount > 1) {
      generalInputs.push(sim)
    }
    if (!modemInfo[0].multi_apn) {
      generalInputs.unshift(enabled)
    }
    const schema = [
      {
        tab: 'General Settings',
        inputs: generalInputs
      },
      {
        tab: 'Advanced Settings',
        inputs: [fields.force_link, fields.metric, fields.dns, fields.mtu, fields.ip4table]
      },
      {
        tab: 'Firewall Settings',
        inputs: [fields.wanFwZone]
      }
    ]
    fillInterfaceName('testIface')
    testInterfaceConfiguration('testIface', schema)
  })

  it('Protocol: Mobile configuration + Mode NAT + Second SIM', function () {
    if (simCount < 2) this.skip()
    const mobileProto = isTRB ? 'connm' : 'wwan'
    const generalInputs = [
      { ...proto.mobile, options: mobileProto, value: 'Mobile' },
      { ...method, options: 'nat', value: 'NAT' },
      pdptype,
      autoApn,
      forceApn,
      apn,
      { ...auth, options: 'none', value: 'None' }
    ]
    if (builtInModemsCount > 1) {
      generalInputs.push({ ...modem, options: modemInfo[0].id, value: modemInfo[0].name })
    }
    if (simCount > 1) {
      generalInputs.push(sim2)
    }
    if (!modemInfo[0].multi_apn) {
      generalInputs.unshift(enabled)
    }
    const schema = [
      {
        tab: 'General Settings',
        inputs: generalInputs
      },
      {
        tab: 'Advanced Settings',
        inputs: [fields.force_link, fields.metric, fields.dns, fields.mtu, fields.ip4table]
      },
      {
        tab: 'Firewall Settings',
        inputs: [fields.wanFwZone]
      }
    ]
    fillInterfaceName('testIface')
    testInterfaceConfiguration('testIface', schema)
  })

  it('Protocol: Mobile configuration + Mode Bridge', () => {
    const mobileProto = isTRB ? 'connm' : 'wwan'
    const generalInputs = [
      { ...proto.mobile, options: mobileProto, value: 'Mobile' },
      { ...method, options: 'bridge', value: 'Bridge' },
      p2p,
      pdptype,
      autoApn,
      forceApn,
      apn,
      { ...auth, options: 'pap', value: 'PAP' },
      username,
      password,
      fields.mac
    ]
    if (builtInModemsCount > 1) {
      generalInputs.push({ ...modem, options: modemInfo[0].id, value: modemInfo[0].name })
    }
    if (simCount > 1) {
      generalInputs.push(sim)
    }
    if (!modemInfo[0].multi_apn) {
      generalInputs.unshift(enabled)
    }
    const schema = [
      {
        tab: 'General Settings',
        inputs: generalInputs
      },
      {
        tab: 'Advanced Settings',
        inputs: [fields.force_link, fields.metric, fields.dns, fields.mtu, fields.ip4table]
      },
      {
        tab: 'Firewall Settings',
        inputs: [fields.wanFwZone]
      }
    ]
    fillInterfaceName('testIface')
    cy.testCardConfigurationEdit(interfacesEndpoint, schema, 'interfaces')
  })

  it('Protocol: Mobile configuration + Mode Passthrough', () => {
    const mobileProto = isTRB ? 'connm' : 'wwan'
    const generalInputs = [
      { ...proto.mobile, options: mobileProto, value: 'Mobile' },
      { ...method, options: 'passthrough', value: 'Passthrough' },
      p2p,
      pdptype,
      autoApn,
      forceApn,
      apn,
      { ...auth, options: 'none', value: 'None' },
      { ...passthroughMode, value: 'false' },
      fields.leaseUnit,
      fields.leaseTime,
      fields.mac
    ]
    if (builtInModemsCount > 1) {
      generalInputs.push({ ...modem, options: modemInfo[0].id, value: modemInfo[0].name })
    }
    if (simCount > 1) {
      generalInputs.push(sim)
    }
    if (!modemInfo[0].multi_apn) {
      generalInputs.unshift(enabled)
    }
    const schema = [
      {
        tab: 'General Settings',
        inputs: generalInputs
      },
      {
        tab: 'Advanced Settings',
        inputs: [fields.force_link, fields.metric, fields.dns, fields.mtu, fields.ip4table]
      },
      {
        tab: 'Firewall Settings',
        inputs: [fields.wanFwZone]
      }
    ]
    fillInterfaceName('testIface')
    cy.testCardConfigurationEdit(interfacesEndpoint, schema, 'interfaces')
  })

  it('Protocol: Mobile configuration + Mode Passthrough + Disable DHCP', () => {
    const mobileProto = isTRB ? 'connm' : 'wwan'
    const generalInputs = [
      { ...proto.mobile, options: mobileProto, value: 'Mobile' },
      { ...method, options: 'passthrough', value: 'Passthrough' },
      p2p,
      pdptype,
      autoApn,
      forceApn,
      apn,
      { ...auth, options: 'chap', value: 'CHAP' },
      { ...passthroughMode, value: 'true' }
    ]
    if (builtInModemsCount > 1) generalInputs.push({ ...modem, options: modemInfo[0].id, value: modemInfo[0].name })
    if (simCount > 1) generalInputs.push(sim)
    if (!modemInfo[0].multi_apn) {
      generalInputs.unshift(enabled)
    }
    const schema = [
      {
        tab: 'General Settings',
        inputs: generalInputs
      },
      {
        tab: 'Advanced Settings',
        inputs: [fields.force_link, fields.metric, fields.dns, fields.mtu, fields.ip4table]
      },
      {
        tab: 'Firewall Settings',
        inputs: [fields.wanFwZone]
      }
    ]
    fillInterfaceName('testIface')
    cy.testCardConfigurationEdit(interfacesEndpoint, schema, 'interfaces')
  })
})
