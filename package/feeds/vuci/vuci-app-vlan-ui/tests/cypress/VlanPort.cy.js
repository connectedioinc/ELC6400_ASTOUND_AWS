const route = '/network/vlan/port_based'
const route2 = '/network/lan'
const endpoint = '/port_based_vlan/config'

let keys = []
let ports = []
let disabledOnly = false

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${endpoint}`,
      failOnStatusCode: false,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      if (!body.success) return
      keys = Object.keys(body.data[0])
        .filter(item => !['vid', 'id', '.type'].includes(item))
        .sort()
      ports = keys.map(port => {
        return {
          tagged: { type: 'select', inputName: port, options: 't', value: 'Tagged' },
          untagged: { type: 'select', inputName: port, options: 'u', value: 'Untagged' },
          off: { type: 'select', inputName: port, options: '', value: 'Off' }
        }
      })
    })
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      disabledOnly = !body.data.static.device_name.includes('RUTX')
    })
  })
  cy.hitPage(route)
})

beforeEach(function () {
  if (ports.length === 0) this.skip()
})

after(() => {
  cy.logout()
})

const vid = { type: 'input', inputName: 'vid', value: '100' }

const addPortBasedSection = (endpoint, schema) => {
  cy.intercept('POST', `/api${endpoint}`).as('postSection')
  let sectionId = ''
  cy.clickSectionAdd()
  cy.wait('@postSection').then(res => {
    sectionId = res.response.body.data.id
    cy.get(`[test-id="tablerow-${sectionId}"]`).within(() => {
      cy.setValues(endpoint, schema, sectionId)
    })
    cy.overviewSave(' Configuration has been applied ')
  })
}

const checkIfPortBasedValueExists = () => {
  cy.hitPage(route2)
  const lanIfname = { type: 'select', inputName: 'ifname', options: `eth0.${vid.value}` }
  cy.get('[test-id="tablerow-interfaces"]').within(() => {
    cy.get('input[id=id]').type('vlanTest')
  })
  const schema = [
    {
      tab: 'Physical Settings',
      inputs: [lanIfname]
    }
  ]
  cy.testCardConfigurationEdit('/interfaces/config', schema, 'interfaces')
  cy.hitPage(route)
}

describe('Vlan port based configuration', () => {
  it('Configuration with tagged vlan ports', function () {
    if (disabledOnly) this.skip()
    const schema = [vid, ...ports.map(port => port.tagged)]
    addPortBasedSection(endpoint, schema)
    checkIfPortBasedValueExists()
    cy.deleteLastCreated()
  })

  it('Configuration with disabled vlan ports', () => {
    vid.value = '4094'
    const schema = [vid, ...ports.map(port => port.off)]
    addPortBasedSection(endpoint, schema)
    checkIfPortBasedValueExists()
    cy.deleteLastCreated()
  })
})
