const route = '/services/dnp3/tcp_client'
const endpoint = '/dnp3/tcp/config'

before(() => {
  cy.login()
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.logout()
})

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const name = { type: 'input', inputName: 'name', value: 'test' }
const ip = { type: 'input', inputName: 'ip', value: '192.168.1.1' }
const port = { type: 'input', inputName: 'port', value: '8888' }
const localAddr = { type: 'input', inputName: 'local_addr', value: '8888' }
const remoteAddr = { type: 'input', inputName: 'remote_addr', value: '8888' }
const integrityPeriod = { type: 'input', inputName: 'integrity_period', value: '59' }
const timeout = { type: 'input', inputName: 'timeout', value: '59' }
const saveToFlash = { type: 'switch', inputName: 'save_to_flash', value: 'true' }

const index = { type: 'input', inputName: 'index', value: '20' }
const count = { type: 'input', inputName: 'count', value: '20' }
const dataType = { type: 'select', inputName: 'data_type', options: '20', value: 'Counter' }

describe('DNP3 TCP Client configuration', () => {
  it('overview validation test', function () {
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.clickSectionAdd()
    let sectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.clickEditClose()
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.get(`[test-id="tablerow-${sectionName}"]`)
        .scrollIntoView()
        .within(() => {
          cy.clickSwitch('enabled', '1')
        })
      cy.overviewSave('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values')
      cy.clearSection(endpoint, sectionName)
    })
  })
  // it('test TCP client configuration', () => {
  //   const schema = [
  //     enabled,
  //     name,
  //     ip,
  //     port,
  //     localAddr,
  //     remoteAddr,
  //     integrityPeriod,
  //     timeout,
  //     saveToFlash
  //   ]
  //   cy.testConfigurationEdit(endpoint, schema, 'dnp3')
  // })
  it('test TCP client configuration', () => {
    const schema = [enabled, name, ip, port, localAddr, remoteAddr, integrityPeriod, timeout, saveToFlash]
    const schemaNewSection = [name]
    const schema2 = [index, count, dataType, enabled]
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    let requestSectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.intercept('POST', `/api/dnp3/tcp/${sectionName}/requests/config`).as('postSection2')
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-dnp3"]').within(() => {
          cy.setValues(endpoint, schema, sectionName)
        })
        cy.get(`[test-id="tablerow-${sectionName}"]`).within(() => {
          cy.setValues(endpoint, schemaNewSection, sectionName)
        })
        cy.clickButton('add')
      })
      cy.wait('@postSection2').then(res => {
        requestSectionName = res.response.body.data.id
        cy.getModal().within(() => {
          cy.get(`[test-id="tablerow-${requestSectionName}"]`).within(() => {
            cy.setValues(endpoint, schema2, requestSectionName)
          })
        })
        cy.clickEditSave()
        cy.openLastCreatedEdit()
        cy.getModal().within(() => {
          cy.get('[test-id="tablerow-dnp3"]').within(() => {
            cy.checkValues(endpoint, schema, sectionName)
          })
          cy.get(`[test-id="tablerow-${requestSectionName}"]`).within(() => {
            cy.checkValues(endpoint, schema2, requestSectionName)
          })
        })
        cy.clearSection(endpoint, requestSectionName)
        cy.clickEditSave()
        cy.clearSection(endpoint, sectionName)
      })
    })
  })
})
