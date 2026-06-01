const route = 'network/firewall/nat_rules'
const route2 = 'network/firewall/forwards'
const endpoint = '/firewall/nat_rules/config'
const section = 'natRules'
const section2 = 'forwards'

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
const srcIp = { type: 'multiselect', inputName: 'src_ip' }
const srcPort = { type: 'multiselect', inputName: 'src_port' } // depend
const dest = { type: 'select', inputName: 'dest' }
const destIp = { type: 'select', inputName: 'dest_ip' }
const destPort = { type: 'select', inputName: 'dest_port' } // depend
const srcDip = { type: 'select', inputName: 'src_dip' }
const srcDport = { type: 'select', inputName: 'src_dport' } // depend
const extra = { type: 'input', inputName: 'extra' }
const weekdays = { type: 'multiselect', inputName: 'weekdays' }
const monthdays = { type: 'multiselect', inputName: 'monthdays' }
const startTime = { type: 'input', inputName: 'start_time' }
const stopTime = { type: 'input', inputName: 'stop_time' }
const startDate = { type: 'input', inputName: 'start_date' }
const stopDate = { type: 'input', inputName: 'stop_date' }
const utcTime = {
  on: { type: 'switch', inputName: 'utc_time', value: 'true' },
  off: { type: 'switch', inputName: 'utc_time', value: 'false' }
}

describe('Firewall: Nat rules', () => {
  it('Save with default options', () => {
    const createSchema = [
      { ...ruleName, value: 'testNat' },
      { ...src, options: zones[0].name },
      { ...dest, options: zones[0].name },
      { ...srcDip, value: '1.2.3.4', custom: true },
      { ...srcDport, options: '' }
    ]
    cy.setValues(endpoint, createSchema, section)
    cy.testConfigurationEdit(endpoint, [], section)
  })
  it('Save with filled options when all depends on', () => {
    const createSchema = [
      { ...ruleName, value: 'testNat' },
      { ...src, options: zones[0].name },
      { ...dest, options: zones[0].name },
      { ...srcDip, value: '1.2.3.4', custom: true },
      { ...srcDport, options: '80' }
    ]
    const schema = [
      {
        tab: 'General Settings',
        inputs: [
          enabled.on,
          { ...ruleName, value: 'testNat' },
          proto.tcpUdp,
          { ...src, options: zones[0].name },
          { ...srcIp, value: [{ value: '1.2.3.4', custom: true }] },
          { ...srcPort, value: [{ value: '80', custom: true }] },
          { ...dest, options: zones[0].name },
          { ...destIp, value: '1.2.3.4', custom: true },
          { ...destPort, options: '80' },
          { ...srcDip, value: '1.2.3.4', custom: true },
          { ...srcDport, options: '80' }
        ]
      },
      {
        tab: 'Advanced Settings',
        inputs: [{ ...extra, value: '-c' }]
      },
      {
        tab: 'Time Restrictions',
        inputs: [
          { ...weekdays, value: [{ options: 'Mon' }] },
          { ...monthdays, value: [{ options: '1' }] },
          { ...startTime, value: '01:10:10' },
          { ...stopTime, value: '10:10:10' },
          { ...startDate, value: '2050-01-20' },
          { ...stopDate, value: '2050-02-20' },
          utcTime.off
        ]
      }
    ]
    cy.setValues(endpoint, createSchema, section)
    cy.testConfigurationEdit(endpoint, schema, section)
  })
  it('Save with filled options when all depends off', () => {
    const createSchema = [
      { ...ruleName, value: 'testNat' },
      { ...src, options: zones[0].name },
      { ...dest, options: zones[0].name },
      { ...srcDip, value: '1.2.3.4', custom: true },
      { ...srcDport, options: '80' }
    ]
    const schema = [
      {
        tab: 'General Settings',
        inputs: [
          enabled.on,
          { ...ruleName, value: 'testNat' },
          proto.icmp,
          { ...src, options: zones[0].name },
          { ...srcIp, value: [{ value: '1.2.3.4', custom: true }] },
          { ...dest, options: zones[0].name },
          { ...destIp, value: '1.2.3.4', custom: true },
          { ...srcDip, value: '1.2.3.4', custom: true }
        ]
      },
      {
        tab: 'Advanced Settings',
        inputs: [{ ...extra, value: '-c' }]
      },
      {
        tab: 'Time Restrictions',
        inputs: [
          { ...weekdays, value: [{ options: 'Mon' }] },
          { ...monthdays, value: [{ options: '1' }] },
          { ...startTime, value: '01:10:10' },
          { ...stopTime, value: '10:10:10' },
          { ...startDate, value: '2050-01-20' },
          { ...stopDate, value: '2050-02-20' },
          utcTime.on
        ]
      }
    ]
    cy.setValues(endpoint, createSchema, section)
    cy.testConfigurationEdit(endpoint, schema, section)
  })
  it('Try add same section name', () => {
    const createSchema = [{ ...ruleName, value: 'testNat' }]
    cy.setValues(endpoint, createSchema, section)
    cy.clickSectionAdd()
    cy.clickEditClose()
    cy.setValues(endpoint, createSchema, section2)
    cy.clickSectionAdd()
    cy.checkMessage('Some fields are invalid')
    cy.deleteLastCreated()
  })
  it('Try add same section name in port forwards and NAT rules pages', () => {
    const createSchema = [
      { ...ruleName, value: 'testNat' },
      { ...srcDport, value: '80', custom: true }
    ]
    cy.setValues(endpoint, createSchema, section)
    cy.clickSectionAdd()
    cy.clickEditClose()
    cy.hitPage(route2)
    cy.setValues(endpoint, createSchema, section2)
    cy.clickSectionAdd()
    cy.checkMessage(`Configuration with name '${createSchema[0].value}' already exists`)
    cy.hitPage(route)
    cy.deleteLastCreated()
  })
})
