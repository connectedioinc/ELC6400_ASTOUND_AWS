describe('Form input save', () => {
  let sectionName = ''
  const endpoint = '/services/auto_reboot/ping_wget/config'
  it('Check if input is saved after select option depend appear', () => {
    const route = '/system/maintenance/auto_reboot/ping_reboot'
    cy.intercept('POST', `/api${endpoint}`).as('postSection')

    cy.login()
    cy.hitPage(route)
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
    })
    cy.clickInput('action')
    cy.get('li:contains("Send SMS")').click()
    cy.fillList('number', ['+37065555555'])
    cy.get('textarea').type('testTestTestTestTest')
    cy.clickEditSave()
    cy.get('.edit').last().click()
    cy.getListValues('number', ['+37065555555'])
    cy.getModal().find('textarea').should('have.value', 'testTestTestTestTest')
  })
  after(() => {
    cy.clearSection(endpoint, sectionName)
  })
})

describe('Form input value', () => {
  const endpoint = '/services/data_to_server/collections/config'
  let sectionName = ''
  it('Check if switch input value is not null after form save and depend appear', () => {
    const route = '/services/data_sender'
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.intercept('PUT', `/api${endpoint}/cfg*`).as('putSection')

    cy.login()
    cy.hitPage(route)
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
    })
    cy.getInput('host').type('www.example.com')
    cy.clickEditSave()
    cy.wait('@putSection').then(res => expect(res.response.body.success).to.eq(true))
    cy.get('.edit').last().click()
    cy.clickInput('protocol')
    cy.get('li:contains("MQTT")').click()
    cy.clickEditSave()
    cy.wait('@putSection').then(res => {
      const body = res.response.body
      expect(body.success).to.eq(true)
      expect(body.data.use_credentials).to.eq('0')
    })
  })

  after(() => {
    cy.clearSection(endpoint, sectionName)
  })
})

describe('Form input value in request', () => {
  it('Check if switch value is sent with request if element is not visible', () => {
    const route = '/services/mqtt/publisher'
    cy.intercept('PUT', '/api/mqtt/publisher/config/general').as('putSection')

    cy.login()
    cy.hitPage(route)
    cy.fillInput('remote_addr', 'www.example.com')
    cy.overviewSave()
    cy.wait('@putSection').then(res => {
      const body = res.response.body
      expect(body.success).to.eq(true)
      expect(body.data.tls_insecure).to.eq(undefined)
    })
  })
})

describe('Form input value after depend', () => {
  const endpoint = '/gre/config'
  const sectionName = 'testGre'

  before(() => {
    cy.clearSection(endpoint, sectionName)
  })

  it('Check if value set using API is correct in WebUI input after it becomes visible', () => {
    const route = '/services/vpn/gre'
    const data = {
      keep_alive_interval: '20'
    }

    cy.login()
    cy.hitPage(route)
    cy.get('input[id="id"]').type(sectionName)
    cy.clickSectionAdd()
    cy.clickEditSave()
    cy.editSection(endpoint, sectionName, data)
    cy.reload()
    cy.get('.edit').last().click()
    cy.clickSwitch('keep_alive')
    cy.getInput('keep_alive_interval').should('have.value', '20')
  })
})
