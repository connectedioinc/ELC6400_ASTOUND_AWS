const route = '/network/dns'
const endpoint = '/dns/config'

before(() => {
  cy.login()
})
beforeEach(() => {
  cy.hitPage(route)
})
after(() => {
  cy.logout()
})

describe('DNS configuration', () => {
  it('Configuration with enabled service and every field filled', () => {
    // General
    const logqueries = { type: 'switch', inputName: 'logqueries', value: 'true' }
    const server = { type: 'list', inputName: 'server', value: ['/example.org/10.1.2.3'] }
    const rebindProtection = { type: 'switch', inputName: 'rebind_protection', value: 'true' }
    const localservice = { type: 'switch', inputName: 'localservice', value: 'true' }
    const iInterface = { type: 'multiselect', inputName: 'interface', value: [{ options: 'lan', value: 'lan' }] }
    const notinterface = { type: 'multiselect', inputName: 'notinterface', value: [{ options: 'lan', value: 'lan' }] }
    // Advanced
    const boguspriv = { type: 'switch', inputName: 'boguspriv', value: 'true' }
    const localiseQueries = { type: 'switch', inputName: 'localise_queries', value: 'true' }
    const serversfile = { type: 'uploadFile', inputName: 'serversfile', value: 'tests/cypress/fixtures/serverfile.txt' }
    const cachesize = { type: 'input', inputName: 'cachesize', value: '100' }
    const schema = [
      {
        tab: 'General Settings',
        inputs: [logqueries, server, rebindProtection, localservice, iInterface, notinterface]
      },
      {
        tab: 'Advanced Settings',
        inputs: [boguspriv, localiseQueries, serversfile, cachesize]
      }
    ]
    cy.testNamedConfiguration(endpoint, schema, 'dnsmasq')
  })
  it('Configuration with disabled service and every field emptied', () => {
    // General
    const logqueries = { type: 'switch', inputName: 'logqueries', value: 'false' }
    const server = { type: 'list', inputName: 'server', value: [] }
    const rebindProtection = { type: 'switch', inputName: 'rebind_protection', value: 'false' }
    const localservice = { type: 'switch', inputName: 'localservice', value: 'false' }
    // Advanced
    const boguspriv = { type: 'switch', inputName: 'boguspriv', value: 'false' }
    const localiseQueries = { type: 'switch', inputName: 'localise_queries', value: 'false' }
    const serversfile = { type: 'uploadFile', inputName: 'serversfile' }
    const cachesize = { type: 'input', inputName: 'cachesize', value: '1' }
    const iInterface = { type: 'multiselect', inputName: 'interface', value: [] }
    const notinterface = { type: 'multiselect', inputName: 'notinterface', value: [] }
    const schema = [
      {
        tab: 'General Settings',
        inputs: [logqueries, server, rebindProtection, localservice, iInterface, notinterface]
      },
      {
        tab: 'Advanced Settings',
        inputs: [boguspriv, localiseQueries, serversfile, cachesize]
      }
    ]
    cy.testNamedConfiguration(endpoint, schema, 'dnsmasq')
  })
})
