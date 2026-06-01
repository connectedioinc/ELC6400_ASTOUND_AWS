const route = '/services/webfilter/site'
const webfilterEndpoint = '/webfilter/global'
const hostnamesEndpoint = '/webfilter/config'

const hostnameText = 'test' + Math.floor(Math.random() * 100) + 1

before(function () {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const enabled = {
  on: { type: 'switch', inputName: 'enabled', value: 'true' },
  off: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const mode = {
  whitelist: { type: 'select', inputName: 'mode', options: 'whitelist', value: 'Whitelist' },
  blacklist: { type: 'select', inputName: 'mode', options: 'blacklist', value: 'Blacklist' }
}
const network = {
  all: { type: 'select', inputName: 'network', options: 'all', value: 'All LAN interfaces' },
  hotspot: { type: 'select', inputName: 'network', options: 'hotspot', value: 'Hotspot' }
}

const hostList = { type: 'button', name: 'host', value: 'tests/cypress/fixtures/hostlist.txt' }

const hostname = { type: 'input', inputName: 'host', value: 'myhost.example.com' }

describe('Site blocking settings', () => {
  it('Configures instance with "enabled" = "off" and "mode" = "whitelist"', function () {
    const schema = [enabled.off, mode.whitelist, network.all]
    cy.testNamedConfiguration(webfilterEndpoint, schema, 'config')
  })
  it('Configures instance with "enabled" = "on" and "mode" = "whitelist"', function () {
    const schema = [enabled.on, mode.whitelist, network.all]
    cy.testNamedConfiguration(webfilterEndpoint, schema, 'config')
  })
  it('Configures instance with "enabled" = "off" and "mode" = "blacklist" ', function () {
    const schema = [enabled.off, mode.blacklist, network.all]
    cy.testNamedConfiguration(webfilterEndpoint, schema, 'config')
  })
  it('Configures instance with "enabled" = "on" and "mode" = "blacklist"', function () {
    const schema = [enabled.on, mode.blacklist, network.all]
    cy.testNamedConfiguration(webfilterEndpoint, schema, 'config')
  })
  it('should upload host file', function () {
    let sectionName = ''
    cy.intercept('POST', `api${hostnamesEndpoint}`).as('postSection')
    cy.uploadFile('host', hostList.value, true)
    cy.checkMessage('The host list was uploaded successfully')
    cy.get('[test-id="tablerow-block"]').find('tr').should('have.length', 3)
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data
      sectionName.forEach(item => {
        cy.clearSection(null, item.id)
      })
    })
  })
})

describe('Site blocking rules', () => {
  it('should add host name to the list with "enabled" = "off"', function () {
    const schema = [hostname]
    cy.testTypedOverviewConfiguration(hostnamesEndpoint, schema)
  })
  it('should add host name to the list with "enabled" = "on"', function () {
    const schema = [hostname, enabled.on]
    cy.intercept('POST', `/api${hostnamesEndpoint}`).as('postSection')
    let rowName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      rowName = res.response.body.data.id
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.get(`[test-id="tablerow-${rowName}"]`)
        .scrollIntoView()
        .within(() => {
          cy.get('[test-id="input-host"]').type(hostnameText)
          cy.clickSwitch('enabled', '1')
        })
      cy.testNamedConfiguration(hostnamesEndpoint, schema, rowName)
      cy.clearSection(hostnamesEndpoint, rowName)
    })
  })
})
