const route = '/services/vpn/zerotier'
const endpoint = '/zerotier/config'

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const zerotierInstaceName = 'test' + Math.floor(Math.random() * 100) + 1

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const port = { type: 'input', inputName: 'port', value: '9993' }
const networkId = { type: 'input', inputName: 'network_id', value: '1234567890123456' }
const allowDefaultRoute = { type: 'switch', inputName: 'allow_default', value: 'true' }
const allowGlobalIp = { type: 'switch', inputName: 'allow_global', value: 'true' }
const allowManagedIp = { type: 'switch', inputName: 'allow_managed', value: 'true' }
const allowDns = { type: 'switch', inputName: 'allow_dns', value: 'true' }

describe('Zerotier configuration end to end tests', () => {
  describe('Instance basic configuration tests', () => {
    it('Basic instance creation', () => {
      const schema = [enabled]
      cy.get('input[test-id="input-name"]').type(zerotierInstaceName)
      cy.testConfigurationEdit(endpoint, schema, 'zerotier')
    })
    it('Configures instance with enable = true, disables instance in overview and checks for changes in modal', () => {
      const schema = [enabled]
      cy.get('input[test-id="input-name"]').type(zerotierInstaceName)
      cy.intercept('POST', `/api${endpoint}`).as('postSection')
      let sectionName = ''
      cy.clickSectionAdd()
      cy.wait('@postSection').then(res => {
        sectionName = res.response.body.data.id
        cy.waitForEditModalOpen()
        cy.getModal().within(() => {
          cy.setValues(endpoint, schema, sectionName)
        })
        cy.clickEditSave()
        cy.get('div[test-id=switch-enabled]').click()
        cy.openLastCreatedEdit()
        cy.getModal().within(() => {
          enabled.value = 'false'
          cy.checkValues(endpoint, schema, sectionName)
        })
        cy.clickEditClose()
        cy.clearSection(endpoint, sectionName)
      })
    })
  })
  describe("Instance's networks configuration tests", () => {
    it('Instance creation with everything enabled', function () {
      cy.get('input[test-id="input-name"]').type(zerotierInstaceName)
      cy.intercept('POST', `/api${endpoint}`).as('postSection')
      enabled.value = 'true'
      let sectionName = ''
      let networksSectionName = ''
      cy.clickSectionAdd('zerotier')
      cy.wait('@postSection').then(res => {
        sectionName = res.response.body.data.id
        cy.waitForEditModalOpen()
        cy.intercept('POST', `/api/zerotier/config/${sectionName}/networks`).as('postSectionNetworks')
        cy.getModal().within(() => {
          cy.get('input[test-id="input-name"]').type('testNetworks')
        })
        cy.clickSectionAdd('zerotier_networks')
        cy.wait('@postSectionNetworks').then(res => {
          networksSectionName = res.response.body.data.id
          const schemaNetworks = [enabled, port, networkId, allowDefaultRoute, allowGlobalIp, allowManagedIp, allowDns]
          cy.getModal().within(() => {
            cy.setValues(`services/tcp/config/${sectionName}/networks`, schemaNetworks, networksSectionName)
          })
          cy.clickEditSave()
          cy.openLastCreatedEdit()
          cy.getModal().within(() => {
            cy.checkValues(`services/zerotier/tcp/config/${sectionName}/networks`, schemaNetworks, networksSectionName)
          })
          cy.clickEditSave()
          cy.clearSection(null, networksSectionName)
          cy.clickEditSave()
          cy.clearSection(endpoint, sectionName)
        })
      })
    })
    it('Instance creation enable = true, disables instance in Zerotier instance modal and checks for changes in modal', function () {
      cy.get('input[test-id="input-name"]').type(zerotierInstaceName)
      cy.intercept('POST', `/api${endpoint}`).as('postSection')
      let sectionName = ''
      let networksSectionName = ''
      enabled.value = 'true'
      cy.clickSectionAdd('zerotier')
      cy.wait('@postSection').then(res => {
        sectionName = res.response.body.data.id
        cy.waitForEditModalOpen()
        cy.intercept('POST', `/api/zerotier/config/${sectionName}/networks`).as('postSectionNetworks')
        cy.getModal().within(() => {
          cy.get('input[test-id="input-name"]').type('testNetworks')
        })
        cy.clickSectionAdd('zerotier_networks')
        cy.wait('@postSectionNetworks').then(res => {
          networksSectionName = res.response.body.data.id
          const schemaNetworks = [enabled, networkId]
          cy.getModal().within(() => {
            cy.setValues(`zerotier/tcp/config/${sectionName}/networks`, schemaNetworks, networksSectionName)
          })
          cy.clickEditSave(' Configuration has been applied ')
          cy.get('div[test-id=tablerow-zerotier_networks]').within(() => {
            cy.get('div[test-id=switch-enabled]').click()
          })
          cy.clickEditSave(' Configuration has been applied ')
          cy.openLastCreatedEdit()
          cy.openLastCreatedEdit()
          cy.getModal().within(() => {
            enabled.value = 'false'
            cy.checkValues(`zerotier/tcp/config/${sectionName}/networks`, schemaNetworks, networksSectionName)
          })
          cy.clickEditSave(' Configuration has been applied ')
          cy.clearSection(null, networksSectionName)
          cy.clickEditSave(' Configuration has been applied ')
          cy.clearSection(endpoint, sectionName)
        })
      })
    })
  })
})
