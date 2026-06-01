const route = '/network/traffic_shaping/sqm'
const endpoint = '/sqm/config'

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const instanceName = 'test' + Math.floor(Math.random() * 100) + 1

const enabled = { type: 'switch', inputName: 'enabled', value: 'false' }
const iface = { type: 'select', inputName: 'interface', options: 'br-lan', value: 'br-lan (lan)' }
const download = { type: 'input', inputName: 'download', value: '100' }
const periodicInterval = { type: 'input', inputName: 'upload', value: '100' }
const qdisc = { type: 'select', inputName: 'qdisc', options: 'fq_codel', value: 'fq_codel' }
const script = { type: 'select', inputName: 'script', options: 'simplest_tbf.qos', value: 'simplest_tbf.qos' }

const schema = [
  {
    tab: 'General Setup',
    inputs: [enabled, iface, download, periodicInterval]
  },
  {
    tab: 'Advanced Settings',
    inputs: [qdisc, script]
  }
]

describe('Sqm configuration', () => {
  it('Configuration', () => {
    cy.get('input[id=id]').type(instanceName)
    cy.testConfigurationEdit(endpoint, schema, 'sqm')
  })
})
