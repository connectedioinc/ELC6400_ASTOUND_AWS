const route = '/snmp/community'
const endpointComm = '/snmp/communities/config'
const endpointCommV6 = '/snmp/communities_v6/config'
const sectionComm = 'communities'
const sectionCommV6 = 'communities_v6'
let hasPackage = false
let initialData = {}
let initialDataV6 = {}

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
      url: `${Cypress.config('baseUrl')}/api${endpointComm}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      initialData = body.data
    })

    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${endpointCommV6}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      initialDataV6 = body.data
    })
  })
})

beforeEach(function () {
  if (!hasPackage) this.skip()
  cy.hitPage(route)
})

after(() => {
  if (!hasPackage) return

  cy.then(() => {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${endpointComm}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: initialData
      }
    })
  })

  cy.then(() => {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${endpointCommV6}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: initialDataV6
      }
    })
  })

  cy.logout()
})

const community = { type: 'input', inputName: 'community', value: 'name' }
const ipaddr = { type: 'input', inputName: 'ipaddr', value: '21.21.21.21' }
const netmask = { type: 'input', inputName: 'netmask', value: '32' }
const source = { type: 'input', inputName: 'source', value: 'test.com' }
const secname = { type: 'select', inputName: 'secname', options: 'rw', value: 'Read-Write' }

describe('Communities configuration', () => {
  const getId = (data, community) => {
    return data.find(data => data.community === community).id
  }
  describe('SNMP Community configuration', () => {
    it('Configuration when public', () => {
      const schema = [community, ipaddr, netmask, secname]
      cy.testConfigurationEditNoCreate(schema, sectionComm, getId(initialData, 'public'))
    })
    it('Configuration when private', () => {
      const schema = [community, ipaddr, netmask, secname]
      cy.testConfigurationEditNoCreate(schema, sectionComm, getId(initialData, 'private'))
    })
  })
  describe('SNMPV6 Community configuration', () => {
    it('Configuration when public', () => {
      const schema = [community, source, secname]
      cy.testConfigurationEditNoCreate(schema, sectionCommV6, getId(initialDataV6, 'public'))
    })
    it('Configuration when private', () => {
      const schema = [community, source, secname]
      cy.testConfigurationEditNoCreate(schema, sectionCommV6, getId(initialDataV6, 'private'))
    })
  })
})
