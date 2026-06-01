import { fields } from './WifiInterfaceFields'

const route = '/network/wireless/ssids'
const wifiSection = 'radio0'
const endpoint = `/wireless/devices/config/${wifiSection}/interfaces`
const multiApEndpoint = '/wireless/multi_ap/config'
const multiApSection = 'multiAccessPoints'

let interfaces
before(() => {
  cy.login()
  cy.then(() => {
    cy.boardCondition(data => data.board.hwinfo.wifi)
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/wireless/devices/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      const ralink = body?.data[0].type === 'ralink'
      fields.acctServer = { ...fields.acctServer, depend: !ralink }
      fields.acctPort = { ...fields.acctPort, depend: !ralink }
      fields.acctSecret = { ...fields.acctSecret, depend: !ralink }
      fields.reassociationDeadline = { ...fields.reassociationDeadline, depend: !ralink }
    })
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/interfaces/config`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      interfaces = body.data
    })
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
          name: 'server',
          subject: '',
          type: 'server'
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
          ca: 'signedCA.cert.pem',
          ca_key: 'ca.key.pem',
          days: '3560',
          delete: '0',
          name: 'signedServer',
          req_file: 'server.req.pem',
          type: 'server'
        }
      }
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.then(() => {
    // server
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/server.key.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/signedServer.cert.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/server.req.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    // ca
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
  })
  cy.logout()
})

describe('Wireless: Interface configuration', () => {
  it('Save overview with default configuration', () => {
    cy.getTablerow(wifiSection).within(() => {
      cy.clickSectionAdd('wifiInterfaces')
      cy.clickEditClose()
    })
    cy.overviewSave()
    cy.getTablerow(wifiSection).within(() => {
      cy.deleteLastCreated()
    })
    cy.overviewSave()
  })
  it('Save with ssid and key options', () => {
    const schema = [
      {
        tab: 'General Setup',
        inputs: [{ ...fields.ssid, value: 'Custom interface' }]
      },
      {
        tab: 'Wireless Security',
        inputs: [{ ...fields.key, value: 'myPassword' }]
      }
    ]
    cy.getTablerow(wifiSection).within(() => {
      cy.testConfigurationEdit(endpoint, schema, 'wifiInterfaces')
    })
  })
  it('General: Save with access point mode, psk encription, ieee80211r and mac filtering', () => {
    cy.getTablerow(wifiSection).within(() => {
      const schema = [
        {
          tab: 'General Setup',
          inputs: [fields.enabled.off, fields.mode.ap, { ...fields.ssid, value: 'Custom interface' }, { ...fields.network, options: '' }, fields.hidden.on, fields.ieee80211r.on]
        },
        {
          tab: 'MAC-Filter',
          inputs: [fields.macfilter.allow, { ...fields.maclist, value: [{ value: '00:00:00:00:00:00', custom: true }] }]
        },
        {
          tab: 'Advanced Settings',
          inputs: [fields.isolate.on, fields.wmm.off]
        },
        {
          tab: 'Wireless Security',
          inputs: [fields.encryption.psk, { ...fields.cipher.ccmp }, { ...fields.key, value: 'myPassword' }]
        },
        {
          tab: 'Fast Transition',
          inputs: [{ ...fields.nasid, value: 'myId' }, { ...fields.mobilityDomain, value: 'cdf2' }, { ...fields.reassociationDeadline, value: '1000' }, fields.ftOverDs.overAir]
        }
      ]
      cy.testConfigurationEdit(endpoint, schema, 'wifiInterfaces')
    })
  })
  it('General: Save with access point mode, wpa encription', () => {
    cy.getTablerow(wifiSection).within(() => {
      const schema = [
        {
          tab: 'General Setup',
          inputs: [fields.mode.ap, { ...fields.ssid, value: 'Custom interface' }]
        },
        {
          tab: 'Wireless Security',
          inputs: [
            fields.encryption.wpa,
            { ...fields.authServer, value: '1.1.1.1' },
            { ...fields.authPort, value: '842' },
            { ...fields.authSecret, value: 'verysecretsecret' },
            { ...fields.acctServer, value: '2.2.2.2' },
            { ...fields.acctPort, value: '654' },
            { ...fields.acctSecret, value: 'notverysecretsecret' }
          ]
        }
      ]
      cy.testConfigurationEdit(endpoint, schema, 'wifiInterfaces')
    })
  })
  it('General: Save with client mode, wpa3 encription, uploaded encription keys', () => {
    cy.getTablerow(wifiSection).within(() => {
      const schema = [
        {
          tab: 'General Setup',
          inputs: [
            fields.enabled.off,
            fields.mode.sta,
            { ...fields.ssid, value: 'Custom interface ssid' },
            { ...fields.bssid, value: '00:00:00:00:00:00' },
            { ...fields.network, options: interfaces[0].id }
          ]
        },
        {
          tab: 'Advanced Settings',
          inputs: [fields.trm_enabled.on, fields.bgscanEnabled.off]
        },
        {
          tab: 'Wireless Security',
          inputs: [
            fields.encryption.wpa,
            fields.cipher.tkip,
            fields.eapType.tls,
            fields.devFiles.off,
            fields.caCertFile,
            fields.clientCertFile,
            fields.privKeyFile,
            fields.privKeyPwd,
            { ...fields.identity, value: 'identity' },
            { ...fields.anonymousIdentity, value: 'anonIdentity' }
          ]
        }
      ]
      cy.testConfigurationEdit(endpoint, schema, 'wifiInterfaces')
    })
  })
  it('General: Save with client mode, wpa3 encription, router encription keys', () => {
    cy.getTablerow(wifiSection).within(() => {
      const schema = [
        {
          tab: 'General Setup',
          inputs: [fields.enabled.on, fields.mode.sta, { ...fields.ssid, value: 'Custom interface' }, { ...fields.network, options: interfaces[0].id }]
        },
        {
          tab: 'Advanced Settings',
          inputs: [fields.trm_enabled.off, fields.bgscanEnabled.on]
        },
        {
          tab: 'Wireless Security',
          inputs: [fields.encryption.wpa, fields.devFiles.on, fields.caCertSelect, fields.clientCertSelect, fields.privKeySelect, fields.privKeyPwd]
        }
      ]
      cy.testConfigurationEdit(endpoint, schema, 'wifiInterfaces')
    })
  })
  it('General: Save with client mode, wpa encription, EAP-TLS authentication with inner cerfificate from upload', () => {
    cy.getTablerow(wifiSection).within(() => {
      const schema = [
        {
          tab: 'General Setup',
          inputs: [fields.enabled.on, fields.mode.sta, { ...fields.ssid, value: 'Custom interface' }, { ...fields.network, options: interfaces[0].id }]
        },
        {
          tab: 'Advanced Settings',
          inputs: [fields.bgscanEnabled.on]
        },
        {
          tab: 'Wireless Security',
          inputs: [fields.encryption.wpa, fields.eapType.fast, fields.auth.eapTls, fields.devInFiles.off, fields.caCert2File, fields.clientCert2File, fields.privKey2File, fields.privKey2Pwd]
        },
        {
          tab: 'Fast Roaming',
          inputs: [fields.bgscanMode.learn, { ...fields.shortInterval, value: '35' }, { ...fields.longInterval, value: '350' }, { ...fields.signalThresh, value: '-40' }]
        }
      ]
      cy.testConfigurationEdit(endpoint, schema, 'wifiInterfaces')
    })
  })
  it('General: Save with client mode, wpa encription, EAP-TLS authentication with inner cerfificate from router', () => {
    cy.getTablerow(wifiSection).within(() => {
      const schema = [
        {
          tab: 'General Setup',
          inputs: [fields.enabled.on, fields.mode.sta, { ...fields.ssid, value: 'Custom interface' }, { ...fields.network, options: interfaces[0].id }]
        },
        {
          tab: 'Wireless Security',
          inputs: [fields.encryption.wpa, fields.eapType.fast, fields.auth.eapTls, fields.devInFiles.on, fields.caCert2Select, fields.clientCert2Select, fields.privKey2Select, fields.privKey2Pwd]
        }
      ]
      cy.testConfigurationEdit(endpoint, schema, 'wifiInterfaces')
    })
  })
  it('Save with mesh mode and sae encription', () => {
    cy.getTablerow(wifiSection).within(() => {
      const schema = [
        {
          tab: 'General Setup',
          inputs: [fields.enabled.off, fields.mode.mesh, { ...fields.meshId, value: 'CustomMesh' }, { ...fields.network, options: interfaces[0].id }]
        },
        {
          tab: 'Advanced Settings',
          inputs: [
            fields.meshFwding.on,
            { ...fields.meshRssiThreshold, value: '1' },
            fields.shortPreamble.off,
            { ...fields.dtimPeriod, value: '2' },
            { ...fields.wpaGroupRekey, value: '610' },
            fields.skipInactivityPoll.on,
            { ...fields.maxInactivity, value: '310' },
            { ...fields.maxListenInterval, value: '10000' },
            fields.disassocLowAck.off,
            fields.wds.on
          ]
        },
        {
          tab: 'Wireless Security',
          inputs: [fields.encryption.sae, { ...fields.key, value: 'myPassword' }]
        }
      ]
      cy.testConfigurationEdit(endpoint, schema, 'wifiInterfaces')
    })
  })
  describe('Multi AP', () => {
    it('Save with advanced settings', () => {
      cy.getTablerow(wifiSection).within(() => {
        const schema = [
          {
            tab: 'General Setup',
            inputs: [fields.mode.multi_ap, { ...fields.scanTime, value: '100' }, { ...fields.network, options: interfaces[0].id }]
          },
          {
            tab: 'Advanced Settings',
            inputs: [
              fields.shortPreamble.off,
              { ...fields.dtimPeriod, value: '2' },
              { ...fields.wpaGroupRekey, value: '610' },
              fields.skipInactivityPoll.on,
              { ...fields.maxInactivity, value: '310' },
              { ...fields.maxListenInterval, value: '10000' },
              fields.disassocLowAck.off,
              fields.wds.on,
              fields.bgscanEnabled.on
            ]
          },
          {
            tab: 'Fast Roaming',
            inputs: [fields.bgscanMode.learn, { ...fields.shortInterval, value: '35' }, { ...fields.longInterval, value: '350' }, { ...fields.signalThresh, value: '-40' }]
          }
        ]
        cy.testConfigurationEdit(endpoint, schema, 'wifiInterfaces')
      })
    })
    it('Save with hand written APs', () => {
      const multiAPSchema = [
        { ...fields.multiAP.ssid, value: 'TAP100' },
        { ...fields.multiAP.key, value: 'pasword123' }
      ]
      const customTest = {
        type: 'customTest',
        executeOutsideBoth: true,
        beforeSave: () => {
          cy.getTablerow(multiApSection).within(() => {
            cy.clickSectionAdd()
            cy.setValues(multiApEndpoint, multiAPSchema, multiApSection)
          })
        },
        afterSave: () => {
          cy.getTablerow(multiApSection).within(() => {
            cy.checkValues(multiApEndpoint, multiAPSchema, multiApSection)
          })
        }
      }
      const schema = [
        {
          tab: 'General Setup',
          inputs: [fields.mode.multi_ap, { ...fields.scanTime, value: '100' }, { ...fields.network, options: interfaces[0].id }, customTest]
        }
      ]
      cy.getTablerow(wifiSection).within(() => {
        cy.testConfigurationEdit(endpoint, schema, 'wifiInterfaces')
      })
    })
    it('Save with uploaded APs', () => {
      const multiAPSchema = [
        { ...fields.multiAP.ssid, value: 'myOtherSSID' },
        { ...fields.multiAP.key, value: 'myOtherKey123' }
      ]
      const customTest = {
        type: 'customTest',
        executeOutsideAfter: true,
        beforeSave: () => {
          cy.uploadFile('ap_list', 'tests/cypress/fixtures/multiAP.txt', true)
        },
        afterSave: () => {
          cy.getTablerow(multiApSection).within(() => {
            cy.checkValues(multiApEndpoint, multiAPSchema, multiApSection)
          })
        }
      }
      const schema = [
        {
          tab: 'General Setup',
          inputs: [fields.mode.multi_ap, { ...fields.scanTime, value: '100' }, { ...fields.network, options: interfaces[0].id }, customTest]
        }
      ]
      cy.getTablerow(wifiSection).within(() => {
        cy.testConfigurationEdit(endpoint, schema, 'wifiInterfaces')
      })
    })
  })
})
