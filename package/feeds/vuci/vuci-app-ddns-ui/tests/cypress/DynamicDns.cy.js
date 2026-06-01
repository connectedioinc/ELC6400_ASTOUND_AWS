const route = '/services/ddns'
const endpoint = '/ddns/config'
let interfaces = []
let serviceProviders = []

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/interfaces/config`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      interfaces = body.success ? body.data.filter(o => o.id !== 'loopback').map(o => o.id) : []
    })
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/ddns/options`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      serviceProviders = body.success ? [['', '-- Custom --'], ...Object.keys(body.data.service_providers)] : []
    })
  })
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.logout()
})

const DynamcicDdsInstanceName = 'test' + Math.floor(Math.random() * 100) + 1

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const useHttpSecure = { type: 'switch', inputName: 'use_https', value: 'true' }
const lookupHostname = { type: 'input', inputName: 'lookup_host', value: 'myhost.example.com' }

const ddnsServiceProvider = { type: 'select', inputName: 'service_name', options: 'myonlineportal.net', value: 'myonlineportal.net' }
const ddnsServiceProviderCloudflare = { type: 'select', inputName: 'service_name', options: 'cloudflare.com-v4', value: 'cloudflare.com-v4' }

const authentificationType = {
  emailAPI: { type: 'select', inputName: 'cloudflare_authentication_type', options: 'emailAPI', value: 'Email / API token' },
  bearer: { type: 'select', inputName: 'cloudflare_authentication_type', options: 'bearer', value: 'Bearer' }
}

const customUpdateUrl = { type: 'input', inputName: 'update_url', value: 'myhost.example.com' }

const domain = { type: 'input', inputName: 'domain', value: 'myhost.example.com' }
const username = {
  username: { type: 'input', inputName: 'username', value: 'username' },
  email: { type: 'input', inputName: 'username', value: 'username@gmail.com' }
}
const password = { type: 'input', inputName: 'password', value: 'password' }
const ipAddressSouce = {
  custom: { type: 'select', inputName: 'ip_source', options: 'network', value: 'Custom' },
  public: { type: 'select', inputName: 'ip_source', options: 'web', value: 'Public' },
  private: { type: 'select', inputName: 'ip_source', options: 'interface', value: 'Private' },
  script: { type: 'select', inputName: 'ip_source', options: 'script', value: 'Script' }
}

//  ipAddress dependencies
const network = { type: 'select', inputName: 'ip_network' }
const urlToDetect = { type: 'input', inputName: 'ip_url', value: 'https://checkip.dyndns.com' }
const eventNetwork = { type: 'select', inputName: 'interface', options: 'lan', value: 'lan' }
const script = { type: 'input', inputName: 'ip_script', value: '/path/to/script.sh' }

const checkIntervalInput = {
  seconds300: { type: 'input', inputName: 'dyndns_check_interval_input', value: '300' },
  seconds600000: { type: 'input', inputName: 'dyndns_check_interval_input', value: '600000' },
  minutes5: { type: 'input', inputName: 'dyndns_check_interval_input', value: '5' },
  minutes600000: { type: 'input', inputName: 'dyndns_check_interval_input', value: '600000' },
  hours1: { type: 'input', inputName: 'dyndns_check_interval_input', value: '1' },
  hours600000: { type: 'input', inputName: 'dyndns_check_interval_input', value: '600000' }
}
const checkIntervalSelect = {
  seconds: { type: 'select', inputName: 'dyndns_check_interval_select', options: 'seconds', value: 'Seconds' },
  minutes: { type: 'select', inputName: 'dyndns_check_interval_select', options: 'minutes', value: 'Minutes' },
  hours: { type: 'select', inputName: 'dyndns_check_interval_select', options: 'hours', value: 'Hours' }
}

const forceIntervalInput = {
  minutes5: { type: 'input', inputName: 'dyndns_force_interval_input', value: '5' },
  minutes600000: { type: 'input', inputName: 'dyndns_force_interval_input', value: '600000' },
  hours1: { type: 'input', inputName: 'dyndns_force_interval_input', value: '1' },
  hours600000: { type: 'input', inputName: 'dyndns_force_interval_input', value: '600000' },
  days1: { type: 'input', inputName: 'dyndns_force_interval_input', value: '1' },
  days600000: { type: 'input', inputName: 'dyndns_force_interval_input', value: '600000' }
}
const forceIntervalSelect = {
  minutes: { type: 'select', inputName: 'dyndns_force_interval_select', options: 'minutes', value: 'Minutes' },
  hours: { type: 'select', inputName: 'dyndns_force_interval_select', options: 'hours', value: 'Hours' },
  days: { type: 'select', inputName: 'dyndns_force_interval_select', options: 'days', value: 'Days' }
}

