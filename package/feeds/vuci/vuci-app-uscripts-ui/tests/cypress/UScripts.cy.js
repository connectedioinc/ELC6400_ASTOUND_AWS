const route = '/system/maintenance/uscripts'
const fileEndpoint = '/uscripts/config'
const uploadEndpoint = '/uscripts/actions/upload'
let restoreData = {}

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${fileEndpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      restoreData = body.data
    })
  })
  cy.hitPage(route, fileEndpoint)
})

after(() => {
  const formData = new FormData()
  const file = new File([restoreData.script], 'rc.local')
  formData.append('file', file)
  cy.request({
    method: 'POST',
    url: `${Cypress.config('baseUrl')}/api${uploadEndpoint}`,
    body: formData,
    headers: {
      Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
      'Content-type': 'application/json'
    }
  })
  cy.logout()
})

const textarea = { type: 'textarea', inputName: 'null', value: 'exit 0' }

describe('Startup script configuration', () => {
  it('Clears text area', () => {
    // eslint-disable-next-line cypress/unsafe-to-chain-command
    cy.getTextarea('null').click().clear()
    cy.overviewSave(' Custom scripts have been applied ')
  })
  it('Enters text into text area', () => {
    const schema = [textarea]
    cy.testNamedConfiguration(uploadEndpoint, schema, '', ' Custom scripts have been applied ')
  })
})
