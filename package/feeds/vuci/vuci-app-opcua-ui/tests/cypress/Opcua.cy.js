const route = '/services/opcua'
const endpointClient = '/opcua/client/config'
const endpointServers = '/opcua/server/config'
const endpointGroup = '/opcua/group/config'

before(() => {
  cy.login()
  cy.hitPage(route, endpointClient)
})

after(() => {
  enabled.value = 'false'
  const schema = [enabled]
  cy.testNamedConfiguration(endpointClient, schema, 'client')
  cy.logout()
})

const instanceName = 'test' + Math.floor(Math.random() * 100) + 1
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const name1 = { type: 'input', inputName: 'name', value: 'test' }
const url = { type: 'input', inputName: 'url', value: 'http://www.test.com' }
const timeout = { type: 'input', inputName: 'timeout', value: '5000' }
const schedule = { type: 'select', inputName: 'scheduling_type', options: '0', value: 'Period' }
const period = { type: 'input', inputName: 'period', value: '5000' }
const failure = {
  none: { type: 'select', inputName: 'fail_mode', options: '0', value: 'None' },
  some: { type: 'select', inputName: 'fail_mode', options: '1', value: 'Any' }
}
const failStore = { type: 'switch', inputName: 'fail_store', value: 'true' }
const replacement = { type: 'input', inputName: 'replacement', value: 'null' }
const prefix = { type: 'input', inputName: 'prefix', value: '[' }
const midfix = { type: 'input', inputName: 'midfix', value: ',' }
const postfix = { type: 'input', inputName: 'postfix', value: ']' }

// server node

const ns = { type: 'input', inputName: 'ns', value: '500' }
const type = { type: 'select', inputName: 'type', options: '1', value: 'String' }
const id = { type: 'input', inputName: 'node_id', value: '500' }

// value group

const server = { type: 'select', inputName: 'server', options: '1', value: 'server' }
const serverNode = { type: 'select', inputName: 'server_node', options: '2', value: 'serverNode' }

describe('OPCUA configuration', () => {
  it('opcua client configuration', () => {
    const schema = [enabled]
    cy.testNamedConfiguration(endpointClient, schema, 'client')
  })
  it('opcua servers configuration', () => {
    const schema = [enabled, name1, url, timeout]
    cy.get('[test-id="tablerow-server"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
    })
    cy.testConfigurationEdit(endpointServers, schema, 'server')
  })
  it('opcua server node configuration', () => {
    const schema = [enabled, name1, url, timeout]
    const nodeSchema = [name1, ns, type, id]
    cy.get('[test-id="tablerow-server"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
    })
    cy.intercept('POST', `/api${endpointServers}`).as('postSection')
    cy.clickSectionAdd('server')
    let sectionName = ''
    let nodeSectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-server"]').within(() => {
          cy.setValues(endpointServers, schema, sectionName)
        })
        cy.get('[test-id="tablerow-serverNodes"]').within(() => {
          cy.get('input[id=name]').type(instanceName)
        })
        cy.intercept('POST', `/api/opcua/server/${sectionName}/nodes/config`).as('postNode')
        cy.clickSectionAdd('serverNodes')
        cy.wait('@postNode').then(res => {
          nodeSectionName = res.response.body.data.id
          cy.setValues(null, nodeSchema, nodeSectionName)
        })
      })
      cy.clickEditSave()
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.checkValues(null, nodeSchema, nodeSectionName)
      })
      cy.clickEditClose()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-2"]').within(() => {
          cy.clickButton('delete')
        })
      })
      cy.get('[test-id="button-ok"]').click()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-server"]').within(() => {
          cy.checkValues(endpointServers, schema, sectionName)
        })
      })
      cy.clickEditClose()
      cy.clearSection(null, sectionName)
    })
  })
  it('opcua group configuration failure none', () => {
    const schema = [enabled, name1, schedule, period, failure.none, replacement, prefix, midfix, postfix]
    cy.get('[test-id="tablerow-group"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
    })
    cy.testConfigurationEdit(endpointGroup, schema, 'group')
  })
  it('opcua group configuration failure some', () => {
    const schema = [enabled, name1, schedule, period, failure.some, failStore, replacement, prefix, midfix, postfix]
    cy.get('[test-id="tablerow-group"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
    })
    cy.testConfigurationEdit(endpointGroup, schema, 'group')
  })
  it('opcua group value configuration', () => {
    const serverSchema = [enabled, name1, url, timeout]
    const nodeSchema = [name1, ns, type, id]
    cy.get('[test-id="tablerow-server"]').within(() => {
      cy.get('input[id=name]').type('server')
    })
    cy.intercept('POST', `/api${endpointServers}`).as('postSection')
    cy.clickSectionAdd('server')
    let serverSectionName = ''
    let nodeSectionName = ''
    cy.wait('@postSection').then(res => {
      serverSectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-server"]').within(() => {
          cy.setValues(endpointServers, serverSchema, serverSectionName)
        })
        cy.get('[test-id="tablerow-serverNodes"]').within(() => {
          cy.get('input[id=name]').type('serverNode')
        })
        cy.intercept('POST', `/api/opcua/server/${serverSectionName}/nodes/config`).as('postNode')
        cy.clickSectionAdd('serverNodes')
        cy.wait('@postNode').then(res => {
          nodeSectionName = res.response.body.data.id
          cy.setValues(null, nodeSchema, nodeSectionName)
        })
      })
      cy.clickEditSave()
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.checkValues(null, nodeSchema, nodeSectionName)
      })
      cy.clickEditClose()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-server"]').within(() => {
          cy.checkValues(endpointServers, serverSchema, serverSectionName)
        })
      })
      cy.clickEditClose()
    })
    const schema = [enabled, name1, schedule, period, failure.some, failStore, replacement, prefix, midfix, postfix]
    const valueSchema = [enabled, name1, prefix, postfix, replacement, server, serverNode]
    cy.get('[test-id="tablerow-group"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
    })
    cy.intercept('POST', `/api${endpointGroup}`).as('postGroupSection')
    cy.clickSectionAdd('group')
    let sectionName = ''
    let valueSectionName = ''
    cy.wait('@postGroupSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-group"]').within(() => {
          cy.setValues(endpointGroup, schema, sectionName)
        })
        cy.get('[test-id="tablerow-groupValue"]').within(() => {
          cy.get('input[id=name]').type(instanceName)
        })
        cy.intercept('POST', `/api/opcua/group/${sectionName}/values/config`).as('postValue')
        cy.clickSectionAdd('groupValue')
        cy.wait('@postValue').then(res => {
          valueSectionName = res.response.body.data.id
          cy.setValues(null, valueSchema, valueSectionName)
        })
      })
      cy.clickEditSave()
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.checkValues(null, valueSchema, valueSectionName)
      })
      cy.clickEditClose()
      cy.getModal().within(() => {
        cy.get(`[test-id="tablerow-${valueSectionName}"]`).within(() => {
          cy.clickButton('delete')
        })
      })
      cy.get('[test-id="button-ok"]').click()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-group"]').within(() => {
          cy.checkValues(endpointServers, schema, sectionName)
        })
      })
      cy.clickEditClose()
      cy.clearSection(null, sectionName)
      cy.clearSection(null, serverSectionName)
    })
  })
})
