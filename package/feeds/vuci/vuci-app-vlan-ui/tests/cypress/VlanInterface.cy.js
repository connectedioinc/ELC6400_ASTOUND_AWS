const route = '/network/vlan/interface_based'
const endpoint = '/interface_based_vlan/config'
const endpoint1 = '/l2tpv3/config'
const section = 'device'

const interfaceData = {
  id: 'test',
  enabled: '1',
  localaddr: '0.0.0.0',
  peeraddr: '1.1.1.1',
  session_id: '1',
  tunnel_id: '1'
}

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${endpoint1}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      if (body.data.some(iface => iface.id === interfaceData.id)) return
      cy.request({
        method: 'POST',
        url: `${Cypress.config('baseUrl')}/api${endpoint1}`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        },
        body: {
          data: interfaceData
        }
      })
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.then(() => {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api${endpoint1}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: [interfaceData.id]
      }
    })
  })
  cy.logout()
})

const overviewSection = { type: 'input', inputName: 'name', value: 'test1' }
const modalSection = { type: 'input', inputName: 'name', value: 'test2' }
const tag = { type: 'input', inputName: 'vid', value: '1' }
const qtag = { type: 'input', inputName: 'vid', value: '1' }
const type = {
  first: { type: 'select', inputName: 'type', options: '8021ad', value: '802.1AD' },
  second: { type: 'select', inputName: 'type', options: '8021q', value: '802.1Q' }
}
const ifname = { type: 'select', inputName: 'ifname', options: 'l2v3-test', value: 'L2TPv3-test' }

const customSectionTest = (endpoint, schema, section) => {
  cy.intercept('POST', `/api${endpoint}`).as('postSection')
  cy.fillValues(overviewSection)
  cy.clickSectionAdd()
  cy.wait('@postSection').then(res => {
    const sectionData = res.response.body.data
    cy.getModal().within(() => {
      cy.fillValues(modalSection)
      cy.clickSectionAdd()
      cy.get(`[test-id="tablerow-${sectionData.id}_qDevices"]`).within(() => {
        cy.fillValues(qtag)
      })
      cy.get(`[test-id="tablerow-${section}"]`).within(() => {
        cy.setValues(endpoint, schema, section)
      })
    })
    cy.clickEditSave(' Configuration has been applied ')
    cy.openLastCreatedEdit()
    cy.getModal().within(() => {
      cy.get(`[test-id="tablerow-${section}"]`).within(() => {
        cy.checkValues(endpoint, schema, sectionData.id)
      })
    })
    cy.clickEditClose()
    cy.clearSection(endpoint, sectionData.id)
  })
}

describe('Vlan interface configuration', () => {
  it('Configuration without devices first batch', () => {
    const schema = [tag, type.first, ifname]
    cy.fillValues(overviewSection)
    cy.testConfigurationEdit(endpoint, schema, section)
  })

  it('Configuration without devices second batch', () => {
    tag.value = '4094'
    const schema = [tag, type.second, ifname]
    cy.fillValues(overviewSection)
    cy.testConfigurationEdit(endpoint, schema, section)
  })

  it('Configuration with devices first batch', () => {
    const schema = [tag, type.first, ifname]
    customSectionTest(endpoint, schema, section)
  })

  it('Configuration with devices second batch', () => {
    qtag.value = '4094'
    const schema = [tag, type.second, ifname]
    customSectionTest(endpoint, schema, section)
  })
})
