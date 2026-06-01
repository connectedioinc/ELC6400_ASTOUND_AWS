const route = '/services/vpn/l2tp'
const endpointClient = '/l2tp/client/config'
const endpointServer = '/l2tp/server/config'
const endpointUsers = '/l2tp/users/config'

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const l2tpInstanceName = 'test' + Math.floor(Math.random() * 100) + 1

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }

//	role = client confifuration options
const server = { type: 'input', inputName: 'server', value: '0.0.0.0' }
const username = { type: 'input', inputName: 'username', value: 'test' }
const password = { type: 'input', inputName: 'password', value: '123456' }
const chapSecret = { type: 'input', inputName: 'auth', value: '123456' }
const defaultRoute = {
  true: { type: 'switch', inputName: 'defaultroute', value: 'true' },
  false: { type: 'switch', inputName: 'defaultroute', value: 'false' }
}

//	role = server configuration options
const localIp = { type: 'input', inputName: 'localip', value: '192.168.0.2' }
const remoteIpRangeBegin = { type: 'input', inputName: 'start', value: '192.168.0.20' }
const remoteIpRangeEnd = { type: 'input', inputName: 'limit', value: '192.168.0.30' }
const enableChap = { type: 'switch', inputName: 'chap', value: 'true' }

// users configuration
const l2tpClientsIp = { type: 'input', inputName: 'remoteip', value: '0.0.0.0' }

describe('L2TP configuration end to end tests', () => {
  it('Configures instance with everything enabled and filled', () => {
    const schema = [enabled, server, username, password, chapSecret, defaultRoute.true]
    cy.get('input[id=id]').type(l2tpInstanceName)
    cy.testCardConfigurationEdit(endpointClient, schema, 'l2tp')
  })
  it('Configures instance with everything enabled and user created, disables instance in overview, deletes user and checks for changes in modal', () => {
    const schema = [enabled, localIp, remoteIpRangeBegin, remoteIpRangeEnd, enableChap, chapSecret]
    const schemaUsers = [username, password, l2tpClientsIp]
    cy.get('input[id=id]').type(l2tpInstanceName)
    cy.selectValue('.type', 'service', 'Server')
    cy.clickButton('add')
    cy.waitForEditModalOpen()
    cy.clickSectionAdd('users')
    cy.setValues(null, schemaUsers)
    cy.getModal().within(() => {
      cy.setValues(endpointUsers, schema, 'users')
    })
    cy.clickEditSave()
    cy.get('div[test-id=switch-enabled]').click()
    cy.openLastCreatedEdit()
    cy.getModal().within(() => {
      enabled.value = 'false'
      cy.checkValues(endpointUsers, schemaUsers, 'users')
    })
    cy.getModal().within(() => {
      cy.clickButton('delete')
    })
    cy.get('[test-id="button-ok"]').click()
    cy.checkMessage('Configuration has been removed')
    cy.clickEditClose()
    cy.clearSection(endpointServer, 'l2tp')
  })
})
