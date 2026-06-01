const route = '/system/admin/datetime/ntpd'
const endpoint = '/date_time/ntpd/config'

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api/date_time/ntp/server/config/general`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          enabled: '0'
        }
      }
    })
  })
  cy.then(() => {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api/date_time/ntpd/config/general`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          '.type': 'timeserver',
          enable_server: '1',
          enabled: '1',
          file_flag: '0',
          id: 'general',
          server: ['test.com', 'example.com', 'text2.com', 'text3.com']
        }
      }
    })
  })
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.logout()
})

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const fileFlag = { type: 'switch', inputName: 'file_flag', value: 'false' }
const enableFileFlag = { type: 'switch', inputName: 'file_flag', value: 'true' }
const file = { type: 'uploadText', inputName: 'config_file', value: ' ' }
const server = { type: 'list', inputName: 'server', value: ['test.com', 'example.com'] }
const server2 = { type: 'list', inputName: 'server', value: ['test.example.com'] }
const enableServer = { type: 'switch', inputName: 'enable_server', value: 'true' }

describe('NTPD configuration', () => {
  it('Enables NTPD and server and disables NTP config from file', () => {
    cy.get('[test-id="listremove-server_3"]').click()
    cy.get('[test-id="listremove-server_2"]').click()
    cy.get('[test-id="listremove-server_1"]').click()
    const schema = [enabled, fileFlag, server, enableServer]
    cy.testNamedConfiguration(endpoint, schema, 'general')
  })
  it('Enables NTPD and set config from file', () => {
    const schema = [enabled, enableFileFlag, file]
    cy.testNamedConfiguration(endpoint, schema, 'general')
  })
  it('Disables everything', () => {
    enabled.value = 'false'
    enableServer.value = 'false'
    const schema = [enabled, fileFlag, server2, enableServer]
    cy.testNamedConfiguration(endpoint, schema, 'general')
  })
})
