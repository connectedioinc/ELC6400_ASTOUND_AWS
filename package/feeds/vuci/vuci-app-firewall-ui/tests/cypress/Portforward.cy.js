const route = 'network/firewall/forwards'
const route2 = 'network/firewall/nat_rules'
const endpoint = '/firewall/port_forwards/config'
const section = 'forwards'
const section2 = 'source-nat'

let zones
before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/firewall/zones/config`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      zones = body.data
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const enabled = {
  on: { type: 'switch', inputName: 'enabled', value: 'true' },
  off: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const ruleName = { type: 'input', inputName: 'name' }
const proto = {
  all: { type: 'multiselect', inputName: 'proto', value: [{ options: 'all', value: 'all', custom: true }] },
  tcpUdp: { type: 'multiselect', inputName: 'proto', value: [{ options: 'tcp udp', value: 'tcp udp', custom: true }] },
  tcp: { type: 'multiselect', inputName: 'proto', value: [{ options: 'tcp', value: 'TCP' }] },
  udp: { type: 'multiselect', inputName: 'proto', value: [{ options: 'udp', value: 'UDP' }] },
  icmp: { type: 'multiselect', inputName: 'proto', value: [{ options: 'icmp', value: 'ICMP' }] }
}
const src = { type: 'select', inputName: 'src' }
const srcMac = { type: 'multiselect', inputName: 'src_mac' }
const srcIp = { type: 'multiselect', inputName: 'src_ip' }
const srcPort = { type: 'multiselect', inputName: 'src_port' } // depends
const srcDip = { type: 'select', inputName: 'src_dip' }
const srcDport = { type: 'select', inputName: 'src_dport' }
const dest = { type: 'select', inputName: 'dest' }
const destIp = { type: 'select', inputName: 'dest_ip' }
const destPort = { type: 'select', inputName: 'dest_port' }
const reflection = {
  on: { type: 'switch', inputName: 'reflection', value: 'true' },
  off: { type: 'switch', inputName: 'reflection', value: 'false' }
}
const extra = { type: 'input', inputName: 'extra' }

const createSchema = [
  { ...ruleName, value: 'test1' },
  { ...srcDport, options: '80' },
  { ...destIp, value: '1.2.3.4', custom: true },
  { ...destPort, options: '80' }
]

describe('Firewall: Port Forwards', () => {
  describe('Edit', () => {
    it('Save with any external port', () => {
      cy.setValues(endpoint, [{ ...srcDport, options: 'any' }], section)
      cy.testConfigurationEdit(endpoint, [], section)
    })
    it('Save with default options', () => {
      cy.setValues(endpoint, createSchema, section)
      cy.testConfigurationEdit(endpoint, [], section)
    })
    it('Save with filled options when all depends off', () => {
      const schema = [
        {
          tab: 'General Settings',
          inputs: [enabled.on, { ...ruleName, value: 'test' }, proto.icmp, { ...src, options: zones[0].name }, { ...dest, options: zones[0].name }, { ...destIp, value: '1.2.3.4', custom: true }]
        },
        {
          tab: 'Advanced Settings',
          inputs: [
            { ...srcMac, value: [{ value: '00:00:00:00:00:00', custom: true }] },
            { ...srcIp, value: [{ value: '1.2.3.4', custom: true }] },
            { ...srcDip, value: '1.2.3.4', custom: true },
            reflection.on,
            { ...extra, value: '-c' }
          ]
        }
      ]
      cy.setValues(endpoint, createSchema, section)
      cy.testConfigurationEdit(endpoint, schema, section)
    })
    it('Save with filled options when all depends on', () => {
      const schema = [
        {
          tab: 'General Settings',
          inputs: [
            enabled.on,
            { ...ruleName, value: 'test' },
            proto.tcp,
            { ...src, options: zones[0].name },
            { ...srcDport, options: '80' },
            { ...dest, options: zones[0].name },
            { ...destIp, value: '1.2.3.4', custom: true },
            { ...destPort, options: '80' }
          ]
        },
        {
          tab: 'Advanced Settings',
          inputs: [
            { ...srcMac, value: [{ value: '00:00:00:00:00:00', custom: true }] },
            { ...srcIp, value: [{ value: '1.2.3.4', custom: true }] },
            { ...srcPort, value: [{ value: '80', custom: true }] },
            { ...srcDip, value: '1.2.3.4', custom: true },
            reflection.on,
            { ...extra, value: '-c' }
          ]
        }
      ]
      cy.setValues(endpoint, createSchema, section)
      cy.testConfigurationEdit(endpoint, schema, section)
    })
    it('Try add same section name', () => {
      const schema = [createSchema[0]]
      cy.setValues(endpoint, createSchema, section)
      cy.clickSectionAdd()
      cy.clickEditClose()
      cy.setValues(endpoint, schema, section2)
      cy.clickSectionAdd()
      cy.checkMessage('Some fields are invalid')
      cy.deleteLastCreated()
    })
    it('Try add same section name in port forwards and NAT rules pages', () => {
      const schema = [createSchema[0]]
      cy.setValues(endpoint, createSchema, section)
      cy.clickSectionAdd()
      cy.clickEditClose()
      cy.hitPage(route2)
      cy.setValues(endpoint, schema, section2)
      cy.clickSectionAdd()
      cy.checkMessage(`Configuration with name '${schema[0].value}' already exists`)
      cy.hitPage(route)
      cy.deleteLastCreated()
    })
  })
})
