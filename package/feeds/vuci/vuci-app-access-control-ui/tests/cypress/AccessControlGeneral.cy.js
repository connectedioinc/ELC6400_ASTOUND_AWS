const route = '/system/admin/access_control/general'
const sshEndpoint = '/access_control/ssh/config'
const webuiEndpoint = '/access_control/webui/config'
const cliEndpoint = '/access_control/cli/config'
const telnetEndpoint = '/access_control/telnet/config'
let telnet = false
let remoteAcesss = false
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
      const hasPam = body.data.includes('/usr/lib/opkg/info/pamd.control')
      telnet = body.data.includes('/usr/lib/opkg/info/vuci-app-telnet-api.control')
      pamEnabled.depend = hasPam
      authType.depend = hasPam
    })
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      remoteAcesss = Object.prototype.hasOwnProperty.call(body.data.board.network, 'wan') || body.data.board.hwinfo.mobile
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})
// SSH
const enabled = { type: 'switch', inputName: 'enable', value: 'true' }
const sshWanAccess = { type: 'switch', inputName: 'wan_access', value: 'true' }
const port = { type: 'input', inputName: 'port', value: '22' }
const pamEnabled = { type: 'switch', inputName: 'pam', value: 'true', depend: false }
const disableKeySSH = { type: 'switch', inputName: 'enable_key_ssh', value: 'false' }
const enableKeySSH = { type: 'switch', inputName: 'enable_key_ssh', value: 'true' }
const sshKeys = { type: 'textarea', inputName: 'ssh_keys', value: 'Test 123' }

// WebUI
const enableHttp = { type: 'switch', inputName: 'enable_http', value: 'true' }
const enableHttps = { type: 'switch', inputName: 'enable_https', value: 'true' }
const redirectHttps = { type: 'switch', inputName: 'redirect_https', value: 'false' }
const httpWanAccess = { type: 'switch', inputName: 'http_wan_access', value: 'true' }
const listenHttp = { type: 'input', inputName: 'listen_http', value: '80' }
const httpsWanAccess = { type: 'switch', inputName: 'https_wan_access', value: 'true' }
const listenHttps = { type: 'input', inputName: 'listen_https', value: '443' }
const authType = { type: 'switch', inputName: 'auth_type', value: 'false', depend: false }
const rfc1918Filter = { type: 'switch', inputName: 'rfc1918_filter', value: 'true' }
const deviceFiles = { type: 'switch', inputName: 'device_files', value: 'true' }
const cert = { type: 'select', inputName: 'cert', options: '/etc/uhttpd.crt', value: 'uhttpd.crt' }
const key = { type: 'select', inputName: 'key', options: '/etc/uhttpd.key', value: 'uhttpd.key' }

// CLI
const enableCli = { type: 'switch', inputName: 'enable', value: 'true' }
const disableCli = { type: 'switch', inputName: 'enable', value: 'false' }
const cliWanAccess = { type: 'switch', inputName: 'wan_access', value: 'true' }
const cliPort = { type: 'input', inputName: 'port', value: '4200-4222' }
const shellLimit = { type: 'input', inputName: 'shell_limit', value: '5' }

// Telnet
const enableTelnet = { type: 'switch', inputName: 'enable', value: 'true' }
const disableTelnet = { type: 'switch', inputName: 'enable', value: 'false' }
const telnetWanAccess = { type: 'switch', inputName: 'wan_access', value: 'true' }
const telnetPort = { type: 'input', inputName: 'port', value: '23' }

