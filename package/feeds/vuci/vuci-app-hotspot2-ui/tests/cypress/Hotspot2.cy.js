const route = '/services/hotspot/hotspot2'
const endpoint = 'hotspot2/config'
const radios = [
  { name: 'Wifi 2ghz', value: 'default_radio0' },
  { name: 'Wifi 5ghz', value: 'default_radio1' }
]

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

// Hotspot 2 General Setup tab
const interworking = {
  true: { type: 'switch', inputName: 'interworking', value: 'true' },
  false: { type: 'switch', inputName: 'interworking', value: 'false' }
}
const internet = {
  true: { type: 'switch', inputName: 'internet', value: 'true' },
  false: { type: 'switch', inputName: 'internet', value: 'false' }
}
const access_network_type = {
  privateNetwork: { type: 'select', inputName: 'access_network_type', options: '0', value: 'Private network' },
  privateNetworkGuestAccess: { type: 'select', inputName: 'access_network_type', options: '1', value: 'Private network with guest access' },
  chargeablePublicNetwork: { type: 'select', inputName: 'access_network_type', options: '2', value: 'Chargeable public network' },
  freePublicNetwork: { type: 'select', inputName: 'access_network_type', options: '3', value: 'Free public network' },
  personaldeviceNetwork: { type: 'select', inputName: 'access_network_type', options: '4', value: 'Personal device network' },
  emergencyServicesOnlyNetwork: { type: 'select', inputName: 'access_network_type', options: '5', value: 'Emergency services only network' },
  testOrExperimental: { type: 'select', inputName: 'access_network_type', options: '14', value: 'Test or experimental' }
}
const hessid = { type: 'input', inputName: 'hessid', value: '00:1E:42:5A:EC:79' }
const roaming_consortium = { type: 'list', inputName: 'roaming_consortium', value: ['021122'] }

const network_auth_type = {
  notConfigured: { type: 'select', inputName: 'network_auth_type', options: '', value: 'Not configured' },
  acceptanceOfTermsAndConditions: { type: 'select', inputName: 'network_auth_type', options: '00', value: 'Acceptance of terms and conditions' },
  onlineEnrollmentSupported: { type: 'select', inputName: 'network_auth_type', options: '01', value: 'On-line enrollment supported' },
  redirection: { type: 'select', inputName: 'network_auth_type', options: '02', value: 'http/https redirection' },
  redirectUrl: { type: 'input', inputName: 'redirect_url', value: 'http://test.com' },
  dnsRedirection: { type: 'select', inputName: 'network_auth_type', options: '03', value: 'DNS redirection' }
}
const ipaddr_type_availability = {
  addressTypeNotAvailable: { type: 'select', inputName: 'ipaddr_type_availability', options: '0', value: 'Address type not available' },
  publicIPv4AddressAvailable: { type: 'select', inputName: 'ipaddr_type_availability', options: '1', value: 'Public IPv4 address available' },
  portRestrictedIPv4AddressAvailable: { type: 'select', inputName: 'ipaddr_type_availability', options: '2', value: 'Port-restricted IPv4 address available' },
  singleNATedPrivateIPv4AddressAvailable: { type: 'select', inputName: 'ipaddr_type_availability', options: '3', value: 'Single NATed private IPv4 address available' },
  doubleNATedPrivateIPv4AddressAvailable: { type: 'select', inputName: 'ipaddr_type_availability', options: '4', value: 'Double NATed private IPv4 address available' },
  portRestrictedIPv4AddressAndSingleNATedIPv4AddressAvailable: {
    type: 'select',
    inputName: 'ipaddr_type_availability',
    options: '5',
    value: 'Port-restricted IPv4 address and single NATed IPv4 address available'
  },
  portRestrictedIPv4AddressAndDoubleNATedIPv4AddressAvailable: {
    type: 'select',
    inputName: 'ipaddr_type_availability',
    options: '6',
    value: 'Port-restricted IPv4 address and double NATed IPv4 address available'
  },
  availabilityOfTheAddressTypeIsNotKnown: { type: 'select', inputName: 'ipaddr_type_availability', options: '7', value: 'Availability of the address type is not known' }
}
const domain_name = { type: 'list', inputName: 'domain_name', value: ['example.com'] }
const venue_group = {
  unspecified: { type: 'select', inputName: 'venue_group', options: '0', value: 'Unspecified' },
  assembly: { type: 'select', inputName: 'venue_group', options: '1', value: 'Assembly' },
  business: { type: 'select', inputName: 'venue_group', options: '2', value: 'Business' },
  educational: { type: 'select', inputName: 'venue_group', options: '3', value: 'Educational' },
  factoryAndIndustrial: { type: 'select', inputName: 'venue_group', options: '4', value: 'Factory and Industrial' },
  institutional: { type: 'select', inputName: 'venue_group', options: '5', value: 'Institutional' },
  mercantile: { type: 'select', inputName: 'venue_group', options: '6', value: 'Mercantile' },
  residential: { type: 'select', inputName: 'venue_group', options: '7', value: 'Residential' },
  storage: { type: 'select', inputName: 'venue_group', options: '8', value: 'Storage' },
  utilityAndMiscellaneous: { type: 'select', inputName: 'venue_group', options: '9', value: 'Utility and Miscellaneous' },
  vehicular: { type: 'select', inputName: 'venue_group', options: '10', value: 'Vehicular' },
  outdoor: { type: 'select', inputName: 'venue_group', options: '11', value: 'Outdoor' }
}
const assemblyVenueType = { type: 'select', inputName: 'venue_type', options: '1', value: 'Arena' }
const businessVenueType = { type: 'select', inputName: 'venue_type', options: '2', value: 'Bank' }
const educationalVenueType = { type: 'select', inputName: 'venue_type', options: '1', value: 'School, Primary' }
const factoryAndIndustrialVenueType = { type: 'select', inputName: 'venue_type', options: '1', value: 'Factory' }
const institutionalVenueType = { type: 'select', inputName: 'venue_type', options: '1', value: 'Hospital' }
const mercantileVenueType = { type: 'select', inputName: 'venue_type', options: '1', value: 'Retail Store' }
const residentialVenueType = { type: 'select', inputName: 'venue_type', options: '1', value: 'Private Residence' }
const storageVenueType = { type: 'select', inputName: 'venue_type', options: '0', value: 'Unspecified Residential' }
const utilityAndMiscellaneousVenueType = { type: 'select', inputName: 'venue_type', options: '0', value: 'Unspecified Utility and Miscellaneous' }
const vehicularVenueType = { type: 'select', inputName: 'venue_type', options: '3', value: 'Bus' }
const outdoorVenueType = { type: 'select', inputName: 'venue_type', options: '6', value: 'Kiosk' }

