const route = '/services/vpn/stunnel'
const endpoint = '/stunnel/config'
const editEndpoint = '/stunnel/config'
const sectionName = 'general'
let packageInstalled = false
const overviewId = 'EnabTest'

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/packages/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      packageInstalled = body.data.includes('/usr/lib/opkg/info/stunnel.control')
      if (packageInstalled) {
        cy.request({
          method: 'POST',
          url: `${Cypress.config('baseUrl')}/api${editEndpoint}`,
          body: {
            data: {
              id: overviewId
            }
          },
          headers: {
            Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
            'Content-type': 'application/json'
          }
        }).then(() => {
          cy.request({
            method: 'PUT',
            url: `${Cypress.config('baseUrl')}/api${editEndpoint}/${overviewId}`,
            body: {
              data: {
                accept_host: 'localhost',
                accept_port: '80',
                connect: ['0.0.0.0:80', '1.1.1.1:80']
              }
            },
            headers: {
              Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
              'Content-type': 'application/json'
            }
          })
        })
      }
    })
  })
})

beforeEach(function () {
  if (!packageInstalled) this.skip()
  cy.hitPage(route)
})

after(() => {
  if (packageInstalled) {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api${editEndpoint}/${overviewId}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  }
  cy.then(() => {
    cy.logout()
  })
})

// Stunnel global settings
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const debug = { type: 'input', inputName: 'debug', value: 7 }
const useAlt = { type: 'switch', inputName: 'use_alt', value: 'true' }
const altConfigFile = { type: 'uploadFile', inputName: 'alt_config_file', value: 'tests/cypress/fixtures/StunnelConfig.txt' }

// Stunnel configuration
const instanceName = 'test' + Math.floor(Math.random() * 100) + 1

// Stunnel edit
const enabledEdit = { type: 'switch', inputName: 'enabled', value: 'true' }
const client = {
  server: { type: 'select', inputName: 'client', options: '0', value: 'Server' },
  client: { type: 'select', inputName: 'client', options: '1', value: 'Client' }
}
const acceptHost = { type: 'input', inputName: 'accept_host', value: 'localhost' }
const acceptPort = { type: 'input', inputName: 'accept_port', value: 80 }
const connect = { type: 'list', inputName: 'connect', value: ['0.0.0.0:80', '1.1.1.1:80'] }
const cipherType = {
  none: { type: 'select', inputName: 'cipher_type', options: 'none', value: 'None' },
  secure: { type: 'select', inputName: 'cipher_type', options: 'dhe_rsa', value: 'Secure' },
  custom: { type: 'select', inputName: 'cipher_type', options: 'custom', value: 'Custom' }
}
const ciphers = { type: 'list', inputName: 'ciphers', value: ['Cipher1', 'Cipher2'] }
const protocol = {
  notSpecified: { type: 'select', inputName: 'protocol', options: '', value: 'Not specified' },
  connect: { type: 'select', inputName: 'protocol', options: 'connect', value: 'Connect' },
  smtp: { type: 'select', inputName: 'protocol', options: 'smtp', value: 'SMTP' }
}
const connectAuth = {
  basic: { type: 'select', inputName: 'protocolAuthentication', options: 'basic', value: 'Basic' },
  ntlm: { type: 'select', inputName: 'protocolAuthentication', options: 'ntlm', value: 'NTLM' }
}
const smtpAuth = {
  plain: { type: 'select', inputName: 'protocolAuthentication', options: 'plain', value: 'Plain' },
  login: { type: 'select', inputName: 'protocolAuthentication', options: 'login', value: 'Login' }
}
const protocolDomain = { type: 'input', inputName: 'protocolDomain', value: 'Domain' }
const protocolHost = { type: 'input', inputName: 'protocolHost', value: 'Host' }
const protocolUsername = { type: 'input', inputName: 'protocolUsername', value: 'User' }
const protocolPassword = { type: 'input', inputName: 'protocolPassword', value: 'Password' }
const cert = { type: 'uploadFile', inputName: 'cert', value: 'tests/cypress/fixtures/ca.cert.pem' }
const key = { type: 'uploadFile', inputName: 'key', value: 'tests/cypress/fixtures/ca.cert.pem' }
const CAfile = { type: 'uploadFile', inputName: 'CAfile', value: 'tests/cypress/fixtures/ca.cert.pem' }

describe('Stunnel configuration', () => {
  describe('Overview', () => {
    it('Configuration when data is set in Stunnel global settings', function () {
      const schema = [enabled, debug, useAlt, altConfigFile]
      cy.testNamedConfiguration(endpoint, schema, sectionName)
    })
    it('Configuration when Stunnel section is enabled in Overview', function () {
      const schema = [enabled]
      cy.testNamedConfiguration(editEndpoint, schema, 'stunnels')
    })
    it('Configuration when data is set in back to default', function () {
      enabled.value = 'false'
      debug.value = 5
      useAlt.value = 'false'
      const schema = [enabled, debug, useAlt]
      cy.testNamedConfiguration(endpoint, schema, sectionName)
    })
  })
  describe('Edit', () => {
    describe('Configuration when Operating Mode is set to Server', () => {
      it('Configuration when TLS cipher is custom', function () {
        const schema = [enabledEdit, client.server, acceptHost, acceptPort, connect, cipherType.custom, ciphers, protocol.notSpecified, cert, key]
        cy.get('input[id=id]').type(instanceName)
        cy.testConfigurationEdit(editEndpoint, schema, 'stunnels')
      })
      it('Configuration when protocol is Connect', function () {
        const schema = [enabledEdit, client.server, acceptHost, acceptPort, connect, cipherType.secure, protocol.connect, connectAuth.ntlm]
        cy.get('input[id=id]').type(instanceName)
        cy.testConfigurationEdit(editEndpoint, schema, 'stunnels')
      })
      it('Configuration when protocol is SMTP', function () {
        const schema = [enabledEdit, client.server, acceptHost, acceptPort, connect, cipherType.none, protocol.smtp, smtpAuth.login]
        cy.get('input[id=id]').type(instanceName)
        cy.testConfigurationEdit(editEndpoint, schema, 'stunnels')
      })
    })
    describe('Configuration when Operating Mode is set to Client', () => {
      it('Configuration when protocol is Connect', function () {
        const schema = [
          enabledEdit,
          client.client,
          acceptHost,
          acceptPort,
          connect,
          cipherType.none,
          protocol.connect,
          connectAuth.basic,
          protocolDomain,
          protocolHost,
          protocolUsername,
          protocolPassword,
          CAfile
        ]
        cy.get('input[id=id]').type(instanceName)
        cy.testConfigurationEdit(editEndpoint, schema, 'stunnels')
      })
      it('Configuration when protocol is SMTP', function () {
        const schema = [enabledEdit, client.client, acceptHost, acceptPort, connect, cipherType.none, protocol.smtp, smtpAuth.plain, protocolUsername, protocolPassword]
        cy.get('input[id=id]').type(instanceName)
        cy.testConfigurationEdit(editEndpoint, schema, 'stunnels')
      })
    })
  })
})
