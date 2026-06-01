const route = '/system/admin/admin'
const generalEndpoint = '/system/config'
const ledEndpoint = '/system/led/config'
const buttonsEndpoint = '/system/buttons/config'
const sectionNames = []
let restoreData = {}

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${generalEndpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      restoreData = body.data
    })
  })
  cy.hitPage(route, generalEndpoint)
})

after(() => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.config('baseUrl')}/api${generalEndpoint}`,
    body: {
      data: restoreData
    },
    headers: {
      Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
      'Content-type': 'application/json'
    }
  })
  cy.logout()
})

// General settings
const lang = { type: 'select', inputName: 'lang', options: 'en', value: 'English' }
const advanced = {
  basic: { type: 'select', inputName: 'advanced', options: '0', value: 'Basic' },
  advanced: { type: 'select', inputName: 'advanced', options: '1', value: 'Advanced' }
}

// Device name and hostname
const devicename = { type: 'input', inputName: 'devicename', value: 'Router1' }
const hostname = { type: 'input', inputName: 'hostname', value: 'router1.com' }

// LED Indication
const led = {
  enabled: { type: 'switch', inputName: 'enabled', value: 'true' },
  disabled: { type: 'switch', inputName: 'enabled', value: 'false' }
}
// Reset Button
const resetBtn = {
  enabled: { type: 'switch', inputName: 'enabled', value: 'true' },
  disabled: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const min = [
  { type: 'input', inputName: 'min', value: '0' },
  { type: 'input', inputName: 'min', value: '6' },
  { type: 'input', inputName: 'min', value: '12' }
]
const max = [
  { type: 'input', inputName: 'max', value: '5' },
  { type: 'input', inputName: 'max', value: '11' },
  { type: 'input', inputName: 'max', value: '20' }
]

describe('Administration General configuration', () => {
  describe('General settings configuration', () => {
    it('Selects English language and changes mode to basic', () => {
      const schema = [lang, advanced.basic]
      cy.testNamedConfiguration(generalEndpoint, schema, 'settings')
    })
    it('Selects English language and changes mode to advanced', () => {
      const schema = [lang, advanced.advanced]
      cy.testNamedConfiguration(generalEndpoint, schema, 'settings')
    })
  })
  describe('Device name and hostname configuration', () => {
    it('Changes device name, hostname and checks document title', () => {
      const schema = [devicename, hostname]
      cy.testNamedConfiguration(generalEndpoint, schema, 'administration_system')
      cy.title().should('contain', devicename.value)
    })
  })
  describe('LED Indication configuration', () => {
    it('Disables LED indication', () => {
      const schema = [led.disabled]
      cy.testNamedConfiguration(ledEndpoint, schema, 'led')
    })
    it('Enables LED indication', () => {
      const schema = [led.enabled]
      cy.testNamedConfiguration(ledEndpoint, schema, 'led')
    })
  })
  describe('Reset button configuration', () => {
    it('Disable all configurations', () => {
      for (let i = 0; i < sectionNames.length; i++) {
        const schema = [resetBtn.enabled, min[i], max[i]]
        cy.testNamedConfiguration(buttonsEndpoint, schema, sectionNames[i])
      }
    })
    it('Enable all configurations', () => {
      for (let i = 0; i < sectionNames.length; i++) {
        const schema = [resetBtn.disabled, min[i], max[i]]
        cy.testNamedConfiguration(buttonsEndpoint, schema, sectionNames[i])
      }
    })
  })
})
