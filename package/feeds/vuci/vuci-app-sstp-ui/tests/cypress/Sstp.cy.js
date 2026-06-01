const route = '/services/vpn/sstp'
const endpoint = '/sstp/config'

let authentication = []

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/ca`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      authentication = body.success ? body.data : []
    })
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000)
    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/api/certificates/actions/generate`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          days: '3560',
          delete: '0',
          sign: '0',
          key_size: '512',
          name: 'ca',
          subject: '',
          type: 'ca'
        }
      }
    })
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000)
    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/api/certificates/actions/sign`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          ca_key: 'ca.key.pem',
          days: '3560',
          delete: '0',
          name: 'signedCA',
          req_file: 'ca.req.pem',
          type: 'ca'
        }
      }
    })
  })
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.then(() => {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/ca.key.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/ca.req.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/signedCA.cert.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  }).then(() => {
    cy.logout()
  })
})

const sstpInstanceName = 'test' + Math.floor(Math.random() * 100) + 1

const enabled = { type: 'switch', inputName: 'enabled', value: 'false' }
const serverIpAddressOrHostName = { type: 'input', inputName: 'server', value: '0.0.0.0' }
const username = { type: 'input', inputName: 'username', value: 'user' }
const password = { type: 'input', inputName: 'password', value: 'password123' }
const certificateFilesFromDevice = {
  true: { type: 'switch', inputName: 'device_files', value: 'true' },
  false: { type: 'switch', inputName: 'device_files', value: 'false' }
}

const caCertUpload = { type: 'uploadFile', inputName: 'ca', value: 'tests/cypress/fixtures/ca.cert.pem' }
const caCertSelect = { type: 'select', inputName: 'ca', options: '/etc/certificates/signedCA.cert.pem', value: 'signedCA.cert.pem' }

const defaultRoute = {
  true: { type: 'switch', inputName: 'defaultroute', value: 'true' },
  false: { type: 'switch', inputName: 'defaultroute', value: 'false' }
}
const authOptions = { type: 'input', inputName: 'sstp_options_0' }

describe('SSTP end to end tests', () => {
  describe('Instance basic configuration tests', () => {
    it('Configures instance with everything disabled and filled', () => {
      const schema = [enabled, serverIpAddressOrHostName, username, password, certificateFilesFromDevice.false, caCertUpload, defaultRoute.false]
      if (authentication.length > 0) {
        authOptions.options = authentication[0][0]
        authOptions.value = authentication[0][1]
        schema.splice(7, 0)
      }
      cy.get('input[id=id]').type(sstpInstanceName)
      cy.testConfigurationEdit(endpoint, schema, 'sstp')
    })
    it('Configures instance with everything enabled and filled', () => {
      const schema = [enabled, serverIpAddressOrHostName, username, password, certificateFilesFromDevice.true, caCertSelect, defaultRoute.true]
      if (authentication.length > 0) {
        authOptions.options = authentication[0][0]
        authOptions.value = authentication[0][1]
        schema.splice(7, 0)
      }
      cy.get('input[id=id]').type(sstpInstanceName)
      cy.testConfigurationEdit(endpoint, schema, 'sstp')
    })
    describe('Instance overview configuration tests', () => {
      it('Configures instance with everything disabled and filled, disables instance in overview and checks for changes in modal', () => {
        const schema = [enabled, serverIpAddressOrHostName, username, password, certificateFilesFromDevice.false, caCertUpload, defaultRoute.false]
        if (authentication.length > 0) {
          authOptions.options = authentication[0][0]
          authOptions.value = authentication[0][1]
          schema.splice(7, 0)
        }
        enabled.value = 'true'
        cy.get('input[id=id]').type(sstpInstanceName)
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
  })
})
