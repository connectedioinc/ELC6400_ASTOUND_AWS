const route = '/snmp/traps'
const endpointSettings = '/snmp/trap_settings/config'
const endpointRules = '/snmp/trap_rules/config'
const sectionNameSettings = 'settings'
const sectionNameRules = 'rules'
let hasPackage = false
let modemData = []
let secondaryModem = {}
let ioTriggers = {}

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
      hasPackage = body.data.includes('/usr/lib/opkg/info/snmp.control')
    })
  })

  cy.then(() => {
    if (!hasPackage) return

    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/modems/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      modemData = body.data
      secondaryModem = modemData.filter(m => m.name.includes('Secondary'))[0]
    })

    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/io/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      ioTriggers = body.data
    })
  })
})

beforeEach(function () {
  if (!hasPackage) this.skip()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

// Traps service settings

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const host = { type: 'input', inputName: 'host', value: 'host.com' }
const port = { type: 'input', inputName: 'port', value: '123' }
const community = { type: 'input', inputName: 'community', value: 'private' }

// Trap Rules

const type = {
  gsm: { type: 'select', inputName: 'type', options: 'gsm', value: 'GSM' },
  iotrap: { type: 'select', inputName: 'type', options: 'iotrap', value: 'Input/Output' }
}
const modem = { type: 'select', inputName: 'modem', options: secondaryModem.id, value: secondaryModem.name }
const nameGsm = {
  signal: { type: 'select', inputName: 'name', options: 'signalstrtrap', value: 'Signal strength' },
  conntype: { type: 'select', inputName: 'name', options: 'conntypetrap', value: 'Network type' }
}
const nameIotrap = {
  din1: { type: 'select', inputName: 'name', options: 'din1', value: 'Input (3)' },
  relay0: { type: 'select', inputName: 'name', options: 'relay0', value: 'Relay (5,10)' },
  // dwi: { type: 'select', inputName: 'name', options: '', value: '' },
  acl0: { type: 'select', inputName: 'name', options: 'acl0', value: 'Analog Current Loop (6,9)' },
  adc0: { type: 'select', inputName: 'name', options: 'adc0', value: 'Analog Input (6,9)' },
  din2: { type: 'select', inputName: 'name', options: 'din2', value: 'Digital Input (1)' },
  dio0: { type: 'select', inputName: 'name', options: 'dio0', value: 'Configurable Input/Output (2)' },
  dio1: { type: 'select', inputName: 'name', options: 'dio1', value: 'Configurable Input/Output (3)' },
  dio2: { type: 'select', inputName: 'name', options: 'dio2', value: 'Configurable Input/Output (4)' },
  dout1: { type: 'select', inputName: 'name', options: 'dout1', value: 'Output (4)' },
  dout2: { type: 'select', inputName: 'name', options: 'dout2', value: 'Isolated Output (3, 4, 8)' },
  iio: { type: 'select', inputName: 'name', options: 'iio', value: 'Isolated Input (2,7)' }
}
const signal = { type: 'input', inputName: 'signal', value: '-21' }
const state = {
  level: { type: 'select', inputName: 'state', options: 'active', value: 'High level' },
  open: { type: 'select', inputName: 'state', options: 'open', value: 'Open' },
  rising: { type: 'select', inputName: 'state', options: 'rising', value: 'Rising' },
  range: { type: 'select', inputName: 'state', options: 'in_range', value: 'In range' }
}
const from = { type: 'input', inputName: 'from', value: '4.1' }
const to = { type: 'input', inputName: 'to', value: '10.1' }

describe('Trap configuration', () => {
  describe('Trap service settings configuration', () => {
    it('Configuration when general is enabled', () => {
      const schema = [enabled, host, port, community]
      cy.testNamedConfiguration(endpointSettings, schema, sectionNameSettings)
    })
  })
  describe('Trap service settings configuration', () => {
    describe('Configuration when trap type is GSM', () => {
      it('Configuration when trap type is GSM', () => {
        const schema = [enabled, type.gsm, nameGsm.signal, signal]
        cy.testConfigurationEdit(endpointRules, schema, sectionNameRules)
      })
      it('Configuration when trap type is GSM and trigger is Network type', () => {
        const schema = [enabled, type.gsm, nameGsm.conntype]
        cy.testConfigurationEdit(endpointRules, schema, sectionNameRules)
      })
      it('Configuration when trap type is GSM and device has more than 1 modems', function () {
        if (modemData.length < 2) this.skip()
        modem.options = secondaryModem.id
        modem.value = secondaryModem.name
        const schema = [enabled, type.gsm, modem, nameGsm.signal, signal]
        cy.testConfigurationEdit(endpointRules, schema, sectionNameRules)
      })
    })

    describe('Configuration when trap type is I/O', () => {
      it.each([
        ['din1', [nameIotrap.din1, state.level]],
        ['relay0', [nameIotrap.relay0, state.open]],
        ['acl0', [nameIotrap.acl0, state.range, from, to]],
        ['adc0', [nameIotrap.adc0, state.range, from, to]],
        ['din2', [nameIotrap.din2, state.level]],
        ['dio0', [nameIotrap.dio0, state.level]],
        ['dio1', [nameIotrap.dio1, state.level]],
        ['dio2', [nameIotrap.dio2, state.level]],
        ['dout1', [nameIotrap.dout1, state.level]],
        ['dout2', [nameIotrap.dout2, state.level]],
        ['iio', [nameIotrap.iio, state.level]]
      ])('Configuration when trigger is %s', function (triggerName, schema) {
        const check = ioTriggers.some(m => m.name.includes(triggerName))
        if (!check) this.skip()
        const fullSchema = [enabled, type.iotrap, ...schema]
        cy.testConfigurationEdit(endpointRules, fullSchema, sectionNameRules)
      })
    })
  })
})
