const route = '/cloud_solutions/thingworx'
const endpoint = '/thingworx/config/thingworx'

let mobileInterfaces = []
before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/interfaces/config`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      mobileInterfaces = body.data.filter(s => s.proto === 'wwan' || s.proto === 'connm')
    })
  })
  cy.hitPage(route)
})
after(() => {
  cy.logout()
})
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const serverAdress = { type: 'input', inputName: 'server', value: 'abc.thingworkx.com' }
const serverPort = { type: 'input', inputName: 'port', value: '8000' }
const thingName = { type: 'input', inputName: 'thing', value: 'testThing' }
const applicationKey = { type: 'input', inputName: 'appkey', value: 'fsdjng4yt78745412zasda87df' }
const mobileInterface = { type: 'select', inputName: 'iface', value: '0', depend: mobileInterfaces.length > 0 }

const inputs = [enabled, serverAdress, serverPort, thingName, applicationKey, mobileInterface]

describe('ThingWorx configuration', () => {
  it('Configuration with enabled service', () => {
    cy.testNamedConfiguration(endpoint, inputs, 'thingworx')
  })
  it('Check require dependency on enable, with empty `serverAdress` option', () => {
    const emptyServerAdresss = serverAdress
    emptyServerAdresss.value = ''
    const schema = [enabled, emptyServerAdresss, serverPort, thingName, applicationKey, mobileInterface]
    cy.testNamedConfiguration(endpoint, schema, 'thingworx', 'Some fields are invalid')
  })
  it('Check require dependency on enable, with empty `serverPort` option', () => {
    const emptyServerPort = serverPort
    emptyServerPort.value = ''
    const schema = [enabled, serverAdress, emptyServerPort, thingName, applicationKey, mobileInterface]
    cy.testNamedConfiguration(endpoint, schema, 'thingworx', 'Some fields are invalid')
  })
  it('Check require dependency on enable, with empty `thingName` option', () => {
    const emptyThingName = thingName
    emptyThingName.value = ''
    const schema = [enabled, serverAdress, serverPort, emptyThingName, applicationKey, mobileInterface]
    cy.testNamedConfiguration(endpoint, schema, 'thingworx', 'Some fields are invalid')
  })
  it('Check require dependency on enable, with empty `applicationKey` option', () => {
    const emptyApplicationKey = applicationKey
    emptyApplicationKey.value = ''
    const schema = [enabled, serverAdress, serverPort, thingName, emptyApplicationKey, mobileInterface]
    cy.testNamedConfiguration(endpoint, schema, 'thingworx', 'Some fields are invalid')
  })
  it('Configuration with empty config when disabled', () => {
    const disabled = enabled
    disabled.value = 'false'
    const emptyServerAdresss = serverAdress
    emptyServerAdresss.value = ''
    const emptyServerPort = serverPort
    emptyServerPort.value = ''
    const emptyThingName = thingName
    emptyThingName.value = ''
    const emptyApplicationKey = applicationKey
    emptyApplicationKey.value = ''
    const schema = [disabled, emptyServerAdresss, emptyServerPort, emptyThingName, emptyApplicationKey, mobileInterface]
    cy.testNamedConfiguration(endpoint, schema, 'thingworx')
  })
})
