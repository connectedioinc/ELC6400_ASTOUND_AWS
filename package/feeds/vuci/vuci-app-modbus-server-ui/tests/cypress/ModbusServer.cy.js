const route = '/services/modbus/modbus_server'
const endpoint = '/modbus/server/tcp/config'

before(() => {
  cy.login()
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.logout()
})

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const port = { type: 'input', inputName: 'port', value: '502' }
const deviceId = { type: 'input', inputName: 'device_id', value: '2' }
const allowRa = { type: 'switch', inputName: 'allow_ra', value: 'true' }
const keepconn = { type: 'switch', inputName: 'keepconn', value: 'true' }
const timeout = { type: 'input', inputName: 'timeout', value: '10' }
const clientregs = { type: 'switch', inputName: 'clientregs', value: 'false' }
const mobileData = {
  bytes: { type: 'select', inputName: 'md_data_type', options: '0', value: 'Bytes' },
  kilobytes: { type: 'select', inputName: 'md_data_type', options: '1', value: 'Kilobytes' },
  megabytes: { type: 'select', inputName: 'md_data_type', options: '2', value: 'Megabytes' }
}

// Custom register block
const regfile = { type: 'input', inputName: 'regfile', value: '/tmp/regfile' }
const regfilestart = { type: 'input', inputName: 'regfilestart', value: '1025' }
const regfilesize = { type: 'input', inputName: 'regfilesize', value: '128' }

describe('MODBUS TCP server  configuration', () => {
  it('Enables everything except custom register block with bytes as data-type', () => {
    const schema = [enabled, port, deviceId, mobileData.bytes, allowRa, keepconn, timeout, clientregs]
    cy.testNamedConfiguration(endpoint, schema, 'tcpServer')
  })
  it('Enables everything with kilobytes as data-type', () => {
    clientregs.value = 'true'
    const schema = [enabled, port, deviceId, mobileData.kilobytes, allowRa, keepconn, timeout, clientregs, regfile, regfilestart, regfilesize]
    cy.testNamedConfiguration(endpoint, schema, 'tcpServer')
  })
  it('Enables everything with megabytes as data-type', () => {
    clientregs.value = 'true'
    const schema = [enabled, port, deviceId, mobileData.megabytes, allowRa, keepconn, timeout, clientregs, regfile, regfilestart, regfilesize]
    cy.testNamedConfiguration(endpoint, schema, 'tcpServer')
  })
})
