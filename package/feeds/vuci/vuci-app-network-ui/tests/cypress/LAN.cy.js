import { fields } from './InterfaceFields'

const route = '/status/network/lan'
const route2 = '/network/lan'
const statusEndpoint = '/api/bulk'
const interfacesEndpoint = '/interfaces/config'

before(() => {
  cy.login()
})

after(() => {
  cy.logout()
})

const fillInterfaceName = name => {
  cy.get('[test-id="tablerow-interfaces"]').within(() => {
    cy.get('input[id=id]').type(name)
  })
}

const testStatus = (schema, name, expectedCount) => {
  cy.hitPage(route2)
  fillInterfaceName(name)
  cy.editConfiguration(interfacesEndpoint, schema, 'interfaces', () => {})
  cy.visit(route)
  cy.waitForContentLoad()
  cy.intercept('POST', statusEndpoint).as('postBulk')
  cy.wait('@postBulk').then(res => {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200)
    cy.checkIfReady('Failed to get network LAN data')
    cy.checkIfReady('Failed to load DHCP servers status')
    expect(res.response.body.data[0].data.filter(iface => iface.ifname === 'br-lan').length).to.eq(expectedCount)
    cy.hitPage(route2)
    cy.deleteLastCreated()
  })
}

describe('LAN status', () => {
  it('Check LAN information', () => {
    cy.hitPage(route2)
    cy.intercept('POST', statusEndpoint).as('postBulk')
    cy.wait('@postBulk').then(res => {
      expect(res.response.body.success).to.eq(true)
    })
  })
  it('Check LAN information with static interface and no physical interface', () => {
    const schema = [
      {
        tab: 'General Settings',
        inputs: [fields.proto.static, fields.ipaddr]
      },
      {
        tab: 'Advanced Settings',
        inputs: [fields.metric]
      }
    ]
    testStatus(schema, 'testStaticNo', 1)
  })
  it('Check LAN information with proto none interface', () => {
    const schema = [
      {
        tab: 'General Settings',
        inputs: [fields.proto.none]
      },
      {
        tab: 'Advanced Settings',
        inputs: [fields.metric]
      },
      {
        tab: 'Physical Settings',
        inputs: [fields.lanIfname]
      }
    ]
    testStatus(schema, 'testNone', 2)
  })
  it('Check LAN information with static interface', () => {
    const schema = [
      {
        tab: 'General Settings',
        inputs: [fields.proto.static, fields.ipaddr]
      },
      {
        tab: 'Advanced Settings',
        inputs: [fields.metric]
      },
      {
        tab: 'Physical Settings',
        inputs: [fields.lanIfname]
      }
    ]
    testStatus(schema, 'testStatic', 2)
  })
})