// Hotspot 2 OSU provider tab
const osu_ssid = { type: 'input', inputName: 'osu_ssid', value: 'SSID' }
const osu_server_uri = { type: 'input', inputName: 'osu_server_uri', value: 'http://www.example.org/' }
const osu_friendly_name_lang = { type: 'input', inputName: 'osu_friendly_name_lang', value: 'eng' }
const osu_friendly_name = { type: 'input', inputName: 'osu_friendly_name', value: 'Name' }
const osu_nai = { type: 'input', inputName: 'osu_nai', value: 'test' }
const osu_method_list = { type: 'multiselect', inputName: 'osu_method_list', value: [{ options: '0', value: 'OMA-DM' }] }
const osu_service_desc_lang = { type: 'input', inputName: 'osu_service_desc_lang', value: 'eng' }
const osu_service_desc = { type: 'input', inputName: 'osu_service_desc', value: 'description' }

// Hotspot 2 WAN metrics tab
const hs20_wan_status = {
  linkUp: { type: 'select', inputName: 'hs20_wan_status', options: '01', value: 'Link up' },
  linkDown: { type: 'select', inputName: 'hs20_wan_status', options: '02', value: 'Link down' },
  linkInTestState: { type: 'select', inputName: 'hs20_wan_status', options: '03', value: 'Link in test state' }
}
const hs20_wan_dw_speed = { type: 'input', inputName: 'hs20_wan_dw_speed', value: '8000' }
const hs20_wan_up_speed = { type: 'input', inputName: 'hs20_wan_up_speed', value: '1000' }

const languageSchema = [
  { type: 'input', inputName: 'country_code', value: 'eng' },
  { type: 'input', inputName: 'name', value: 'venue' },
  { type: 'input', inputName: 'url', value: 'http://www.example.com' }
]