describe('Access Control General configuration', function () {
  describe('SSH configuration', function () {
    describe('Check with remote access', function () {
      it('SSH access, key-based authentication and pam enabled', function () {
        if (!remoteAcesss) this.skip()
        const schema = [enabled, sshWanAccess, port, pamEnabled, enableKeySSH, sshKeys]
        cy.testNamedConfiguration(sshEndpoint, schema, 'dropbear')
        cy.get('.side-messages .warning').should('be.visible')
      })
      it('SSH access enabled and everything else disabled', function () {
        if (!remoteAcesss) this.skip()
        pamEnabled.value = 'false'
        sshWanAccess.value = 'false'
        const schema = [sshWanAccess, port, pamEnabled, disableKeySSH]
        cy.testNamedConfiguration(sshEndpoint, schema, 'dropbear')
      })
      describe('Check without remote access', function () {
        it('SSH access, key-based authentication and pam enabled', function () {
          if (remoteAcesss) this.skip()
          const schema = [enabled, port, pamEnabled, enableKeySSH, sshKeys]
          cy.testNamedConfiguration(sshEndpoint, schema, 'dropbear')
        })
        it('SSH access enabled and everything else disabled', function () {
          if (remoteAcesss) this.skip()
          pamEnabled.value = 'false'
          const schema = [port, pamEnabled, disableKeySSH]
          cy.testNamedConfiguration(sshEndpoint, schema, 'dropbear')
        })
      })
    })
  })
  describe('WebUI configuration', function () {
    describe('Check with remote access', function () {
      it('enables everything except pam support and files selected from device', function () {
        if (!remoteAcesss) this.skip()
        const schema = [enableHttp, enableHttps, redirectHttps, httpWanAccess, listenHttp, httpsWanAccess, listenHttps, authType, rfc1918Filter, deviceFiles, cert, key]
        cy.testNamedConfiguration(webuiEndpoint, schema, 'webui')
        cy.get('.side-messages .warning').should('be.visible')
      })
      it('restores to default settings', function () {
        if (!remoteAcesss) this.skip()
        httpWanAccess.value = 'false'
        httpsWanAccess.value = 'false'
        const schema = [enableHttp, enableHttps, redirectHttps, httpWanAccess, listenHttp, httpsWanAccess, listenHttps, authType, rfc1918Filter, deviceFiles, cert, key]
        cy.testNamedConfiguration(webuiEndpoint, schema, 'webui')
      })
    })
    describe('Check without remote access', function () {
      it('enables everything except pam support and files selected from device', function () {
        if (remoteAcesss) this.skip()
        const schema = [enableHttp, enableHttps, redirectHttps, listenHttp, listenHttps, authType]
        cy.testNamedConfiguration(webuiEndpoint, schema, 'webui')
      })
      it('restores to default settings', function () {
        if (remoteAcesss) this.skip()
        httpWanAccess.value = 'false'
        httpsWanAccess.value = 'false'
        const schema = [enableHttp, enableHttps, redirectHttps, listenHttp, listenHttps, authType]
        cy.testNamedConfiguration(webuiEndpoint, schema, 'webui')
      })
    })
  })
  describe('CLI configuration', function () {
    describe('Check with remote access', function () {
      it('disables CLI', function () {
        if (!remoteAcesss) this.skip()
        const schema = [disableCli]
        cy.testNamedConfiguration(cliEndpoint, schema, 'cli')
      })
      it('enables everything', function () {
        if (!remoteAcesss) this.skip()
        const schema = [enableCli, cliWanAccess, cliPort, shellLimit]
        cy.testNamedConfiguration(cliEndpoint, schema, 'cli')
      })
      it('restores to default settings', function () {
        if (!remoteAcesss) this.skip()
        cliWanAccess.value = 'false'
        const schema = [enableCli, cliWanAccess, cliPort, shellLimit]
        cy.testNamedConfiguration(cliEndpoint, schema, 'cli')
      })
    })
    describe('Check without remote access', function () {
      it('disables CLI', function () {
        if (remoteAcesss) this.skip()
        const schema = [disableCli]
        cy.testNamedConfiguration(cliEndpoint, schema, 'cli')
      })
      it('enables everything', function () {
        if (remoteAcesss) this.skip()
        const schema = [enableCli, cliPort, shellLimit]
        cy.testNamedConfiguration(cliEndpoint, schema, 'cli')
      })
      it('restores to default settings', function () {
        if (remoteAcesss) this.skip()
        cliWanAccess.value = 'false'
        const schema = [enableCli, cliPort, shellLimit]
        cy.testNamedConfiguration(cliEndpoint, schema, 'cli')
      })
    })
  })
  describe('Telnet configuration', function () {
    it('enables everything', function () {
      if (!telnet) this.skip()
      const schema = [enableTelnet, telnetWanAccess, telnetPort]
      cy.testNamedConfiguration(telnetEndpoint, schema, 'telnet')
      cy.get('.side-messages .warning').should('be.visible')
    })
    it('disables Telnet access', function () {
      if (!telnet) this.skip()
      const schema = [disableTelnet]
      cy.testNamedConfiguration(telnetEndpoint, schema, 'telnet')
    })
  })
})
