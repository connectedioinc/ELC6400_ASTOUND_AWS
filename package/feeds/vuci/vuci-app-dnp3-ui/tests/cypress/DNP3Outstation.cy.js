const route = '/services/dnp3/dnp_outstation'
const endpoint = '/dnp3/outstation/config'
before(() => {
  cy.login()
  cy.hitPage(route)
})
after(() => {
  cy.logout()
})
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const localAddr = { type: 'input', inputName: 'local_addr', value: '1' }
const remoteAddr = { type: 'input', inputName: 'remote_addr', value: '1' }
const unsolicitedEnabled = { type: 'switch', inputName: 'unsolicited_enabled', value: 'true' }
const protocol = {
  tcp: { type: 'select', inputName: 'protocol', options: 'tcp', value: 'TCP' },
  udp: { type: 'select', inputName: 'protocol', options: 'udp', value: 'UDP' }
}
const port = { type: 'input', inputName: 'port', value: '8888' }
const udpResponseIp = { type: 'input', inputName: 'udp_response_ip', value: '1.1.1.1' }
const udpResponsePort = { type: 'input', inputName: 'udp_response_port', value: '8888' }
const allowRa = { type: 'switch', inputName: 'allow_ra', value: 'true' }

describe('DNP3 Outstation configuration', () => {
  it('test enabled onfiguration with tcp protocol', () => {
    const schema = [enabled, localAddr, remoteAddr, unsolicitedEnabled, protocol.tcp, port, allowRa]
    cy.testNamedConfiguration(endpoint, schema, 'outstation')
  })
  it('test enabled configuration with udp protocol', () => {
    const schema = [enabled, localAddr, remoteAddr, unsolicitedEnabled, protocol.udp, port, udpResponseIp, udpResponsePort, allowRa]
    cy.testNamedConfiguration(endpoint, schema, 'outstation')
  })
  it('test disabled onfiguration with tcp protocol', () => {
    const schema = [enabled, localAddr, remoteAddr, unsolicitedEnabled, protocol.tcp, port, allowRa]
    schema[0].value = 'false'
    cy.testNamedConfiguration(endpoint, schema, 'outstation')
  })
  it('test disabled configuration with udp protocol', () => {
    const schema = [enabled, localAddr, remoteAddr, unsolicitedEnabled, protocol.udp, port, udpResponseIp, udpResponsePort, allowRa]
    schema[0].value = 'false'
    cy.testNamedConfiguration(endpoint, schema, 'outstation')
  })
})
