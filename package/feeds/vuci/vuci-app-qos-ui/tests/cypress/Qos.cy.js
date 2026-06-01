const route = '/network/traffic_shaping/qos'
const interfacesEndpoint = '/qos/interfaces/config'
const rulesEndpoint = '/qos/rules/config'
let targetOptions = []

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/qos/rules/options`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      targetOptions = body.data.classes
    })
  })
  cy.hitPage(route, interfacesEndpoint)
})

after(() => {
  cy.logout()
})

describe('QoS configuration', () => {
  it('QoS interfaces configuration', () => {
    cy.clearSection(interfacesEndpoint, 'lan')
    const schema = [
      { type: 'switch', inputName: 'overhead', value: 'false' },
      { type: 'input', inputName: 'download', value: '1024' },
      { type: 'input', inputName: 'upload', value: '128' },
      { type: 'switch', inputName: 'enabled', value: 'false' }
    ]
    cy.intercept('POST', `/api${interfacesEndpoint}`).as('postSection')
    let sectionName = ''
    cy.selectValue('id', 'lan', 'lan')
    cy.clickSectionAdd('qos')
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.testNamedConfiguration(interfacesEndpoint, schema, sectionName)
    })
  })
  it('QoS classification rules configuration', () => {
    const targetValue = targetOptions[targetOptions.length - 1]
    const schema = [
      { type: 'select', inputName: 'target', options: targetValue, value: targetValue },
      { type: 'select', inputName: 'srchost', options: '', value: 'All' },
      { type: 'select', inputName: 'dsthost', options: '', value: 'All' },
      { type: 'select', inputName: 'proto', options: '', value: 'All' },
      { type: 'select', inputName: 'ports', options: '', value: 'All' }
    ]
    cy.testTypedOverviewConfiguration(rulesEndpoint, schema, 'classify')
  })
})
