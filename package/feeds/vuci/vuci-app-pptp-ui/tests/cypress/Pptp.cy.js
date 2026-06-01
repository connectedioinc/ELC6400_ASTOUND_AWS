const route = '/services/vpn/pptp'
const endpointClient = '/pptp/client/config'
const endpointServer = '/pptp/server/config'

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const instanceName = 'test' + Math.floor(Math.random() * 100) + 1

const enabled = {
  true: { type: 'switch', inputName: 'enabled', value: 'true' },
  false: { type: 'switch', inputName: 'enabled', value: 'false' }
}

// role = client confifuration options
const server = { type: 'input', inputName: 'server', value: '0.0.0.0' }
const username = { type: 'input', inputName: 'username', value: 'test' }
const password = { type: 'input', inputName: 'password', value: '123456' }
const clientToClient = {
  true: { type: 'switch', inputName: 'client_to_client', value: 'true' },
  false: { type: 'switch', inputName: 'client_to_client', value: 'false' }
}
const defaultRoute = {
  true: { type: 'switch', inputName: 'defaultroute', value: 'true' },
  false: { type: 'switch', inputName: 'defaultroute', value: 'false' }
}

//	role = server configuration options
const localIp = { type: 'input', inputName: 'localip', value: '192.168.0.1' }
const remoteIpRangeBegin = { type: 'input', inputName: 'start', value: '192.168.0.20' }
const remoteIpRangeEnd = { type: 'input', inputName: 'limit', value: '192.168.0.30' }
const timout = { type: 'input', inputName: 'idle', value: '33' }
const primaryDns = { type: 'input', inputName: 'dns1', value: '8.8.8.8' }
const secondaryDns = { type: 'input', inputName: 'dns2', value: '8.8.8.8' }

describe('PPTP configuration end to end tests', () => {
  it.each([
    [`all inputs filled and switches enabled, except defaultRoute ${defaultRoute.false}`, [enabled.true, server, username, password, clientToClient.true, defaultRoute.false]],
    [`all inputs filled and switches disabled, except defaultRoute ${defaultRoute.true}`, [enabled.true, server, username, password, clientToClient.false, defaultRoute.true]]
  ])('Configures instance when role client, %s', (_, schema) => {
    cy.get('input[id=id]').type(instanceName)
    cy.selectValue('.type', 'interface', 'Client')
    cy.testConfigurationEdit(endpointClient, schema, 'pptp')
  })
  it('Configures instance when role server, all inputs filled and switches enabled', () => {
    cy.get('input[id=id]').type(instanceName)
    cy.selectValue('.type', 'service', 'Server')
    const serverSchema = [enabled.true, localIp, remoteIpRangeBegin, remoteIpRangeEnd, timout, primaryDns, secondaryDns]
    cy.testConfigurationEdit(endpointServer, serverSchema, 'pptp')
  })
  it('Add new user in PPTP Edit when role server', () => {
    const remoteip = { type: 'input', inputName: 'remoteip', value: '0.0.0.0' }
    const schemaUsers = [username, password, remoteip]
    cy.get('input[id=id]').type(instanceName)
    cy.selectValue('.type', 'service', 'Server')

    cy.intercept('POST', `/api${endpointServer}`).as('postSection')
    cy.selectValue('.type', 'service', 'Server')
    let sectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.clickSectionAdd('pptp_server_users')
      cy.getModal().within(() => {
        cy.setValues(null, schemaUsers, 'pptp_server_users')
      })
      cy.clickEditSave()
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.checkValues(null, schemaUsers, 'pptp_server_users')
      })
      cy.getModal().within(() => {
        cy.clickButton('delete')
      })
      cy.get('[test-id="button-ok"]').click()
      cy.checkMessage('Configuration has been removed')
      cy.clickEditClose()
      cy.clearSection(endpointServer, sectionName)
    })
  })
})
