const route = '/services/vpn/tinc'
const endpoint = '/tinc/config'

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

// GENERAL SETTINGS
const tincInstanceName = 'test' + Math.floor(Math.random() * 100) + 1
const newInstanceName = 'new' + Math.floor(Math.random() * 10) + 1

const enabled = {
  true: { type: 'switch', inputName: 'enabled', value: 'true' },
  false: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const subnet = { type: 'input', inputName: 'subnet_0', value: '192.168.1.0/24' }
const subnet2 = { type: 'input', inputName: 'subnet_1', value: '192.168.1.0/24' }

// ADVANCED SETTINGS
const addressFamily = {
  any: { type: 'select', inputName: 'any', options: 'any', value: 'any' },
  ipv4: { type: 'select', inputName: 'addressfamily', options: 'ipv4', value: 'ipv4' },
  ipv6: { type: 'select', inputName: 'addressfamily', options: 'ipv6', value: 'ipv6' }
}
const bindToAddress = { type: 'input', inputName: 'bindtoaddress_0', value: '0.0.0.0' }
const bindToInterface = {
  any: { type: 'select', inputName: 'bindtointerface', options: '', value: 'any' },
  lan: { type: 'select', inputName: 'bindtointerface', options: 'lan', value: 'Lan' },
  wan: { type: 'select', inputName: 'bindtointerface', options: 'wan', value: 'wan' },
  mob1s1a1: { type: 'select', inputName: 'bindtointerface', options: 'mob1s1a1', value: 'mob1s1a1' },
  mob1s2a1: { type: 'select', inputName: 'bindtointerface', options: 'mob1s2a1', value: 'mob1s2a1' }
}
const keyExpire = { type: 'input', inputName: 'keyexpire', value: '36666' }
const mode = {
  router: { type: 'select', inputName: 'mode', options: 'router', value: 'router' },
  switch: { type: 'select', inputName: 'mode', options: 'switch', value: 'switch' },
  hub: { type: 'select', inputName: 'mode', options: 'hub', value: 'hub' }
}

const pingInterval = { type: 'input', inputName: 'pinginterval', value: '100' }
const pingTimeout = { type: 'input', inputName: 'pingtimeout', value: '10' }

// NEW INSTANCE
const instanceName = { type: 'input', inputName: 'id', value: newInstanceName }
const description = { type: 'input', inputName: 'description', value: 'My host' }
const address = { type: 'input', inputName: 'address_0', value: '192.168.1.2' }

describe('Tinc configuration end to end test', () => {
  it('general setup with enabled on', () => {
    const schema = [enabled.true, subnet]
    cy.get('input[id=id]').type(tincInstanceName)
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
      cy.get(`tr[test-id=tablerow-${tincInstanceName}]`).should('be.visible')
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.checkValues(endpoint, schema, sectionName)
      })
      cy.clickEditClose()
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('adds additional subnet field with the same value should error out', () => {
    const schema = [enabled.true, subnet, subnet2]
    cy.get('input[id=id]').type(tincInstanceName)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="listadd-subnet_0"]').click()
        cy.setValues(endpoint, schema, sectionName)
        cy.clickButton('saveandapply')
      })
      cy.checkMessage('Some fields are invalid')
      cy.clickEditClose()
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('advanced settings', () => {
    const schema = [addressFamily.ipv4, bindToAddress, bindToInterface.lan, keyExpire, mode.router, pingInterval, pingTimeout]
    cy.get('input[id=id]').type(tincInstanceName)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    cy.clickSectionAdd()
    cy.get('.inner-tab-item').click({ multiple: true })
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.setValues(endpoint, schema, sectionName)
      })
      cy.clickEditSave()
      cy.get(`tr[test-id=tablerow-${tincInstanceName}]`).should('be.visible')
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.get('.inner-tab-item').click({ multiple: true })
        cy.checkValues(endpoint, schema, sectionName)
      })
      cy.clickEditClose()
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('should create new instance', () => {
    const schema = [instanceName]
    cy.get('input[id=id]').type(tincInstanceName)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.setValues(endpoint, schema, sectionName)
        cy.clickButton('add')
        cy.waitForEditModalOpen()
        cy.getModal().within(() => {
          const schema = [enabled.true, description, address, subnet]
          cy.setValues(endpoint, schema, 'tinc_hosts')
          cy.clickEditSave()
        })
      })
      cy.clickEditClose()
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('should error out when new instance name is longer than 8 characters', () => {
    const schema = [{ type: 'input', inputName: 'id', value: 'longerthan8characters' }]
    cy.get('input[id=id]').type(tincInstanceName)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.setValues(endpoint, schema, sectionName)
        cy.clickButton('add')
        cy.checkMessage('Some fields are invalid')
      })
      cy.clickEditClose()
      cy.clearSection(endpoint, sectionName)
    })
  })
})