describe('Dynamic DNS configuration end to end tests', () => {
  describe('Instance basic configuration tests', () => {
    describe('Instance with "Lookup hostname" = "cloudflare.com-v4"', () => {
      it('Instance with "Authentication type" = "Email / API token"', () => {
        const schema = [enabled, useHttpSecure, lookupHostname, ddnsServiceProviderCloudflare, domain, authentificationType.emailAPI, username.email, password, ipAddressSouce.custom, network]
        if (interfaces.length > 0) {
          network.options = interfaces[0]
          network.value = interfaces[0]
          schema.splice(9, 0, network)
        }
        cy.get('input[id=id]').type(DynamcicDdsInstanceName)
        cy.testCardConfigurationEdit(endpoint, schema, 'service')
      })
      it('Instance with "Authentication type" = "Bearer"', () => {
        const schema = [enabled, useHttpSecure, lookupHostname, ddnsServiceProviderCloudflare, domain, authentificationType.bearer, password, ipAddressSouce.custom, network]
        if (interfaces.length > 0) {
          network.options = interfaces[0]
          network.value = interfaces[0]
          schema.splice(9, 0, network)
        }
        cy.get('input[id=id]').type(DynamcicDdsInstanceName)
        cy.testCardConfigurationEdit(endpoint, schema, 'service')
      })
    })
    describe('Instance with "Lookup hostname" !== "cloudflare.com-v4', () => {
      describe('"IP address source" options tests', () => {
        it('Instance with "IP Address" = "custom" selected', () => {
          const schema = [enabled, useHttpSecure, lookupHostname, ddnsServiceProvider, domain, username.username, password, ipAddressSouce.custom, network]
          if (interfaces.length > 0) {
            network.options = interfaces[0]
            network.value = interfaces[0]
            schema.splice(9, 0, network)
          }
          cy.get('input[id=id]').type(DynamcicDdsInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'service')
        })
        it('Instance with "IP Address" = "public" selected', () => {
          const schema = [enabled, useHttpSecure, lookupHostname, ddnsServiceProvider, domain, username.username, password, ipAddressSouce.public, urlToDetect]
          cy.get('input[id=id]').type(DynamcicDdsInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'service')
        })
        it('Instance with "IP Address" = "private" selected', () => {
          const schema = [enabled, useHttpSecure, lookupHostname, ddnsServiceProvider, domain, username.username, password, ipAddressSouce.private]
          cy.get('input[id=id]').type(DynamcicDdsInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'service')
        })
        it('Instance with "IP Address" = "private" selected', () => {
          const schema = [enabled, useHttpSecure, lookupHostname, ddnsServiceProvider, domain, username.username, password, ipAddressSouce.script, eventNetwork, script]
          cy.get('input[id=id]').type(DynamcicDdsInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'service')
        })
      })
      describe('"Check interval" and "Force interval" options tests', () => {
        it('Instance with "Check interval" = "300 seconds" and "Force interval" = "5 minutes"', () => {
          const schema = [
            enabled,
            useHttpSecure,
            lookupHostname,
            ddnsServiceProvider,
            domain,
            username.username,
            password,
            checkIntervalInput.seconds300,
            checkIntervalSelect.seconds,
            forceIntervalInput.minutes5,
            forceIntervalSelect.minutes
          ]
          cy.get('input[id=id]').type(DynamcicDdsInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'service')
        })
        it('Instance with "Check interval" = "600000 seconds" and "Force interval" = "600000 minutes"', () => {
          const schema = [
            enabled,
            useHttpSecure,
            lookupHostname,
            ddnsServiceProvider,
            domain,
            username.username,
            password,
            checkIntervalInput.seconds600000,
            checkIntervalSelect.seconds,
            forceIntervalInput.minutes600000,
            forceIntervalSelect.minutes
          ]
          cy.get('input[id=id]').type(DynamcicDdsInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'service')
        })
        it('Instance with "Check interval" = "5 minutes" and "Force interval" = "1 hour"', () => {
          const schema = [
            enabled,
            useHttpSecure,
            lookupHostname,
            ddnsServiceProvider,
            domain,
            username.username,
            password,
            checkIntervalInput.minutes5,
            checkIntervalSelect.minutes,
            forceIntervalInput.hours1,
            forceIntervalSelect.hours
          ]
          cy.get('input[id=id]').type(DynamcicDdsInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'service')
        })
        it('Instance with "Check interval" = "600000 minutes" and "Force interval" = "600000 hours"', () => {
          const schema = [
            enabled,
            useHttpSecure,
            lookupHostname,
            ddnsServiceProvider,
            domain,
            username.username,
            password,
            checkIntervalInput.minutes600000,
            checkIntervalSelect.minutes,
            forceIntervalInput.hours600000,
            forceIntervalSelect.hours
          ]
          cy.get('input[id=id]').type(DynamcicDdsInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'service')
        })
        it('Instance with "Check interval" = "1 hour" and "Force interval" = "1 day"', () => {
          const schema = [
            enabled,
            useHttpSecure,
            lookupHostname,
            ddnsServiceProvider,
            domain,
            username.username,
            password,
            checkIntervalInput.hours1,
            checkIntervalSelect.hours,
            forceIntervalInput.days1,
            forceIntervalSelect.days
          ]
          cy.get('input[id=id]').type(DynamcicDdsInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'service')
        })
        it('Instance with "Check interval" = "600000 hours" and "Force interval" = "600000 days"', () => {
          const schema = [
            enabled,
            useHttpSecure,
            lookupHostname,
            ddnsServiceProvider,
            domain,
            username.username,
            password,
            checkIntervalInput.hours600000,
            checkIntervalSelect.hours,
            forceIntervalInput.days600000,
            forceIntervalSelect.days
          ]
          cy.get('input[id=id]').type(DynamcicDdsInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'service')
        })
      })
      describe('"DDNS service provider" selected from list tests', () => {
        it('Instance with first "DDNS service provider" selected', () => {
          if (serviceProviders.length > 1) {
            ddnsServiceProvider.value = serviceProviders[1]
            ddnsServiceProvider.options = serviceProviders[1]
          } else {
            this.skip()
          }
          const schema = [enabled, useHttpSecure, lookupHostname, ddnsServiceProvider, domain, username.username, password, ipAddressSouce.custom, network]
          if (interfaces.length > 0) {
            network.options = interfaces[0]
            network.value = interfaces[0]
            schema.splice(9, 0, network)
          }
          cy.get('input[id=id]').type(DynamcicDdsInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'service')
        })
        it('Instance with last "DDNS service provider" selected', () => {
          if (serviceProviders.length > 2) {
            ddnsServiceProvider.value = serviceProviders[serviceProviders.length - 1]
            ddnsServiceProvider.options = serviceProviders[serviceProviders.length - 1]
          } else {
            this.skip()
          }
          const schema = [enabled, useHttpSecure, lookupHostname, ddnsServiceProvider, domain, username.username, password, ipAddressSouce.custom, network]
          if (interfaces.length > 0) {
            network.options = interfaces[0]
            network.value = interfaces[0]
            schema.splice(9, 0, network)
          }
          cy.get('input[id=id]').type(DynamcicDdsInstanceName)
          cy.testCardConfigurationEdit(endpoint, schema, 'service')
        })
      })
    })
  })
  describe('Instance overview configuration tests', () => {
    it('Configures instance with everything enabled and filled, disables instance in overview and checks for changes in modal', () => {
      const schema = [enabled, lookupHostname, customUpdateUrl]
      cy.get('input[id=id]').type(DynamcicDdsInstanceName)
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
        cy.get('div[test-id=switch-enabled]').click({ multiple: true })
        cy.openLastCreatedEdit()
        cy.getModal().within(() => {
          enabled.value = 'false'
          cy.checkValues(endpoint, schema, sectionName)
        })
        cy.clickEditClose()
        cy.clearCardSection(endpoint, sectionName)
      })
    })
  })
})
