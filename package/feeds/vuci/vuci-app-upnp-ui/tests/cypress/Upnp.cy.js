const route = '/services/upnp'
const settingsEndpoint = '/upnp/settings/config'
const aclsEndpoint = '/upnp/acls/config'

before(() => {
  cy.login()
  cy.hitPage(route)
  // TODO: some tests needs Advanced mode
  // cy.then(() => {
  //   cy.request({
  //     method: 'PUT',
  //     url: `${Cypress.config('baseUrl')}/api/system/config/main`,
  //     headers: {
  //       Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
  //       'Content-type': 'application/json'
  //     },
  //     body: {
  //       data: {
  //         advanced: '1'
  //       }
  //     }
  //   })
  // })
})

after(() => {
  // TODO: some tests needs Advanced mode
  // cy.request({
  //   method: 'PUT',
  //   url: `${Cypress.config('baseUrl')}/api/system/config/main`,
  //   headers: {
  //     Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
  //     'Content-type': 'application/json'
  //   },
  //   body: {
  //     data: {
  //       advanced: '0'
  //     }
  //   }
  // })
  cy.logout()
})

// General
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const secureMode = { type: 'switch', inputName: 'secure_mode', value: 'true' }
const logOutput = { type: 'switch', inputName: 'log_output', value: 'true' }
const download = { type: 'input', inputName: 'download', value: '1024' }
const upload = { type: 'input', inputName: 'upload', value: '512' }
const port = { type: 'input', inputName: 'port', value: '5000' }

// Advanced
const systemUptime = { type: 'switch', inputName: 'system_uptime', value: 'false' }
const uuid = { type: 'input', inputName: 'uuid', value: '2c1b66d8-a205-11e9-a2a3-2a2ae2dbcce4' }
const serialNumber = { type: 'input', inputName: 'serial_number', value: '12345678' }
const modelNumber = { type: 'input', inputName: 'model_number', value: '12345678' }
const notifyInterval = { type: 'input', inputName: 'notify_interval', value: '30' }
const cleanRulesetThreshold = { type: 'input', inputName: 'clean_ruleset_threshold', value: '20' }
const cleanRulesetInterval = { type: 'input', inputName: 'clean_ruleset_interval', value: '600' }
const presentationUrl = { type: 'input', inputName: 'presentation_url', value: '192.168.1.1' }
const upnpLeaseFile = { type: 'input', inputName: 'upnp_lease_file', value: '/var/log/upnp.leases' }
const upnpLeaseFileDirectory = { type: 'input', inputName: 'upnp_lease_file', value: '/root' }
const upnpLeaseFileExists = { type: 'input', inputName: 'upnp_lease_file', value: '/etc/config/network' }

// ACLS
const comment = { type: 'input', inputName: 'comment', value: 'test' }
const extPorts = { type: 'input', inputName: 'ext_ports', value: '10-20' }
const intAddr = { type: 'input', inputName: 'int_addr', value: '0.0.0.0/0' }
const intPorts = { type: 'input', inputName: 'int_ports', value: '30-40' }
const action = {
  allow: { type: 'select', inputName: 'action', options: 'allow', value: 'Allow' },
  deny: { type: 'select', inputName: 'action', options: 'deny', value: 'Deny' }
}

describe('UPNP configuration', () => {
  describe('MiniUPnP Settings', () => {
    describe('General Settings', () => {
      it('Enable MiniUPnP, secure mode and additional logging', () => {
        const schema = [enabled, secureMode, logOutput, download, upload, port]
        cy.testNamedConfiguration(settingsEndpoint, schema, 'upnpd')
      })
      it('Enable only secure mode', () => {
        enabled.value = 'false'
        logOutput.value = 'false'
        const schema = [enabled, secureMode, logOutput, download, upload, port]
        cy.testNamedConfiguration(settingsEndpoint, schema, 'upnpd')
      })
    })
    describe('Advanced Settings', () => {
      beforeEach(function () {
        cy.changeInnerTab('Advanced settings')
      })
      it('displays error message when lease file is a dir', () => {
        const schema = [upnpLeaseFileDirectory]
        cy.get('[test-id="tablerow-upnpd"]').within(() => {
          cy.setValues(settingsEndpoint, schema, 'upnpd')
        })
        cy.overviewSave('Provided UPNP lease file path is a directory.')
      })
      it('displays error message when lease file already exists', () => {
        const schema = [upnpLeaseFileExists]
        cy.get('[test-id="tablerow-upnpd"]').within(() => {
          cy.setValues(settingsEndpoint, schema, 'upnpd')
        })
        cy.overviewSave('File selected as UPNP lease file is already in use.')
      })
      it('All fields filled', () => {
        const schema = [systemUptime, uuid, serialNumber, modelNumber, notifyInterval, cleanRulesetThreshold, cleanRulesetInterval, presentationUrl, upnpLeaseFile]
        cy.testNamedConfiguration(settingsEndpoint, schema, 'upnpd')
      })
      it('All fields empty except UPnP lease file', () => {
        systemUptime.value = 'true'
        const schema = [systemUptime, upnpLeaseFile]
        /* eslint-disable cypress/unsafe-to-chain-command */
        cy.clickInput(uuid.inputName).clear()
        cy.clickInput(serialNumber.inputName).clear()
        cy.clickInput(modelNumber.inputName).clear()
        cy.clickInput(notifyInterval.inputName).clear()
        cy.clickInput(cleanRulesetThreshold.inputName).clear()
        cy.clickInput(cleanRulesetInterval.inputName).clear()
        cy.clickInput(presentationUrl.inputName).clear()
        /* eslint-enable cypress/unsafe-to-chain-command */
        cy.testNamedConfiguration(settingsEndpoint, schema, 'upnpd')
      })
    })
  })
  describe('MiniUPnP ACLs', () => {
    it('Add new ACL with action allow', () => {
      const schema = [comment, extPorts, intAddr, intPorts, action.allow]
      cy.testTypedOverviewConfiguration(aclsEndpoint, schema, 'perm_rule')
    })
    it('Add new ACL with action deny', () => {
      const schema = [comment, extPorts, intAddr, intPorts, action.deny]
      cy.testTypedOverviewConfiguration(aclsEndpoint, schema, 'perm_rule')
    })
  })
})
