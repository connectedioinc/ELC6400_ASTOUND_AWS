const route = '/mqtt/broker'
const endpointGeneral = 'mqtt/broker/config'
const endpointBridge = 'mqtt/bridge/config'
const sectionGeneral = 'brokerData'
const sectionBridge = 'bridgeData'
let hasPackage = ''
let initialData = {}
let bridgeId = ''
let topicId = ''

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
    if (!hasPackage) return
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
          name: 'test',
          subject: '',
          type: 'ca'
        }
      }
    }).then(() => {
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/${endpointGeneral}`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        initialData = body.data
      })
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
          ca: 'test.cert.pem',
          ca_key: 'test.key.pem',
          days: '3650',
          delete: '0',
          sign: '1',
          key_size: '512',
          name: 'serverTest',
          subject: '',
          type: 'server'
        }
      }
    })

    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/api/${endpointBridge}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          connection_name: newConfName
        }
      }
    }).then(({ body }) => {
      bridgeId = body.data.id
      cy.request({
        method: 'POST',
        url: `${Cypress.config('baseUrl')}/api/mqtt/bridge/${bridgeId}/topics/config`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        },
        body: {
          data: {
            topic: 'testTopic'
          }
        }
      }).then(({ body }) => {
        topicId = body.data.id
      })
    })
  })

  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasPackage) this.skip()
  cy.hitPage(route)
})

after(() => {
  if (!hasPackage) return
  cy.then(() => {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api/${endpointGeneral}`,
      body: {
        data: initialData
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
      url: `${Cypress.config('baseUrl')}/api/certificates/config/test.cert.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  })

  cy.then(() => {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/test.key.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  })

  cy.then(() => {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/test.req.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  })

  cy.then(() => {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/serverTest.cert.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  })

  cy.then(() => {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/serverTest.key.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  })

  cy.then(() => {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/serverTest.req.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  })

  cy.then(() => {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/${endpointBridge}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          id: bridgeId
        }
      }
    })
  })

  cy.logout()
})

// General

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const localPort = { type: 'list', inputName: 'local_port', value: ['2023', '3202'] }
const allow_ra = { type: 'switch', inputName: 'allow_ra', value: 'true' }

// Broker Settings

// Security

const tls = { type: 'switch', inputName: 'use_tls_ssl', value: 'true' }
const tlsType = {
  cert: { type: 'select', inputName: 'tls_type', options: 'cert', value: 'Certificate based' },
  psk: { type: 'select', inputName: 'tls_type', options: 'psk', value: 'Pre-Shared-Key based' }
}
const requireCertificate = { type: 'switch', inputName: 'require_certificate', value: 'true' }
const deviceFiles = { type: 'switch', inputName: 'device_sec_files', value: 'true' }
const caFileUpload = { type: 'uploadFile', inputName: 'ca_file', value: 'tests/cypress/fixtures/ca.cert.pem' }
const certFileUpload = { type: 'uploadFile', inputName: 'cert_file', value: 'tests/cypress/fixtures/ca.cert.pem' }
const keyFileUpload = { type: 'uploadFile', inputName: 'key_file', value: 'tests/cypress/fixtures/ca.cert.pem' }
const caFileSelect = { type: 'select', inputName: 'ca_file', options: '/etc/certificates/test.cert.pem', value: 'test.cert.pem' }
const certFileSelect = { type: 'select', inputName: 'cert_file', options: '/etc/certificates/serverTest.cert.pem', value: 'serverTest.cert.pem' }
const keyFileSelect = { type: 'select', inputName: 'key_file', options: '/etc/certificates/test.key.pem', value: 'test.key.pem' }
const tlsVersion = { type: 'select', inputName: 'tls_version', options: 'tlsv1.1', value: 'tlsv1.1' }

const psk = { type: 'input', inputName: 'psk', value: 'ABFF' }
const identity = { type: 'input', inputName: 'identity', value: 'identity123' }

// Miscellaneous

const aclFilePath = { type: 'uploadFile', inputName: 'acl_file_path', value: 'tests/cypress/fixtures/serverfile.txt' }
const passwordFile = { type: 'uploadFile', inputName: 'password_file', value: 'tests/cypress/fixtures/serverfile.txt' }
const persistence = { type: 'switch', inputName: 'persistence', value: 'true' }
const anonymousAccess = { type: 'switch', inputName: 'anonymous_access', value: 'true' }
const maxQueuedMessages = { type: 'input', inputName: 'max_queued_messages', value: '100' }
const maxPacketSize = { type: 'input', inputName: 'max_packet_size', value: '1000' }

// Bridge settings

const newConfName = 'test' + Math.floor(Math.random() * 100) + 1

const clientEnabled = { type: 'switch', inputName: 'client_enabled', value: 'true' }
const connectionName = { type: 'input', inputName: 'connection_name', value: newConfName }
const bridgeProtocolVersion = { type: 'select', inputName: 'bridge_protocol_version', options: 'mqttv311', value: '3.1.1' }
const remoteAddr = { type: 'input', inputName: 'remote_addr', value: '1.1.1.1' }
const remotePort = { type: 'input', inputName: 'remote_port', value: '2023' }
const useRemoteTls = { type: 'switch', inputName: 'use_remote_tls', value: 'true' }
const deviceBrgFiles = { type: 'switch', inputName: 'device_brg_files', value: 'true' }
const bridgeCafileUpload = { type: 'uploadFile', inputName: 'bridge_cafile', value: 'tests/cypress/fixtures/ca.cert.pem' }
const bridgeCertfileUpload = { type: 'uploadFile', inputName: 'bridge_certfile', value: 'tests/cypress/fixtures/ca.cert.pem' }
const bridgeKeyfileUpload = { type: 'uploadFile', inputName: 'bridge_keyfile', value: 'tests/cypress/fixtures/ca.cert.pem' }
const bridgeCafileSelect = { type: 'select', inputName: 'bridge_cafile', options: '/etc/certificates/test.cert.pem', value: 'test.cert.pem' }
const bridgeCertfileSelect = { type: 'select', inputName: 'bridge_certfile', options: '/etc/certificates/serverTest.cert.pem', value: 'serverTest.cert.pem' }
const bridgeKeyfileSelect = { type: 'select', inputName: 'bridge_keyfile', options: '/etc/certificates/test.key.pem', value: 'test.key.pem' }
const bridgeTlsVersion = { type: 'select', inputName: 'bridge_tls_version', options: 'tlsv1.3', value: 'tlsv1.3' }
const useBridgeLogin = { type: 'switch', inputName: 'use_bridge_login', value: 'true' }
const remoteClientid = { type: 'input', inputName: 'remote_clientid', value: '21' }
const remoteUsername = { type: 'input', inputName: 'remote_username', value: 'user' }
const remotePassword = { type: 'input', inputName: 'remote_password', value: 'pass' }
const tryPrivate = { type: 'switch', inputName: 'try_private', value: 'true' }
const cleansession = { type: 'switch', inputName: 'cleansession', value: 'true' }
const notifications = { type: 'switch', inputName: 'notifications', value: 'true' }
const notificationsLocal = { type: 'switch', inputName: 'notifications_local', value: 'true' }
const keepaliveInterval = { type: 'input', inputName: 'keepalive_interval', value: '21' }

// Topics

const topic = { type: 'input', inputName: 'topic', value: 'testTopic' }
const direction = { type: 'select', inputName: 'direction', options: 'out', value: 'OUT' }
const qos = { type: 'select', inputName: 'qos', options: '2', value: 'Exactly once (2)' }

describe('Mqtt general configuration', () => {
  describe('General configuration', () => {
    it('Configuration when enabled', function () {
      const schema = [enabled, localPort, allow_ra]
      cy.testNamedConfiguration(endpointGeneral, schema, sectionGeneral)
    })
  })
  describe('Broker settings configuration', () => {
    describe('Security configuration', () => {
      it('Configuration when tls type is certificate based', function () {
        const schema = [tls, tlsType.cert, caFileUpload, certFileUpload, keyFileUpload, tlsVersion]
        cy.testNamedConfiguration(endpointGeneral, schema, sectionGeneral)
      })
      it('Configuration when tls type is certificate based and files are selected from the device', function () {
        const schema = [tls, tlsType.cert, requireCertificate, deviceFiles, caFileSelect, certFileSelect, keyFileSelect, tlsVersion]
        cy.testNamedConfiguration(endpointGeneral, schema, sectionGeneral)
      })
      it('Configuration when tls type is psk', function () {
        const schema = [tls, tlsType.psk, psk, identity]
        cy.testNamedConfiguration(endpointGeneral, schema, sectionGeneral)
      })
    })
    describe('Miscellaneous configuration', () => {
      it('Configuration when misc data is filled in', function () {
        const schema = [
          {
            tab: 'Miscellaneous',
            inputs: [aclFilePath, passwordFile, persistence, anonymousAccess, maxQueuedMessages, maxPacketSize]
          }
        ]
        cy.testNamedConfiguration(endpointGeneral, schema, sectionGeneral)
      })
      it('Configuration when uploads are cleared', function () {
        aclFilePath.value = []
        passwordFile.value = []
        const schema = [
          {
            tab: 'Miscellaneous',
            inputs: [aclFilePath, passwordFile]
          }
        ]
        cy.testNamedConfiguration(endpointGeneral, schema, sectionGeneral)
      })
    })
  })
})
describe('Mqtt broker configuration', () => {
  it('Configuration when mqtt broker edit uses uploaded tls/ssl', function () {
    const schema = [
      clientEnabled,
      connectionName,
      bridgeProtocolVersion,
      remoteAddr,
      remotePort,
      useRemoteTls,
      bridgeCafileUpload,
      bridgeCertfileUpload,
      bridgeKeyfileUpload,
      bridgeTlsVersion,
      tryPrivate,
      cleansession,
      notifications,
      notificationsLocal,
      keepaliveInterval
    ]
    cy.testConfigurationEditNoCreate(schema, sectionBridge, bridgeId)
  })
  it('Configuration when mqtt broker edit uses device tls/ssl', function () {
    const schema = [
      clientEnabled,
      connectionName,
      bridgeProtocolVersion,
      remoteAddr,
      remotePort,
      useRemoteTls,
      deviceBrgFiles,
      bridgeCafileSelect,
      bridgeCertfileSelect,
      bridgeKeyfileSelect,
      bridgeTlsVersion,
      tryPrivate,
      cleansession,
      notifications,
      notificationsLocal,
      keepaliveInterval
    ]
    cy.testConfigurationEditNoCreate(schema, sectionBridge, bridgeId)
  })
  it('Configuration when mqtt broker edit uses remote bridge login', function () {
    const schema = [
      clientEnabled,
      connectionName,
      remoteAddr,
      remotePort,
      useBridgeLogin,
      remoteClientid,
      remoteUsername,
      remotePassword,
      tryPrivate,
      cleansession,
      notifications,
      notificationsLocal,
      keepaliveInterval
    ]
    cy.testConfigurationEditNoCreate(schema, sectionBridge, bridgeId)
  })
})
describe('Topics configuration', () => {
  it('Configuration when ', function () {
    const schema = [topic, direction, qos]
    cy.openEdit(sectionBridge, bridgeId)
    cy.testConfigurationEditNoCreate(schema, bridgeId, topicId)
  })
})
