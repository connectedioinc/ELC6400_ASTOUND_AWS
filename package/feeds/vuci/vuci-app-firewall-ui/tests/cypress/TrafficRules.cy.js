const route = 'network/firewall/rules'
const endpoint = '/firewall/traffic_rules/config'
const section = 'rules'

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

const type = {
  openPort: { type: 'select', inputName: 'type', value: 'Open ports on router' },
  forwardRule: { type: 'select', inputName: 'type', value: 'Add new forward rule' }
}
const enabled = {
  on: { type: 'switch', inputName: 'enabled', value: 'true' },
  off: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const ruleName = { type: 'input', inputName: 'name' }
const ipvFamily = {
  both: { type: 'select', inputName: 'family', value: 'IPv4 and IPv6' },
  ipv4: { type: 'select', inputName: 'family', value: 'IPv4 only' },
  ipv6: { type: 'select', inputName: 'family', value: 'IPv6 only' }
}
const proto = {
  tcpUdp: { type: 'multiselect', inputName: 'proto', value: [{ options: 'tcp udp', value: 'tcp udp', custom: true }] },
  tcp: { type: 'multiselect', inputName: 'proto', value: [{ options: 'tcp', value: 'TCP' }] },
  udp: { type: 'multiselect', inputName: 'proto', value: [{ options: 'udp', value: 'UDP' }] },
  icmp: { type: 'multiselect', inputName: 'proto', value: [{ options: 'icmp', value: 'ICMP' }] }
  // ...
}
const icmpType = { type: 'multiselect', inputName: 'icmp_type' }
const src = { type: 'select', inputName: 'src' }
const srcMac = { type: 'multiselect', inputName: 'src_mac' }
const srcIp = { type: 'multiselect', inputName: 'src_ip' }
const srcPort = { type: 'multiselect', inputName: 'src_port' }
const dest = { type: 'select', inputName: 'dest' } // depends
const destLocal = { type: 'select', inputName: 'dest_local' } // depends
const destIp = { type: 'multiselect', inputName: 'dest_ip' }
const destPort = { type: 'multiselect', inputName: 'dest_port' }
const target = {
  drop: { type: 'select', inputName: 'target', value: 'Drop' },
  accept: { type: 'select', inputName: 'target', value: 'Accept' },
  reject: { type: 'select', inputName: 'target', value: 'Reject' }
  // ...
}
const match = {
  dscp: { type: 'select', inputName: 'match', options: 'DSCP' },
  mark: { type: 'select', inputName: 'match', options: 'FWMARK' },
  none: { type: 'select', inputName: 'match', options: '' }
  // ...
}
const mark = { type: 'input', inputName: 'mark' } // depend
const dscp = {
  // depend
  CS1: { type: 'select', inputName: 'dscp', options: '8' }
}
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

describe('Firewall: Trafic rules', () => {
  it('Save with default options when type: Open ports on router', () => {
    const createSchema = [type.openPort, { ...ruleName, value: 'test1' }, proto.tcp, { ...destPort, value: [{ value: '80', custom: true }] }]
    cy.setValues(endpoint, createSchema, section)
    cy.testConfigurationEdit(endpoint, [], section)
  })
  it('Save with default options when type: Add new forward rule', () => {
    const createSchema = [type.forwardRule, { ...ruleName, value: 'test1' }, { ...src, options: zones[0].name }, { ...dest, options: zones[0].name }]
    cy.setValues(endpoint, createSchema, section)
    cy.testConfigurationEdit(endpoint, [], section)
  })
  it('Save with filled options when type: Open ports on router, proto: tcpUdp', () => {
    const createSchema = [type.openPort, { ...ruleName, value: 'test1' }, proto.tcp, { ...destPort, value: [{ value: '80', custom: true }] }]
    const schema = [
      {
        tab: 'General Settings',
        inputs: [
          enabled.on,
          { ...ruleName, value: 'test' },
          proto.tcpUdp,
          { ...src, options: '' },
          { ...srcIp, value: [{ value: '1.2.3.4', custom: true }] },
          { ...srcPort, value: [{ value: '80', custom: true }] },
          { ...destLocal, options: zones[0].name },
          { ...destIp, value: [{ value: '1.2.3.4', custom: true }] },
          target.drop
        ]
      },
      {
        tab: 'Advanced Settings',
        inputs: [ipvFamily.ipv6, { ...srcMac, value: [{ value: '00:00:00:00:00:00', custom: true }] }, match.dscp, dscp.CS1, { ...extra, value: '-c' }]
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
  it('Save with filled options when type: Add new forward rule, proto: icmp', () => {
    const createSchema = [type.forwardRule, { ...ruleName, value: 'test1' }, { ...src, options: zones[0].name }, { ...dest, options: zones[0].name }]
    const schema = [
      {
        tab: 'General Settings',
        inputs: [
          enabled.on,
          { ...ruleName, value: 'test' },
          proto.icmp,
          { ...icmpType, value: [{ options: 'echo-reply' }] },
          { ...src, options: 'lan' },
          { ...srcIp, value: [{ value: '1.2.3.4', custom: true }] },
          { ...dest, options: zones[0].name },
          { ...destIp, value: [{ value: '1.2.3.4', custom: true }] },
          target.accept
        ]
      },
      {
        tab: 'Advanced Settings',
        inputs: [ipvFamily.both, { ...srcMac, value: [{ value: '00:00:00:00:00:00', custom: true }] }, match.mark, { ...mark, value: 'ff' }, { ...extra, value: '-c' }]
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
})
