const route = '/system/admin/access_control/pam'
const endpoint = '/access_control/pam/config'
let hasPackage = false

let securityModules = []

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
      hasPackage = body.data.includes('/usr/lib/opkg/info/pam.control')
      if (hasPackage) {
        cy.then(() => {
          cy.request({
            method: 'GET',
            url: `${Cypress.config('baseUrl')}/api/access_control/pam/options`,
            headers: {
              Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
              'Content-type': 'application/json'
            }
          }).then(({ body }) => {
            securityModules = body.data.modules
          })
        })
      }
      cy.then(() => {
        cy.hitPage(route)
      })
    })
  })
})

beforeEach(function () {
  if (!hasPackage) this.skip()
})

after(() => {
  cy.logout()
})

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }

const module = {
  tacacs: { type: 'select', inputName: 'module', options: 'tacplus', value: 'TACACS+' },
  radius: { type: 'select', inputName: 'module', options: 'radius_auth', value: 'Radius' },
  local: { type: 'select', inputName: 'module', options: 'unix', value: 'Local' }
}

const type = {
  required: { type: 'select', inputName: 'type', options: 'required', value: 'Required' },
  requisite: { type: 'select', inputName: 'type', options: 'requisite', value: 'Requisite' },
  sufficient: { type: 'select', inputName: 'type', options: 'sufficient', value: 'Sufficient' },
  optional: { type: 'select', inputName: 'type', options: 'optional', value: 'Optional' }
}

const server = { type: 'input', inputName: 'server', value: '192.168.1.1' }
const key = { type: 'input', inputName: 'secret', value: '123456' }

// module = radius
const port = { type: 'input', inputName: 'port', value: '1812' }
const timeout = { type: 'input', inputName: 'timeout', value: '3' }
const secret = { type: 'input', inputName: 'secret', value: 'secretTest' }

const service = {
  ssh: 'sshd',
  webui: 'rpcd'
}

describe('Access control Pam configuration', () => {
  describe('"Service" = "SSH"', () => {
    describe('"Module" = "TACACS+"', () => {
      beforeEach(function () {
        if (!securityModules.includes('tacplus')) this.skip()
      })
      it.each([
        [type.required.value, service.ssh, module.tacacs, type.required],
        [type.requisite.value, service.ssh, module.tacacs, type.requisite],
        [type.sufficient.value, service.ssh, module.tacacs, type.sufficient],
        [type.optional.value, service.ssh, module.tacacs, type.optional]
      ])('"Type" = "%s"', (typeValue, service, module, type) => {
        const schema = [enabled, module, type, server, key]
        cy.selectValue('service', service, service)
        cy.testConfigurationEdit(endpoint, schema, 'pamd')
      })
    })
    describe('"Module" = "Radius"', () => {
      beforeEach(function () {
        if (!securityModules.includes('radius_auth')) this.skip()
      })
      it.each([
        [type.required.value, service.ssh, module.radius, type.required],
        [type.requisite.value, service.ssh, module.radius, type.requisite],
        [type.sufficient.value, service.ssh, module.radius, type.sufficient],
        [type.optional.value, service.ssh, module.radius, type.optional]
      ])('"Type" = "%s"', (typeValue, service, module, type) => {
        const schema = [enabled, module, type, server, secret, port, timeout]
        cy.selectValue('service', service, service)
        cy.testConfigurationEdit(endpoint, schema, 'pamd')
      })
    })
    describe('"Module" = "Local"', () => {
      beforeEach(function () {
        if (!securityModules.includes('unix')) this.skip()
      })
      it.each([
        [type.required.value, service.ssh, module.local, type.required],
        [type.requisite.value, service.ssh, module.local, type.requisite],
        [type.sufficient.value, service.ssh, module.local, type.sufficient],
        [type.optional.value, service.ssh, module.local, type.optional]
      ])('"Type" = "%s"', (typeValue, service, module, type) => {
        const schema = [enabled, module, type]
        cy.selectValue('service', service, service)
        cy.testConfigurationEdit(endpoint, schema, 'pamd')
      })
    })
  })
  describe('"Service" = "WebUI"', () => {
    describe('"Module" = "TACACS+"', () => {
      beforeEach(function () {
        if (!securityModules.includes('tacplus')) this.skip()
      })
      it.each([
        [type.required.value, service.webui, module.tacacs, type.required],
        [type.requisite.value, service.webui, module.tacacs, type.requisite],
        [type.sufficient.value, service.webui, module.tacacs, type.sufficient],
        [type.optional.value, service.webui, module.tacacs, type.optional]
      ])('"Type" = "%s"', (typeValue, service, module, type) => {
        const schema = [enabled, module, type, server, key]
        cy.selectValue('service', service, service)
        cy.testConfigurationEdit(endpoint, schema, 'pamd')
      })
    })
    describe('"Module" = "Radius"', () => {
      beforeEach(function () {
        if (!securityModules.includes('radius_auth')) this.skip()
      })
      it.each([
        [type.required.value, service.webui, module.radius, type.required],
        [type.requisite.value, service.webui, module.radius, type.requisite],
        [type.sufficient.value, service.webui, module.radius, type.sufficient],
        [type.optional.value, service.webui, module.radius, type.optional]
      ])('"Type" = "%s"', (typeValue, service, module, type) => {
        const schema = [enabled, module, type, server, secret, port, timeout]
        cy.selectValue('service', service, service)
        cy.testConfigurationEdit(endpoint, schema, 'pamd')
      })
    })
    describe('"Module" = "Local"', () => {
      beforeEach(function () {
        if (!securityModules.includes('unix')) this.skip()
      })

      it.each([
        [type.required.value, service.webui, module.local, type.required],
        [type.requisite.value, service.webui, module.local, type.requisite],
        [type.sufficient.value, service.webui, module.local, type.sufficient],
        [type.optional.value, service.webui, module.local, type.optional]
      ])('"Type" = "%s"', (typeValue, service, module, type) => {
        const schema = [enabled, module, type]
        cy.selectValue('service', service, service)
        cy.testConfigurationEdit(endpoint, schema, 'pamd')
      })
    })
  })
})