const cellularNetworkInformation = [
  { type: 'input', inputName: 'mobile_country_code', value: '246' },
  { type: 'input', inputName: 'mobile_network_code', value: '99' }
]
const naiSchema = [
  { type: 'input', inputName: 'hostname', value: 'example.com' },
  { type: 'select', inputName: 'auth_num', options: '13', value: 'EAP-TLS' },
  { type: 'select', inputName: 'param', options: '[2:1]', value: 'Non EAP PAP' }
]
const operatorFriendlyNameSchema = [
  { type: 'input', inputName: 'country_code', value: 'eng' },
  { type: 'input', inputName: 'name', value: 'operator' }
]
const proto = {
  icmp: { type: 'select', inputName: 'proto', options: '1', value: 'ICMP' },
  tcp: { type: 'select', inputName: 'proto', options: '6', value: 'TCP' },
  udp: { type: 'select', inputName: 'proto', options: '17', value: 'UDP' }
}
const statusOptions = {
  closed: { type: 'select', inputName: 'state', options: '0', value: 'Closed' },
  open: { type: 'select', inputName: 'state', options: '1', value: 'Open' },
  unknown: { type: 'select', inputName: 'state', options: '2', value: 'Unknown' }
}
const connectionCapability = [proto.icmp, { type: 'input', inputName: 'port', value: '22' }, statusOptions.open]
function customTestConfigurationEditNoCreate(schema, wifiSection, sectionName) {
  cy.openEdit('hotspot2', wifiSection)
  cy.intercept('POST', `/api/${endpoint}/${wifiSection}/${sectionName}`).as('postSection')
  const section = `${wifiSection}_${sectionName}`
  cy.clickSectionAdd(section)
  cy.wait('@postSection').then(res => {
    const sectionId = res.response.body.data.id
    cy.setValues('', schema, section)
    cy.clickEditSave()
    cy.openEdit('hotspot2', wifiSection)
    cy.checkValues('', schema, section)
    cy.clearSection('', sectionId)
    cy.clickEditClose()
  })
}
function unselect(section) {
  cy.openEdit('hotspot2', section)
  cy.getModal().within(() => {
    cy.get('[test-id="tablerow-hotspot2"]').within(() => {
      cy.changeInnerTab('OSU provider')
      cy.getMultiSelect('osu_method_list').within(() => {
        cy.get('.close-btn-wrapper').click()
      })
    })
    cy.clickEditSave()
  })
}
describe('Hotspot2 configuration', () => {
  radios.forEach(radio => {
    it.each([
      ['General Setup tab: Default', [{ tab: 'General Setup', inputs: [] }]],
      [`General Setup tab: Enable is ${interworking.true.value}`, [{ tab: 'General Setup', inputs: [interworking.true] }]],
      [`General Setup tab: Internet access is ${internet.true.value}`, [{ tab: 'General Setup', inputs: [internet.true] }]],
      [`General Setup tab: Access network type is ${access_network_type.privateNetwork.value}`, [{ tab: 'General Setup', inputs: [access_network_type.privateNetwork] }]],
      [`General Setup tab: Access network type is ${access_network_type.privateNetworkGuestAccess.value}`, [{ tab: 'General Setup', inputs: [access_network_type.privateNetworkGuestAccess] }]],
      [`General Setup tab: Access network type is ${access_network_type.chargeablePublicNetwork.value}`, [{ tab: 'General Setup', inputs: [access_network_type.chargeablePublicNetwork] }]],
      [`General Setup tab: Access network type is ${access_network_type.freePublicNetwork.value}`, [{ tab: 'General Setup', inputs: [access_network_type.freePublicNetwork] }]],
      [`General Setup tab: Access network type is ${access_network_type.personaldeviceNetwork.value}`, [{ tab: 'General Setup', inputs: [access_network_type.personaldeviceNetwork] }]],
      [`General Setup tab: Access network type is ${access_network_type.emergencyServicesOnlyNetwork.value}`, [{ tab: 'General Setup', inputs: [access_network_type.emergencyServicesOnlyNetwork] }]],
      [`General Setup tab: Access network type is ${access_network_type.testOrExperimental.value}`, [{ tab: 'General Setup', inputs: [access_network_type.testOrExperimental] }]],
      [`General Setup tab: HESSID is ${hessid.value}`, [{ tab: 'General Setup', inputs: [hessid] }]],
      [`General Setup tab: Roaming consortium OI is ${roaming_consortium.value}`, [{ tab: 'General Setup', inputs: [roaming_consortium] }]],
      [`General Setup tab: Network authentication type is ${network_auth_type.notConfigured.value}`, [{ tab: 'General Setup', inputs: [network_auth_type.notConfigured] }]],
      [
        `General Setup tab: Network authentication type is ${network_auth_type.acceptanceOfTermsAndConditions.value}`,
        [{ tab: 'General Setup', inputs: [network_auth_type.acceptanceOfTermsAndConditions] }]
      ],
      [`General Setup tab: Network authentication type is ${network_auth_type.onlineEnrollmentSupported.value}`, [{ tab: 'General Setup', inputs: [network_auth_type.onlineEnrollmentSupported] }]],
      [`General Setup tab: Network authentication type is ${network_auth_type.redirection.value}`, [{ tab: 'General Setup', inputs: [network_auth_type.redirection, network_auth_type.redirectUrl] }]],
      [`General Setup tab: Network authentication type is ${network_auth_type.dnsRedirection.value}`, [{ tab: 'General Setup', inputs: [network_auth_type.dnsRedirection] }]],
      [
        `General Setup tab: IP address type availability is ${ipaddr_type_availability.addressTypeNotAvailable.value}`,
        [{ tab: 'General Setup', inputs: [ipaddr_type_availability.addressTypeNotAvailable] }]
      ],
      [
        `General Setup tab: IP address type availability is ${ipaddr_type_availability.publicIPv4AddressAvailable.value}`,
        [{ tab: 'General Setup', inputs: [ipaddr_type_availability.publicIPv4AddressAvailable] }]
      ],
      [
        `General Setup tab: IP address type availability is ${ipaddr_type_availability.portRestrictedIPv4AddressAvailable.value}`,
        [{ tab: 'General Setup', inputs: [ipaddr_type_availability.portRestrictedIPv4AddressAvailable] }]
      ],
      [
        `General Setup tab: IP address type availability is ${ipaddr_type_availability.singleNATedPrivateIPv4AddressAvailable.value}`,
        [{ tab: 'General Setup', inputs: [ipaddr_type_availability.singleNATedPrivateIPv4AddressAvailable] }]
      ],
      [
        `General Setup tab: IP address type availability is ${ipaddr_type_availability.doubleNATedPrivateIPv4AddressAvailable.value}`,
        [{ tab: 'General Setup', inputs: [ipaddr_type_availability.doubleNATedPrivateIPv4AddressAvailable] }]
      ],
      [
        `General Setup tab: IP address type availability is ${ipaddr_type_availability.portRestrictedIPv4AddressAndSingleNATedIPv4AddressAvailable.value}`,
        [{ tab: 'General Setup', inputs: [ipaddr_type_availability.portRestrictedIPv4AddressAndSingleNATedIPv4AddressAvailable] }]
      ],
      [
        `General Setup tab: IP address type availability is ${ipaddr_type_availability.portRestrictedIPv4AddressAndDoubleNATedIPv4AddressAvailable.value}`,
        [{ tab: 'General Setup', inputs: [ipaddr_type_availability.portRestrictedIPv4AddressAndDoubleNATedIPv4AddressAvailable] }]
      ],
      [
        `General Setup tab: IP address type availability is ${ipaddr_type_availability.availabilityOfTheAddressTypeIsNotKnown.value}`,
        [{ tab: 'General Setup', inputs: [ipaddr_type_availability.availabilityOfTheAddressTypeIsNotKnown] }]
      ],
      [`General Setup tab: Domain name is ${domain_name.value}`, [{ tab: 'General Setup', inputs: [domain_name] }]],
      [`General Setup tab: Venue group is ${venue_group.assembly.value}, Venue type is ${assemblyVenueType.value}`, [{ tab: 'General Setup', inputs: [venue_group.assembly, assemblyVenueType] }]],
      [`General Setup tab: Venue group is ${venue_group.business.value}, Venue type is ${businessVenueType.value}`, [{ tab: 'General Setup', inputs: [venue_group.business, businessVenueType] }]],
      [
        `General Setup tab: Venue group is ${venue_group.educational.value}, Venue type is ${educationalVenueType.value}`,
        [{ tab: 'General Setup', inputs: [venue_group.educational, educationalVenueType] }]
      ],
      [
        `General Setup tab: Venue group is ${venue_group.factoryAndIndustrial.value}, Venue type is ${factoryAndIndustrialVenueType.value}`,
        [{ tab: 'General Setup', inputs: [venue_group.factoryAndIndustrial, factoryAndIndustrialVenueType] }]
      ],
      [
        `General Setup tab: Venue group is ${venue_group.institutional.value}, Venue type is ${institutionalVenueType.value}`,
        [{ tab: 'General Setup', inputs: [venue_group.institutional, institutionalVenueType] }]
      ],
      [
        `General Setup tab: Venue group is ${venue_group.mercantile.value}, Venue type is ${mercantileVenueType.value}`,
        [{ tab: 'General Setup', inputs: [venue_group.mercantile, mercantileVenueType] }]
      ],
      [
        `General Setup tab: Venue group is ${venue_group.residential.value}, Venue type is ${residentialVenueType.value}`,
        [{ tab: 'General Setup', inputs: [venue_group.residential, residentialVenueType] }]
      ],
      [`General Setup tab: Venue group is ${venue_group.storage.value}, Venue type is ${storageVenueType.value}`, [{ tab: 'General Setup', inputs: [venue_group.storage, storageVenueType] }]],
      [
        `General Setup tab: Venue group is ${venue_group.utilityAndMiscellaneous.value}, Venue type is ${utilityAndMiscellaneousVenueType.value}`,
        [{ tab: 'General Setup', inputs: [venue_group.utilityAndMiscellaneous, utilityAndMiscellaneousVenueType] }]
      ],
      [`General Setup tab: Venue group is ${venue_group.vehicular.value}, Venue type is ${vehicularVenueType.value}`, [{ tab: 'General Setup', inputs: [venue_group.vehicular, vehicularVenueType] }]],
      [`General Setup tab: Venue group is ${venue_group.outdoor.value}, Venue type is ${outdoorVenueType.value}`, [{ tab: 'General Setup', inputs: [venue_group.outdoor, outdoorVenueType] }]],
      ['OSU provider tab: Default', [{ tab: 'OSU provider', inputs: [] }]],
      [`OSU provider tab: OSU ssid is ${osu_ssid.value}`, [{ tab: 'OSU provider', inputs: [osu_ssid] }]],
      [`OSU provider tab: OSU server URI is ${osu_server_uri.value}`, [{ tab: 'OSU provider', inputs: [osu_server_uri] }]],
      [`OSU provider tab: Name language code is ${osu_server_uri.value}`, [{ tab: 'OSU provider', inputs: [osu_friendly_name_lang] }]],
      [`OSU provider tab: OSU friendly name is ${osu_server_uri.value}`, [{ tab: 'OSU provider', inputs: [osu_friendly_name] }]],
      [`OSU provider tab: OSU NAI is ${osu_nai.value}`, [{ tab: 'OSU provider', inputs: [osu_nai] }]],
      [`OSU provider tab: OSU method list is ${osu_method_list.value}`, [{ tab: 'OSU provider', inputs: [osu_method_list] }]],
      [`OSU provider tab: Description language codet is ${osu_service_desc_lang.value}`, [{ tab: 'OSU provider', inputs: [osu_service_desc_lang] }]],
      [`OSU provider tab: OSU description is ${osu_service_desc.value}`, [{ tab: 'OSU provider', inputs: [osu_service_desc] }]],
      ['WAN metrics tab: Default', [{ tab: 'WAN metrics', inputs: [] }]],
      [`WAN metrics tab: Link status is ${hs20_wan_status.linkDown.value}`, [{ tab: 'WAN metrics', inputs: [hs20_wan_status.linkDown] }]],
      [`WAN metrics tab: Link status is ${hs20_wan_status.linkInTestState.value}`, [{ tab: 'WAN metrics', inputs: [hs20_wan_status.linkInTestState] }]],
      [`WAN metrics tab: Downlink speed is ${hs20_wan_dw_speed.value}`, [{ tab: 'WAN metrics', inputs: [hs20_wan_dw_speed] }]],
      [`WAN metrics tab: Uplink speed is ${hs20_wan_up_speed.value}`, [{ tab: 'WAN metrics', inputs: [hs20_wan_up_speed] }]]
    ])(`${radio.name} check HOTSPOT 2.0 with this parameters: %s`, (_, schema) => {
      cy.testConfigurationEditNoCreate(schema, 'hotspot2', radio.value)
    })
    it(`${radio.name} unselect OSU method list in HOTSPOT 2.0 OSU provider tab`, () => {
      unselect(radio.value)
    })
    it(`${radio.name} check VENUE NAME INFORMATION`, () => {
      customTestConfigurationEditNoCreate(languageSchema, radio.value, 'venues')
    })
    it(`${radio.name} check 3GPP CELLULAR NETWORK INFORMATION`, () => {
      customTestConfigurationEditNoCreate(cellularNetworkInformation, radio.value, '3gpp')
    })
    it(`${radio.name} check NETWORK ACCESS IDENTIFIER (NAI) REALM INFORMATION`, () => {
      customTestConfigurationEditNoCreate(naiSchema, radio.value, 'nai')
    })
    it(`${radio.name} check OPERATOR FRIENDLY NAME`, () => {
      customTestConfigurationEditNoCreate(operatorFriendlyNameSchema, radio.value, 'names')
    })
    it(`${radio.name} check CONNECTION CAPABILITY`, () => {
      customTestConfigurationEditNoCreate(connectionCapability, radio.value, 'capabilities')
    })
  })
})
