import { fields } from './InterfaceFields'
import { tests } from './InterfaceTests'
/*

TODO Advanced functionality:

1. Add WAN to LAN test
2. Add LAN to WAN test
3. Add Overview data check

*/

const pageRoute = '/network/lan'
const interfacesEndpoint = '/interfaces/config'
const dhcpConfigSection = 'dhcpSections'
const dhcpCreateSection = 'dhcpServer'

before(() => {
  cy.login()
  cy.hitPage(pageRoute)
})

after(() => {
  cy.logout()
})

describe('Lan interfaces configuration', () => {
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

  describe('Protocol: static', () => {
    it('IPv6 assignment length - Disabled', () => {
      const schema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.static, fields.ipaddr, fields.netmask]
        },
        {
          tab: 'IPv6 Settings',
          inputs: [fields.delegate, fields.ip6assign, fields.ip6addr, fields.ip6prefix, fields.ip6ifaceid]
        },
        {
          tab: 'Advanced Settings',
          inputs: [fields.force_link, fields.metric, fields.macaddr, fields.mtu, fields.ip4table]
        },
        {
          tab: 'Physical Settings',
          inputs: [fields.bridge, fields.lanIfname]
        }
        // Fixed with #12577
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
          inputs: [fields.proto.static, fields.ipaddr, fields.netmask]
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
    function prepareDhcpTest(dhcpSchema, dhcpRangeSchema) {
      return {
        type: 'customTest',
        executeOutsideBoth: true,
        beforeSave: () => {
          cy.getTablerow(dhcpCreateSection).within(() => {
            cy.clickButton('setup')
          })
          cy.getTablerow(dhcpConfigSection).within(() => {
            // check if auto start and stop are correct
            if (dhcpRangeSchema) cy.getValues('', dhcpRangeSchema)
            cy.setValues('', dhcpSchema)
          })
        },
        afterSave: () => {
          cy.getTablerow(dhcpConfigSection).within(() => {
            cy.getValues('', dhcpSchema)
          })
        }
      }
    }
    function prepareDhcpOptionTest(optionScema) {
      return {
        type: 'customTest',
        beforeSave: () => {
          cy.clickButton('dhcp_option-button')
          cy.getOutside().within(() => {
            cy.getTablerow('dhcp_options').within(() => {
              cy.clickButton('add')
              cy.setValues('', optionScema)
              cy.clickButton('save')
            })
          })
        },
        afterSave: () => {
          cy.getOutside().within(() => {
            cy.getTablerow('dhcp_options').within(() => {
              cy.getValues('', optionScema)
            })
          })
        }
      }
    }
    it('Enabled DHCP section configuration', () => {
      const dhcpOptionSchema = [{ ...fields.dhcpOptions.key.dns }, { ...fields.dhcpOptions.value, value: '1.1.1.1' }]
      const dhcpSchema = [
        {
          tab: 'General Setup',
          inputs: [fields.ignore, fields.start_ip, fields.end_ip, fields.leaseUnit, fields.leaseTime]
        },
        {
          tab: 'Advanced Settings',
          inputs: [fields.dynamicdhcp, fields.force, fields.dhcpNetmask, prepareDhcpOptionTest(dhcpOptionSchema), fields.force_options]
        },
        {
          tab: 'IPv6 Settings',
          inputs: [
            { ...fields.ra, options: '', value: 'Disabled' },
            { ...fields.dhcpv6, options: '', value: 'Disabled' },
            { ...fields.ndp, options: '', value: 'Disabled' },
            fields.dhcpDns,
            fields.domain
          ]
        }
      ]
      const dhcpRangeSchema = [
        { ...fields.start_ip, value: '1.1.1.100' },
        { ...fields.end_ip, value: '1.1.1.150' }
      ]
      const interfacesSchema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.static, fields.ipaddr, fields.netmask, prepareDhcpTest(dhcpSchema, dhcpRangeSchema)]
        }
      ]
      tests.fillInterfaceName('testIface')
      cy.testCardConfigurationEdit(interfacesEndpoint, interfacesSchema, 'interfaces')
    })

    it('Disabled DHCP section configuration', () => {
      const dhcpSchema = [
        {
          tab: 'General Setup',
          inputs: [fields.ignoreDisable]
        },
        {
          tab: 'IPv6 Settings',
          inputs: [
            { ...fields.ra, options: '', value: 'Disabled' },
            { ...fields.dhcpv6, options: '', value: 'Disabled' },
            { ...fields.ndp, options: '', value: 'Disabled' },
            fields.dhcpDns,
            fields.domain
          ]
        }
      ]
      const interfacesSchema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.static, fields.ipaddr, fields.netmask, prepareDhcpTest(dhcpSchema)]
        }
      ]
      tests.fillInterfaceName('testIface')
      cy.testCardConfigurationEdit(interfacesEndpoint, interfacesSchema, 'interfaces')
    })

    it('Disabled DHCP section configuration + IPv6 server mode', () => {
      const dhcpSchema = [
        {
          tab: 'General Setup',
          inputs: [fields.ignoreDisable]
        },
        {
          tab: 'IPv6 Settings',
          inputs: [
            { ...fields.ra, options: 'server', value: 'Server mode' },
            { ...fields.dhcpv6, options: 'server', value: 'Server mode' },
            { ...fields.ndp, options: '', value: 'Disabled' },
            fields.ra_default,
            { ...fields.ra_management, options: '2', value: 'Stateful-only' },
            fields.dhcpDns,
            fields.domain
          ]
        }
      ]
      const interfacesSchema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.static, fields.ipaddr, fields.netmask, prepareDhcpTest(dhcpSchema)]
        }
      ]
      tests.fillInterfaceName('testIface')
      cy.testCardConfigurationEdit(interfacesEndpoint, interfacesSchema, 'interfaces')
    })

    it('Disabled DHCP section configuration + IPv6 hybrid mode', () => {
      const dhcpSchema = [
        {
          tab: 'General Setup',
          inputs: [fields.ignoreDisable]
        },
        {
          tab: 'IPv6 Settings',
          inputs: [
            { ...fields.ra, options: 'hybrid', value: 'Hybrid mode' },
            { ...fields.dhcpv6, options: 'hybrid', value: 'Hybrid mode' },
            { ...fields.ndp, options: 'hybrid', value: 'Hybrid mode' },
            fields.ra_default,
            { ...fields.ra_management, options: '0', value: 'Stateless' },
            fields.dhcpDns,
            fields.domain
          ]
        }
      ]
      const interfacesSchema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.static, fields.ipaddr, fields.netmask, prepareDhcpTest(dhcpSchema)]
        }
      ]
      tests.fillInterfaceName('testIface')
      cy.testCardConfigurationEdit(interfacesEndpoint, interfacesSchema, 'interfaces')
    })

    it('Relay DHCP section configuration', () => {
      const dhcpSchema = [
        {
          tab: 'General Setup',
          inputs: [fields.ignoreRelay, fields.server_relay]
        },
        {
          tab: 'IPv6 Settings',
          inputs: [
            { ...fields.ra, options: 'relay', value: 'Relay mode' },
            { ...fields.dhcpv6, options: 'relay', value: 'Relay mode' },
            { ...fields.ndp, options: 'relay', value: 'Relay mode' },
            fields.dhcpDns,
            fields.domain
          ]
        }
      ]
      const interfacesSchema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.static, fields.ipaddr, fields.netmask, prepareDhcpTest(dhcpSchema)]
        }
      ]
      tests.fillInterfaceName('testIface')
      cy.testCardConfigurationEdit(interfacesEndpoint, interfacesSchema, 'interfaces')
    })

    it('DHCP section and then to Protocol: None configuration', () => {
      const interfacesSchema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.static, fields.ipaddr, fields.netmask]
        }
      ]
      const interfacesNoneSchema = [
        {
          tab: 'General Settings',
          inputs: [fields.proto.none]
        }
      ]
      const complexTestShema = [
        {
          type: 'customTest',
          beforeSave: () => {
            cy.setValues('', interfacesSchema)
            cy.getOutside().within(() => {
              cy.getTablerow(dhcpCreateSection).within(() => {
                cy.clickButton('setup')
              })
            })
            cy.setValues('', interfacesNoneSchema)
          },
          afterSave: () => {
            cy.setValues('', interfacesSchema)
            cy.getOutside().within(() => {
              cy.getTablerow(dhcpCreateSection)
            })
          }
        }
      ]
      tests.fillInterfaceName('testIface')
      cy.testCardConfigurationEdit(interfacesEndpoint, complexTestShema, 'interfaces')
    })
  })

  it.each([
    ['on', 'on'],
    ['off', 'off']
  ])('Overview test #%#', enabled => {
    tests.fillInterfaceName('testIface')
    const schema = [fields.enabled[enabled]]
    tests.testCardValues(interfacesEndpoint, schema, 'interfaces')
  })
})
