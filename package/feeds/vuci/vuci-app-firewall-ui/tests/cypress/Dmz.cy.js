const route = '/network/dmz'
const endpoint = 'dmz/config/general'

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const enabled = {
  on: { type: 'switch', inputName: 'enabled', value: 'true' },
  off: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const hostIP = { type: 'select', inputName: 'host_ip', value: '1.2.3.4', custom: true }
const protocol = {
  all: { type: 'multiselect', inputName: 'proto', value: [{ options: 'all', value: 'All' }] },
  tcpUdp: {
    type: 'multiselect',
    inputName: 'proto',
    value: [
      { options: 'tcp', value: 'TCP' },
      { options: 'udp', value: 'UDP' }
    ]
  },
  icmp: { type: 'multiselect', inputName: 'proto', value: [{ options: 'icmp', value: 'ICMP' }] }
}
const ports = { type: 'select', inputName: 'port_range', value: '7777-9999', custom: true }

describe('DMZ configuration', () => {
  it('Enables DMZ with TPC+UDP protocol', () => {
    const schema = [enabled.on, hostIP, protocol.tcpUdp, ports]
    cy.testNamedConfiguration(endpoint, schema, 'firewallDmz')
  })
  it('Enables DMZ with all protocol', () => {
    const schema = [enabled.on, hostIP, protocol.all]
    cy.testNamedConfiguration(endpoint, schema, 'firewallDmz')
  })
  it('Enables DMZ with ICMP protocol', () => {
    const schema = [enabled.on, hostIP, protocol.icmp]
    cy.testNamedConfiguration(endpoint, schema, 'firewallDmz')
  })
  it('Disables DMZ', () => {
    const schema = [enabled.off]
    cy.testNamedConfiguration(endpoint, schema, 'firewallDmz')
  })
})
