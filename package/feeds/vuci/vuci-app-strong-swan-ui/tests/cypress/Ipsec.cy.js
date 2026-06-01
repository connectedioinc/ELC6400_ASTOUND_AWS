const route = '/services/vpn/ipsec'
const endpoint = '/ipsec/config'

let bindOpt = [['', 'None']]
let l2tpClients = []
let l2tpServers = []
let gre = []

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/l2tp/client/config`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      l2tpClients = body.success ? body.data.map(iface => [iface.id, `${iface.id} (L2TP)`]) : []
    })
  })
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/l2tp/server/config`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      l2tpServers = body.success ? body.data.map(iface => [iface.id, `${iface.id} (L2TP)`]) : []
    })
  })
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/gre/config`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      gre = body.success ? body.data.map(iface => [iface.id, `${iface.id} (GRE)`]) : []
      bindOpt = bindOpt.concat(l2tpClients).concat(l2tpServers).concat(gre)
    })
  })

  cy.hitPage(route, endpoint)
})

after(() => {
  cy.logout()
})

const IpsecInstanceName = 'test' + Math.floor(Math.random() * 100) + 1

//  IPSEC INSTANCE SETTINGS / general settings
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const remoteEndpoint = { type: 'input', inputName: 'gateway', value: '0.0.0.0' }
const authenticationMethod = {
  preSharedKey: { type: 'select', inputName: 'authentication_method', options: 'psk', value: 'Pre-shared key' },
  x509: { type: 'select', inputName: 'authentication_method', options: 'x509', value: 'X.509' },
  eap: { type: 'select', inputName: 'authentication_method', options: 'eap-mschapv2', value: 'EAP' },
  pkcs12: { type: 'select', inputName: 'authentication_method', options: 'pkcs12', value: 'PKCS#12' }
}

// PKCS12 fields
const pkcs12Container = { type: 'uploadFile', inputName: 'pkcs12_path', value: 'tests/cypress/fixtures/ca.cert.pem' }
const pkcs12DescryptionPassphrase = { type: 'input', inputName: 'pkcs12_decrypt', value: 'PKCS12 decryption passphrase' }

const preSharedKey = { type: 'input', inputName: 'pre_shared_key', value: '123456' }
const localIdentifier = { type: 'input', inputName: 'local_identifier', value: 'IP' }
const remoteIdentifier = { type: 'input', inputName: 'remote_identifier', value: 'FQDN' }
const multipleSecrets = {
  true: { type: 'switch', inputName: 'multiple_secrets', value: 'true' },
  false: { type: 'switch', inputName: 'multiple_secrets', value: 'false' }
}

//  certificates
const key = { type: 'uploadFile', inputName: 'key', value: 'tests/cypress/fixtures/ca.cert.pem' }
const localCertificate = { type: 'uploadFile', inputName: 'leftcert', value: 'tests/cypress/fixtures/ca.cert.pem' }
const caCertificate = { type: 'uploadFile', inputName: 'cacert', value: 'tests/cypress/fixtures/ca.cert.pem' }

//  IPSEC INSTANCE SETTINGS / advanced settings

const remoteCertificate = { type: 'uploadFile', inputName: 'rightcert', value: 'tests/cypress/fixtures/ca.cert.pem' }

//  GLOBAL SECRET SETTINGS
const idSelector = { type: 'input', inputName: 'id_selector_0', value: 'test' }
const type = { type: 'select', inputName: 'type', options: 'eap', value: 'EAP' }
const secret = { type: 'input', inputName: 'secret', value: '12345' }

//  CONNECTION SETTINGS / general settings
const mode = {
  start: { type: 'select', inputName: 'mode', options: 'start', value: 'Start' },
  add: { type: 'select', inputName: 'mode', options: 'add', value: 'Add' },
  route: { type: 'select', inputName: 'mode', options: 'route', value: 'Route' }
}
const connectionType = {
  transport: { type: 'select', inputName: 'type', options: 'transport', value: 'Transport' },
  tunnel: { type: 'select', inputName: 'type', options: 'tunnel', value: 'Tunnel' }
}
const defaultRoute = {
  true: { type: 'switch', inputName: 'defaultroute', value: 'true' },
  false: { type: 'switch', inputName: 'defaultroute', value: 'false' }
}
const localSubnet = { type: 'input', inputName: 'local_subnet_0', value: '192.168.1.1/24' }
const remoteSubnet = { type: 'input', inputName: 'remote_subnet_0', value: '192.168.1.1/24' }
const keyExchange = {
  IKEv1: { type: 'select', inputName: 'keyexchange', options: 'ikev1', value: 'IKEv1' },
  IKEv2: { type: 'select', inputName: 'keyexchange', options: 'ikev2', value: 'IKEv2' }
}
const enableXauth = {
  true: { type: 'switch', inputName: 'xauth', value: 'true' },
  false: { type: 'switch', inputName: 'xauth', value: 'false' }
}
const bindTo = { type: 'select', inputName: 'bind_to' }

//  CONNECTION SETTINGS / advanced settings
const aggressive = {
  true: { type: 'switch', inputName: 'aggressive', value: 'true' },
  false: { type: 'switch', inputName: 'aggressive', value: 'false' }
}
const forceEncapsulation = {
  true: { type: 'switch', inputName: 'forceencaps', value: 'true' },
  false: { type: 'switch', inputName: 'forceencaps', value: 'false' }
}
const localFirewall = {
  true: { type: 'switch', inputName: 'local_firewall', value: 'true' },
  false: { type: 'switch', inputName: 'local_firewall', value: 'false' }
}
const remoteFirewall = {
  true: { type: 'switch', inputName: 'remote_firewall', value: 'true' },
  false: { type: 'switch', inputName: 'remote_firewall', value: 'false' }
}
const compabilityMode = {
  true: { type: 'switch', inputName: 'comp_mode', value: 'true' },
  false: { type: 'switch', inputName: 'comp_mode', value: 'false' }
}
const inactivity = { type: 'input', inputName: 'inactivity', value: '1' }
const deadPerDetection = {
  true: { type: 'switch', inputName: 'dpd', value: 'true' },
  false: { type: 'switch', inputName: 'dpd', value: 'false' }
}

const dpdAction = {
  restart: { type: 'select', inputName: 'dpdaction', options: 'restart', value: 'Restart' },
  hold: { type: 'select', inputName: 'dpdaction', options: 'hold', value: 'Hold' },
  clear: { type: 'select', inputName: 'dpdaction', options: 'clear', value: 'Clear' },
  none: { type: 'select', inputName: 'dpdaction', options: 'none', value: 'None' }
}
const dpdDelay = { type: 'input', inputName: 'dpddelay', value: '30' }
const dpdTimeout = { type: 'input', inputName: 'dpdtimeout', value: '150' }
const remoteSourceIp = { type: 'input', inputName: 'remote_sourceip_0', value: '10.0.2.0/24' }
const localSourceIp = { type: 'input', inputName: 'local_sourceip', value: '10.0.1.0' }
const remoteDNS = { type: 'input', inputName: 'rightdns_0', value: '8.8.8.8' }
const xauthIdentity = { type: 'input', inputName: 'xauth_identity', value: 'xauthIdentity' }
const locallyAllowedProtocols = { type: 'input', inputName: 'leftprotoport', value: 'tcp' }
const remotelyAllowedProtocols = { type: 'input', inputName: 'rightprotoport', value: 'tcp' }
const customOption = { type: 'input', inputName: 'custom_0', value: 'reqid=1' }
const passthroughInterfaces = { type: 'multiselect', inputName: 'passthrough', value: [{ options: 'wan', value: 'wan' }] }
const passthroughSubnets = { type: 'input', inputName: 'passthrough_ip_0', value: '10.0.2.0/24' }
const flushConntrack = {
  true: { type: 'switch', inputName: 'flush', value: 'true' },
  false: { type: 'switch', inputName: 'flush', value: 'false' }
}

//  PROPOSAL SETTINGS
const encryption = { type: 'select', inputName: 'encryptionAlgorithm', options: 'des', value: 'DES' }
const authentication = { type: 'select', inputName: 'authentication', options: 'md5', value: 'MD5' }
const dhGroup = { type: 'select', inputName: 'dhGroup', options: 'modp768', value: 'MODP768' }

const hash = { type: 'select', inputName: 'hash', options: 'md5', value: 'MD5' }
const pfsGroup = { type: 'select', inputName: 'pfsGroup', options: 'modp768', value: 'MODP768' }

const forceCryptoProposal = { type: 'switch', inputName: 'force_crypto_proposal', value: 'true' }
const forceCryptoProposal2 = { type: 'switch', inputName: 'force_crypto_proposal2', value: 'true' }

const IkeLifetime = { type: 'input', inputName: 'ikelifetime', value: '3h' }
const lifetime = { type: 'input', inputName: 'lifetime', value: '3h' }

function ipSecInstanceAdvancedSettings(endpoint, schema, authenticationMethod) {
  cy.intercept('POST', `/api${endpoint}`).as('postSection')
  cy.clickSectionAdd()
  cy.wait('@postSection').then(() => {
    cy.waitForEditModalOpen()
    cy.getModal().within(() => {
      cy.selectValue(authenticationMethod.inputName, authenticationMethod.options, authenticationMethod.value)
      cy.get('[test-id="tablerow-ipsec"]').within(() => {
        cy.get('.inner-tab-item').contains('Advanced settings').click()
      })
      cy.setValues(null, schema)
    })
    cy.clickEditSave()
    cy.openLastCreatedEdit()
    cy.getModal().within(() => {
      cy.get('[test-id="tablerow-ipsec"]').within(() => {
        cy.get('.inner-tab-item').contains('Advanced settings').click()
      })
      cy.checkValues(null, schema)
    })
    cy.clickEditClose()
    cy.clearSection(endpoint, 'ipsec')
  })
}

function editConfigurationProposalPhase2(endpoint, schema, section) {
  cy.intercept('POST', `/api${endpoint}`).as('postSection')
  cy.clickSectionAdd(section)
  cy.wait('@postSection').then(() => {
    cy.waitForEditModalOpen()
    cy.getModal().within(() => {
      cy.scrollTo('bottom')
      cy.get('.inner-tab-item').contains('Phase 2').click()
      cy.setValues(null, schema)
    })
    cy.clickEditSave()
    cy.openLastCreatedEdit()
    cy.getModal().within(() => {
      cy.scrollTo('bottom')
      cy.get('.inner-tab-item').contains('Phase 2').click()
      cy.checkValues(null, schema)
    })
    cy.clickEditClose()
    cy.clearSection(null, 'ipsec')
  })
}

describe('IPSEC configuration end to end tests', () => {
  describe('Instance basic configuration tests (with and without "global secrets settings")', () => {
    describe('"Authentication method" = "Pre-shared key"', () => {
      it('"Multiple secrets" = "off"', () => {
        const schema = [enabled, remoteEndpoint, authenticationMethod.preSharedKey, preSharedKey, localIdentifier, remoteIdentifier, multipleSecrets.false]
        cy.get('input[id=id]').type(IpsecInstanceName)
        cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
      })
      it('"Multiple secrets" = "on", creates "secret"', () => {
        const schema = [enabled, remoteEndpoint, authenticationMethod.preSharedKey, localIdentifier, remoteIdentifier, multipleSecrets.true]
        const schemaSecrets = [idSelector, type, secret]
        cy.get('input[id=id]').type(IpsecInstanceName)
        cy.intercept('POST', `/api${endpoint}`).as('postSection')
        cy.clickSectionAdd()
        cy.wait('@postSection').then(() => {
          cy.waitForEditModalOpen()
          cy.getModal().within(() => {
            cy.setValues(endpoint, schema)
            cy.clickSectionAdd('secrets')
            cy.get('[id="section-global-secrets-settings"]').within(() => {
              cy.setValues(null, schemaSecrets)
            })
          })
          cy.clickEditSave()
          cy.openLastCreatedEdit()
          cy.getModal().within(() => {
            cy.checkValues(endpoint, schema)
            cy.get('[id="section-global-secrets-settings"]').within(() => {
              cy.checkValues(null, schemaSecrets)
              cy.clickButton('delete')
            })
          })
          cy.get('[test-id="button-ok"]').click()
          cy.clickEditClose()
          cy.clearSection(endpoint, 'ipsec')
        })
      })
    })
    describe('"Authentication method" = "X.509"', () => {
      it('"General settings"', () => {
        const schema = [enabled, remoteEndpoint, authenticationMethod.x509, key, localCertificate, caCertificate, localIdentifier, remoteIdentifier]
        cy.get('input[id=id]').type(IpsecInstanceName)
        cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
      })
      it('"Advanced settings"', () => {
        const schema = [remoteCertificate]
        cy.get('input[id=id]').type(IpsecInstanceName)
        ipSecInstanceAdvancedSettings(endpoint, schema, authenticationMethod.x509)
      })
    })
    describe('"Authentication method" = "EAP"', () => {
      it('"General settings"', () => {
        const schema = [enabled, remoteEndpoint, authenticationMethod.eap, key, localCertificate, caCertificate, localIdentifier, remoteIdentifier]
        cy.get('input[id=id]').type(IpsecInstanceName)
        cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
      })
    })
    describe('"Authentication method" = "PKCS#12"', () => {
      it('"Multiple secrets" = "off"', () => {
        const schema = [enabled, remoteEndpoint, authenticationMethod.pkcs12, pkcs12Container, pkcs12DescryptionPassphrase, localIdentifier, remoteIdentifier, multipleSecrets.false]
        cy.get('input[id=id]').type(IpsecInstanceName)
        cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
      })
      it('"Multiple secrets" = "on", creates "secret"', () => {
        const schema = [enabled, remoteEndpoint, authenticationMethod.pkcs12, pkcs12Container, pkcs12DescryptionPassphrase, localIdentifier, remoteIdentifier, multipleSecrets.true]
        const schemaSecrets = [idSelector, type, secret]
        cy.get('input[id=id]').type(IpsecInstanceName)
        cy.intercept('POST', `/api${endpoint}`).as('postSection')
        cy.clickSectionAdd()
        cy.wait('@postSection').then(() => {
          cy.waitForEditModalOpen()
          cy.getModal().within(() => {
            cy.setValues(endpoint, schema)
            cy.clickSectionAdd('secrets')
            cy.get('[id="section-global-secrets-settings"]').within(() => {
              cy.setValues(null, schemaSecrets)
            })
          })
          cy.clickEditSave()
          cy.openLastCreatedEdit()
          cy.getModal().within(() => {
            cy.checkValues(endpoint, schema)
            cy.get('[id="section-global-secrets-settings"]').within(() => {
              cy.checkValues(null, schemaSecrets)
              cy.clickButton('delete')
            })
          })
          cy.get('[test-id="button-ok"]').click()
          cy.clickEditClose()
          cy.clearSection(endpoint, 'ipsec')
        })
      })
    })
    it('Instance with "enable" = "on", disables instance in overview and checks for changes in modal ', () => {
      const schema = [enabled, preSharedKey]
      cy.get('input[id=id]').type(IpsecInstanceName)
      cy.intercept('POST', `/api${endpoint}`).as('postSection')
      cy.clickSectionAdd()
      cy.wait('@postSection').then(() => {
        cy.waitForEditModalOpen()
        cy.getModal().within(() => {
          cy.setValues(endpoint, schema)
        })
        cy.clickEditSave()
        cy.get('div[test-id=switch-enabled]').click()
        cy.openLastCreatedEdit()
        cy.getModal().within(() => {
          enabled.value = 'false'
          cy.checkValues(endpoint, schema)
        })
        cy.clickEditClose()
        cy.clearSection(endpoint, 'ipsec')
      })
    })
  })
  describe('Instance\'s "Connection settings" configuration tests', () => {
    describe('"General settings"', () => {
      describe('"Type" = "Tunnel"', () => {
        describe('"Default route" = "false"', () => {
          it('"Key exchange" = "IKEv1"', () => {
            const schema = [preSharedKey, mode.start, connectionType.tunnel, defaultRoute.false, localSubnet, remoteSubnet, keyExchange.IKEv1, enableXauth.true]
            cy.get('input[id=id]').type(IpsecInstanceName)
            cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
          })
          it('"Key exchange" = "IKEv2"', () => {
            const schema = [preSharedKey, mode.add, connectionType.tunnel, defaultRoute.false, localSubnet, remoteSubnet, keyExchange.IKEv2]
            cy.get('input[id=id]').type(IpsecInstanceName)
            cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
          })
        })
        describe('"Default route" = "true"', () => {
          it('"Key exchange" = "IKEv1"', () => {
            const schema = [preSharedKey, mode.route, connectionType.tunnel, defaultRoute.false, keyExchange.IKEv1, enableXauth.true]
            cy.get('input[id=id]').type(IpsecInstanceName)
            cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
          })
          it('"Key exchange" = "IKEv2"', () => {
            const schema = [preSharedKey, mode.start, connectionType.tunnel, defaultRoute.false, localSubnet, remoteSubnet, keyExchange.IKEv2]
            cy.get('input[id=id]').type(IpsecInstanceName)
            cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
          })
        })
      })
      describe('"Type" = "Transport"', () => {
        it('"Key exchange" = "IKEv1"', () => {
          const schema = [preSharedKey, mode.add, connectionType.transport, bindTo, keyExchange.IKEv1, enableXauth]
          bindTo.options = bindOpt[0][0]
          bindTo.value = bindOpt[0][1]
          cy.get('input[id=id]').type(IpsecInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
        })
        it('"Key exchange" = "IKEv2"', () => {
          const schema = [preSharedKey, mode.route, connectionType.transport, bindTo, keyExchange.IKEv2]
          bindTo.options = bindOpt[0][0]
          bindTo.value = bindOpt[0][1]
          cy.get('input[id=id]').type(IpsecInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
        })
      })
    })
    describe('"Advanced settings"', () => {
      it('"Dead peer detection" = "false"', () => {
        const schema = [
          {
            tab: 'General settings',
            inputs: [enabled]
          },
          {
            tab: 'Advanced settings',
            inputs: [
              preSharedKey,
              aggressive.true,
              forceEncapsulation.true,
              localFirewall.true,
              remoteFirewall.true,
              compabilityMode.true,
              inactivity,
              deadPerDetection.false,
              remoteSourceIp,
              localSourceIp,
              remoteDNS,
              xauthIdentity,
              locallyAllowedProtocols,
              remotelyAllowedProtocols,
              customOption,
              passthroughInterfaces,
              passthroughSubnets,
              flushConntrack.true
            ]
          }
        ]
        cy.get('input[id=id]').type(IpsecInstanceName)
        cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
      })
      it('"Dead peer detection" = "true"', () => {
        const schema = [
          {
            tab: 'General settings',
            inputs: [enabled]
          },
          {
            tab: 'Advanced settings',
            inputs: [
              preSharedKey,
              aggressive.true,
              forceEncapsulation.true,
              localFirewall.true,
              remoteFirewall.true,
              compabilityMode.true,
              inactivity,
              deadPerDetection.true,
              dpdAction.hold,
              dpdDelay,
              dpdTimeout,
              remoteSourceIp,
              localSourceIp,
              remoteDNS,
              xauthIdentity,
              locallyAllowedProtocols,
              remotelyAllowedProtocols,
              customOption,
              passthroughInterfaces,
              passthroughSubnets,
              flushConntrack.true
            ]
          }
        ]
        cy.get('input[id=id]').type(IpsecInstanceName)
        cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
      })
    })
  })
  describe('Instance\'s "Proposal settings" configuration tests', () => {
    it('"Phase 1"', () => {
      const schema = [preSharedKey, authentication, dhGroup, forceCryptoProposal, IkeLifetime]
      cy.get('input[id=id]').type(IpsecInstanceName)
      cy.testCardConfigurationEdit(endpoint, schema, 'ipsec')
    })
    it('"Phase 2"', () => {
      const schema = [preSharedKey, encryption, hash, pfsGroup, forceCryptoProposal2, lifetime]
      cy.get('input[id=id]').type(IpsecInstanceName)
      editConfigurationProposalPhase2(endpoint, schema, 'ipsec')
    })
  })
})
