const route = '/network/mobile/apn_database'
const endpoint = '/apn_database/config'
let hasMobile = false

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
      hasMobile = body.data.includes('/usr/lib/opkg/info/mobifd.control')
      if (hasMobile) cy.hitPage(route)
    })
  })
})

beforeEach(function () {
  if (!hasMobile) this.skip()
})

after(() => {
  cy.logout()
})

const carrier = { type: 'input', inputName: 'carrier', value: 'test' }
const mcc = { type: 'input', inputName: 'mcc', value: '001' }
const mnc = { type: 'input', inputName: 'mnc', value: '01' }
const apn = { type: 'input', inputName: 'apn', value: 'test' }
const pdptype = {
  ipv46: { type: 'select', inputName: 'pdptype', options: '0', value: 'IPv4/IPv6' },
  ipv4: { type: 'select', inputName: 'pdptype', options: '1', value: 'IPv4' },
  ipv6: { type: 'select', inputName: 'pdptype', options: '2', value: 'IPv6' }
}
const authtype = {
  none: { type: 'select', inputName: 'authtype', options: '0', value: 'None' },
  pap: { type: 'select', inputName: 'authtype', options: '1', value: 'PAP' },
  chap: { type: 'select', inputName: 'authtype', options: '2', value: 'CHAP' }
}
const user = { type: 'input', inputName: 'user', value: 'test' }
const password = { type: 'input', inputName: 'password', value: 'test' }

const fillEntryData = (carrier, mcc, mnc, apn) => {
  cy.waitForContentLoad()
  const schema = [carrier, mcc, mnc, apn]
  cy.setValues(endpoint, schema, '')
}

const createEntry = (endpoint, schema, section = 'apn') => {
  cy.intercept('POST', `/api${endpoint}`).as('postSection')
  let sectionName = ''
  cy.clickSectionAdd(section)
  cy.wait('@postSection').then(res => {
    sectionName = res.response.body.data.id
    cy.waitForEditModalOpen()
    cy.getModal().within(() => {
      cy.get(`[test-id="tablerow-${section}"]`).within(() => {
        cy.setValues(endpoint, schema, sectionName)
      })
    })
    cy.clickEditSave()
    cy.get('body').then($body => {
      if ($body.find('.pagination > ul').length > 0) {
        cy.get('.pagination > ul > li').last().click()
      }
      cy.openLastCreatedEdit()
    })
    cy.getModal().within(() => {
      cy.get(`[test-id="tablerow-${section}"]`).within(() => {
        cy.checkValues(endpoint, schema, sectionName)
      })
    })
    cy.clickEditClose()
    cy.clearSection(endpoint, sectionName)
  })
}

describe('APN database configuration', () => {
  it('Configuration when authtype None', () => {
    const schema = [carrier, mcc, mnc, apn, pdptype.ipv46, authtype.none]
    fillEntryData(carrier, mcc, mnc, apn)
    createEntry(endpoint, schema)
  })
  it('Configuration when authtype PAP and pdptype IPv4', () => {
    const schema = [carrier, mcc, mnc, apn, pdptype.ipv4, authtype.pap, user, password]
    fillEntryData(carrier, mcc, mnc, apn)
    createEntry(endpoint, schema)
  })
  it('Configuration when authtype CHAP and pdptype IPv6', () => {
    const schema = [carrier, mcc, mnc, apn, pdptype.ipv4, authtype.chap, user, password]
    fillEntryData(carrier, mcc, mnc, apn)
    createEntry(endpoint, schema)
  })
  it('Types "Bite Internet" in search and checks if entry is shown', () => {
    const search = 'Bite Internet'
    cy.get('[test-id="input-tlt_table_search_input"]').filter(':visible').type(search)
    cy.get('[test-id="tablecolumns-carrier"]').first().should('contain', search)
  })
})
