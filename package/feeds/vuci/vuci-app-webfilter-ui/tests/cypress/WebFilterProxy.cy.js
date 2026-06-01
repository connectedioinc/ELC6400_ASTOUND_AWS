const route = '/services/webfilter/proxy'
const endpoint = '/sstp/config'

before(() => {
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

const urlContent = { type: 'list', inputName: 'url', value: ['google.com', 'gitlab.com'] }

describe('"Proxy Based Content Blocker" configuration end to end tests', () => {
  it('Configures instance with "enabled" = "off" and "mode" = "whitelist"', () => {
    const schema = [enabled.off, mode.whitelist, urlContent]
    cy.testNamedConfiguration(endpoint, schema, 'privoxy')
  })
  it('Configures instance with "enabled" = "on" and "mode" = "blacklist"', () => {
    cy.get('[test-id="listremove-url_1"]').click()
    const schema = [enabled.on, mode.blacklist, urlContent]
    cy.testNamedConfiguration(endpoint, schema, 'privoxy')
  })
  it('Configures instance with "enabled" = "off", "mode" = "blacklist" and no "urlContent" (resets values)', () => {
    cy.get('[test-id="listremove-url_1"]').click()
    const urlContent = { type: 'list', inputName: 'url', value: [''] }
    const schema = [enabled.on, mode.blacklist, urlContent]
    cy.testNamedConfiguration(endpoint, schema, 'privoxy')
  })
})
