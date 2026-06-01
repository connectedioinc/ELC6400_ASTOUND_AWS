const route = '/mqtt/publisher'
const endpoint = '/mqtt/publisher/config'
const sectionName = 'mqtt'
let hasPackage = ''
let modemInfo = []
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
      hasPackage = body.data.includes('/usr/lib/opkg/info/mqtt_pub.control')
    })
  })

  cy.then(() => {
    if (hasPackage) {
      cy.request({
        method: 'POST',
        url: `${Cypress.config('baseUrl')}/api/certificates/actions/generate`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        },
        body: {
          data: {
            days: '3650',
            delete: '0',
            sign: '1',
            key_size: '512',
            name: 'cert',
            subject: '',
            type: 'ca'
          }
        }
      })
    }
  })

  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/modems/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      modemInfo = body.data
    })
    cy.hitPage(route)
  })

  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasPackage) this.skip()
  cy.hitPage(route)
})

after(() => {
  if (hasPackage) {
    cy.then(() => {
      cy.request({
        method: 'PUT',
        url: `${Cypress.config('baseUrl')}/api${endpoint}`,
        body: {
          data: [
            {
              id: 'general',
              enabled: '0',
              remote_port: '1883',
              remote_addr: 'www.example.com',
              tls: '0'
            }
          ]
        },
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      })
    })

    cy.then(() => {
      cy.request({
        method: 'DELETE',
        url: `${Cypress.config('baseUrl')}/api/certificates/config/cert.cert.pem`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      })
    })

    cy.then(() => {
      cy.request({
        method: 'DELETE',
        url: `${Cypress.config('baseUrl')}/api/certificates/config/cert.key.pem`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      })
    })

    cy.then(() => {
      cy.request({
        method: 'DELETE',
        url: `${Cypress.config('baseUrl')}/api/certificates/config/cert.req.pem`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      })
    })
  }

  cy.logout()
})

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const remoteAddr = { type: 'input', inputName: 'remote_addr', value: 'www.test.com' }
const remotePort = { type: 'input', inputName: 'remote_port', value: '1234' }
const username = { type: 'input', inputName: 'username', value: 'User' }
const password = { type: 'input', inputName: 'password', value: 'Pass123' }
const tls = { type: 'switch', inputName: 'tls', value: 'true' }
const tlsType = {
  cert: { type: 'select', inputName: 'tls_type', options: 'cert', value: 'Certificate based' },
  psk: { type: 'select', inputName: 'tls_type', options: 'psk', value: 'Pre-Shared-Key based' }
}
const tlsInsecure = { type: 'switch', inputName: 'tls_insecure', value: 'true' }
const caFileUpload = { type: 'uploadFile', inputName: 'cafile', value: 'tests/cypress/fixtures/ca.cert.pem' }
const certFileUpload = { type: 'uploadFile', inputName: 'certfile', value: 'tests/cypress/fixtures/ca.cert.pem' }
const keyFileUpload = { type: 'uploadFile', inputName: 'keyfile', value: 'tests/cypress/fixtures/ca.cert.pem' }
const deviceFiles = { type: 'switch', inputName: '_device_files', value: 'true' }
const caFileSelect = { type: 'select', inputName: 'cafile', options: '/etc/certificates/cert.cert.pem', value: 'cert.cert.pem' }
const certFileSelect = { type: 'select', inputName: 'certfile', options: '/etc/certificates/cert.cert.pem', value: 'cert.cert.pem' }
const keyFileSelect = { type: 'select', inputName: 'keyfile', options: '/etc/certificates/cert.key.pem', value: 'cert.key.pem' }
const psk = { type: 'input', inputName: 'psk', value: 'ABFF' }
const identity = { type: 'input', inputName: 'identity', value: 'identity123' }
const modemID = { type: 'select', inputName: 'modem_id', value: 'Primary modem', depend: modemInfo.length > 1 }

describe('Mqtt configuration', () => {
  it('Configuration when enabled', function () {
    const schema = [enabled, remoteAddr, remotePort, modemID, username, password]
    cy.testNamedConfiguration(endpoint, schema, sectionName)
  })
  it('Configuration when tls enabled', function () {
    const schema = [tls, tlsType.cert, tlsInsecure, caFileUpload, certFileUpload, keyFileUpload]
    cy.testNamedConfiguration(endpoint, schema, sectionName)
  })
  it('Configuration when tls and certificate files from device enabled', function () {
    const schema = [tls, tlsType.cert, deviceFiles, caFileSelect, certFileSelect, keyFileSelect]
    cy.testNamedConfiguration(endpoint, schema, sectionName)
  })
  it('Configuration when tls and certificate files from device enabled', function () {
    const schema = [tls, tlsType.psk, psk, identity]
    cy.testNamedConfiguration(endpoint, schema, sectionName)
  })
  it('Configuration when disabled', function () {
    enabled.value = 'false'
    remoteAddr.value = ''
    remotePort.value = ''
    username.value = ''
    password.value = ''
    tls.value = 'false'
    const schema = [enabled, remoteAddr, remotePort, modemID, username, password, tls]
    cy.testNamedConfiguration(endpoint, schema, sectionName)
  })
  it('Configuration when tls and without certificate file when enabled', function () {
    caFileUpload.value = ''
    remoteAddr.value = 'www.test.com'
    remotePort.value = '1883'
    tls.value = 'true'
    enabled.value = 'true'
    const schema = [enabled, remoteAddr, remotePort, modemID, tls, tlsType.cert]
    cy.testNamedConfiguration(endpoint, schema, sectionName, 'Missing required file: CA file')
  })
  it('Configuration with empty hostname option when enabled', function () {
    remoteAddr.value = ''
    const schema = [enabled, remoteAddr, remotePort, modemID]
    cy.testNamedConfiguration(endpoint, schema, sectionName, 'Some fields are invalid')
  })
  it('Configuration with empty port option when enabled', function () {
    remoteAddr.value = 'www.test.com'
    remotePort.value = ''
    const schema = [enabled, remoteAddr, remotePort, modemID]
    cy.testNamedConfiguration(endpoint, schema, sectionName, 'Some fields are invalid')
  })
  it('Configuration with empty psk option when enabled and tls turned on', function () {
    remotePort.value = '1883'
    psk.value = ''
    const schema = [enabled, remoteAddr, remotePort, modemID, tls, tlsType.psk, psk, identity]
    cy.testNamedConfiguration(endpoint, schema, sectionName, 'Some fields are invalid')
  })
  it('Configuration with empty identity option when enabled and tls turned on', function () {
    psk.value = 'ABFF'
    identity.value = ''
    const schema = [enabled, remoteAddr, remotePort, modemID, tls, tlsType.psk, psk, identity]
    cy.testNamedConfiguration(endpoint, schema, sectionName, 'Some fields are invalid')
  })
})
