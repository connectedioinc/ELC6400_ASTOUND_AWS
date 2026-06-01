import { fields } from './InterfaceFields'
import { tests } from './InterfaceTests'
/*

TODO Advanced functionality:

1. Add WAN to LAN test
2. Add LAN to WAN test
3. Add Overview data check

*/

const pageRoute = '/network/wan'
const interfacesEndpoint = '/interfaces/config'
let hasMwan3 = false

before(() => {
  cy.login()
  cy.hitPage(pageRoute)
  cy.packageCondition('mwan').then(value => {
    hasMwan3 = value
  })
})

after(() => {
  cy.logout()
})

describe('Wan interfaces configuration', () => {
  describe('Protocol: none', () => {
    it('Protocol: None configuration', () => {
      const schema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.none]
        },
        {
          tab: 'Advanced Settings',
          inputs: [fields.force_link, fields.metric]
        },
        {
          tab: 'Physical Settings',
          inputs: [fields.bridge, fields.noIfname]
        }
        // Fixed with #12577
        // {
        //   tab: 'Firewall Settings',
        //   inputs: [
        //     fields.unspecifiedFwZone
        //   ]
        // }
      ]
      tests.fillInterfaceName('testIface')
      cy.testCardConfigurationEdit(interfacesEndpoint, schema, 'interfaces')
    })
  })

  describe('Protocol: Static', () => {
    it('IPv6 assignment length - Disabled', () => {
      const schema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.static, fields.ipaddr, fields.netmask, fields.gateway, fields.broadcast, fields.dns]
        },
        {
          tab: 'IPv6 Settings',
          inputs: [fields.delegate, fields.ip6assign, fields.ip6addr, fields.ip6gw, fields.ip6prefix, fields.ip6ifaceid]
        },
        {
          tab: 'Advanced Settings',
          inputs: [fields.force_link, fields.metric, fields.macaddr, fields.mtu, fields.ip4table]
        },
        {
          tab: 'Physical Settings',
          inputs: [fields.bridge, fields.lanIfname]
        }
        // {
        //   tab: 'Firewall Settings',
        //   inputs: [
        //     fields.lanFwZone
        //   ]
        // }
      ]
      tests.fillInterfaceName('testIface')
      cy.testCardConfigurationEdit(interfacesEndpoint, schema, 'interfaces')
    })

    it('IPv6 assignment length - 64', () => {
      const schema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.static, fields.ipaddr, fields.netmask, fields.gateway, fields.broadcast, fields.dns]
        },
        {
          tab: 'IPv6 Settings',
          inputs: [fields.delegate, fields.ip6assign64, fields.ip6hint, fields.ip6ifaceid]
        },
        {
          tab: 'Advanced Settings',
          inputs: [fields.force_link, fields.metric, fields.macaddr, fields.mtu, fields.ip4table]
        },
        {
          tab: 'Physical Settings',
          inputs: [fields.bridge, fields.lanIfname]
        }
        // {
        //   tab: 'Firewall Settings',
        //   inputs: [
        //     fields.lanFwZone
        //   ]
        // }
      ]
      tests.fillInterfaceName('testIface')
      cy.testCardConfigurationEdit(interfacesEndpoint, schema, 'interfaces')
    })
  })

  describe('Protocol: DHCP', () => {
    it('Configuration', () => {
      const schema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.dhcp, fields.hostname]
        },
        {
          tab: 'Advanced Settings',
          inputs: [fields.force_link, fields.broadcast_dhcp, fields.defaultroute, fields.metric, fields.dns, fields.clientid, fields.vendorid, fields.macaddr, fields.mtu, fields.ip4table]
        },
        {
          tab: 'Physical Settings',
          inputs: [fields.bridge, fields.noIfname]
        }
        // {
        //   tab: 'Firewall Settings',
        //   inputs: [
        //     fields.wanFwZone
        //   ]
        // }
      ]
      tests.fillInterfaceName('testIface')
      cy.testCardConfigurationEdit(interfacesEndpoint, schema, 'interfaces')
    })
  })

  describe('Protocol: DHCPv6', () => {
    it('Configuration', () => {
      // Delete after fix
      // ipXtable input is borked as it's name is changed while in modal and test-id doesn't change
      // It changes only after save
      const ip6tableHack = {
        type: 'customTest',
        beforeSave: () => {
          cy.fillValues(fields.ip4table)
        },
        afterSave: () => {
          cy.getValues(fields.ip6table)
        }
      }
      const schema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.dhcpv6]
        },
        {
          tab: 'IPv6 Settings',
          inputs: [fields.delegate, fields.reqaddress, fields.reqprefix]
        },
        {
          tab: 'Advanced Settings',
          inputs: [fields.force_link, fields.defaultroute, fields.metric, fields.dns, fields.clientid, fields.macaddr, fields.mtu, ip6tableHack]
        },
        {
          tab: 'Physical Settings',
          inputs: [fields.bridge, fields.noIfname]
        }
        // {
        //   tab: 'Firewall Settings',
        //   inputs: [
        //     fields.wanFwZone
        //   ]
        // }
      ]
      tests.fillInterfaceName('testIface')
      cy.testCardConfigurationEdit(interfacesEndpoint, schema, 'interfaces')
    })
  })

  describe('Protocol: PPPoE', () => {
    it('Configuration', () => {
      const schema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.pppoe, fields.username, fields.password, fields.ac, fields.service]
        },
        {
          tab: 'IPv6 Settings',
          inputs: [fields.delegate, fields.ipv6]
        },
        {
          tab: 'Advanced Settings',
          inputs: [
            fields.force_link,
            fields.defaultroute,
            fields.metric,
            fields.dns,
            fields.tag,
            fields.priority,
            fields.keepalive_failure,
            fields.keepalive_interval,
            fields.host_uniq,
            fields.demand,
            fields.mtu,
            fields.ip4table
          ]
        },
        {
          tab: 'Physical Settings',
          inputs: [fields.bridge, fields.noIfname]
        }
        // {
        //   tab: 'Firewall Settings',
        //   inputs: [
        //     fields.wanFwZone
        //   ]
        // }
      ]
      tests.fillInterfaceName('testIface')
      cy.testCardConfigurationEdit(interfacesEndpoint, schema, 'interfaces')
    })
  })

  it.each([
    ['on', 'on'],
    ['off', 'off']
  ])('Overview test #%#', (enabled, mwan3) => {
    tests.fillInterfaceName('testIface')
    const schema = [fields.enabled[enabled], { ...fields.mwan3[mwan3], depend: hasMwan3 }]
    tests.testCardValues(interfacesEndpoint, schema, 'interfaces')
  })
})
