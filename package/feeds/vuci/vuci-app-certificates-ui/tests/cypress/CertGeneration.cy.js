const route = '/system/admin/certificates/generation'
const managerRoute = '/system/admin/certificates/manager'
const endpoint = '/certificates/config'
const generateMessage = 'Certificate generation started'

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${endpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  })
  cy.visit(route)
})

after(() => {
  cy.logout()
})

beforeEach(function () {
  cy.visit(route)
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(3000)
  cy.get('[test-id="router-wrapper"]', { timeout: 180000 }).should('not.contain', 'Generating...')
})

const fileType = {
  simple: { type: 'select', inputName: 'type', options: 'simple', value: 'Simple' },
  ca: { type: 'select', inputName: 'type', options: 'ca', value: 'CA' },
  server: { type: 'select', inputName: 'type', options: 'server', value: 'Server' },
  client: { type: 'select', inputName: 'type', options: 'client', value: 'Client' },
  dh: { type: 'select', inputName: 'type', options: 'dh', value: 'DH Parameters' }
}
const keys = {
  key512: { type: 'select', inputName: 'key', options: '512', value: '512' }
}
const typeOfCertificate = {
  certificateAuthority: { type: 'select', inputName: 'cert_generation_sign_type', options: 'ca', value: 'Certificate Authority' },
  serverCertificate: { type: 'select', inputName: 'cert_generation_sign_type', options: 'server', value: 'Server Certificate' },
  clientCertificate: { type: 'select', inputName: 'cert_generation_sign_type', options: 'client', value: 'Client Certificate' }
}

const name1 = {
  unsigned_test: { type: 'input', inputName: 'name', value: 'unsigned_test' },
  server_test: { type: 'input', inputName: 'name', value: 'server_test' },
  client_test: { type: 'input', inputName: 'name', value: 'client_test' },
  ca_test: { type: 'input', inputName: 'name', value: 'ca_test' }
}

const certificateGenerationSign = { type: 'switch', inputName: 'certificate_generation_sign', value: 'true' }
const days = { type: 'input', inputName: 'days', value: '180' }

const subjectInformationAndSignIn = () => {
  cy.clickSwitch('certificate_generation_subject', true)
  cy.fillInput('subject_cc', 'LT')
  cy.fillInput('subject_st', 'KN')
  cy.fillInput('subject_l', 'Kaunas')
  cy.fillInput('subject_o', 'Teltonika')
  cy.fillInput('subject_ou', 'Networks')
  cy.clickSwitch('certificate_generation_sign', true)
  cy.fillInput('days', '180')
  cy.clickSwitch('certificate_generation_delete_sign', true)
}

describe('Certificate generation configuration', () => {
  // TODO: simple certificate creates very slowly, needs improvement in future
  // it('Generates simple certificate', () => {
  //   cy.fillValues(fileType.simple)
  //   cy.clickButton('generate')
  // })
  it('Generates unsigned server certificate', () => {
    const schema = [fileType.server, keys.key512, name1.unsigned_test]
    cy.setValues(null, schema)
    cy.clickButton('generate')
    cy.checkMessage(generateMessage)
  })
  it('Generates signed ca certificate', () => {
    const schema = [fileType.ca, keys.key512, name1.ca_test]
    cy.setValues(null, schema)
    subjectInformationAndSignIn()
    cy.clickButton('generate')
    cy.checkMessage(generateMessage)
  })
  it('Checks if unsigned server and signed ca certificates are created', () => {
    cy.visit(managerRoute)
    cy.get('[test-id="tablecolumns-fullname"]').contains('unsigned_test.key.pem').siblings('[test-id="tablecolumns-remove"]').children().get('.btn')
    cy.get('[test-id="tablecolumns-fullname"]').contains('ca_test.cert.pem').siblings('[test-id="tablecolumns-remove"]').children().get('.btn')
    cy.visit(route)
  })
  it('Generates signed server certificate', () => {
    cy.visit(managerRoute)
    cy.get('[test-id="router-wrapper"]', { timeout: 180000 }).should('not.contain', 'Generating...')
    cy.visit(route)
    const schema = [fileType.server, keys.key512, name1.server_test]
    cy.setValues(null, schema)
    subjectInformationAndSignIn()
    cy.clickButton('generate')
    cy.checkMessage(generateMessage)
  })
  it('Generates signed client certificate', () => {
    cy.visit(route)
    const schema = [fileType.client, keys.key512, name1.client_test]
    const schema2 = [certificateGenerationSign, days]
    cy.setValues(null, schema)
    subjectInformationAndSignIn()
    cy.setValues(null, schema2)
    cy.clickButton('generate')
    cy.checkMessage(generateMessage)
  })
  // TODO: DH certificate creates very slowly, needs improvement in future
  // it('Generates DH Parameters certificate', () => {
  //   cy.fillValues(fileType.dh)
  //   cy.fillValues(keys.key2048)
  //   cy.fillInput('name','dh_test')
  //   cy.clickButton('generate')
  // })
})

describe('Certificate signing configuration', () => {
  it('Signs unsigned server certificate', () => {
    cy.fillInput('cert_generation_sign_name', 'signed_test')
    cy.fillValues(typeOfCertificate.serverCertificate)
    cy.fillInput('valid', '180')
    cy.clickButton('sign')
  })
})

describe('Certificate manager configuration', () => {
  it('Deletes created certificates', () => {
    cy.visit(managerRoute)
    cy.get('[test-id="router-wrapper"]', { timeout: 180000 }).should('not.contain', 'Generating...')
    cy.get('[test-id="tablecolumns-fullname"]')
      .not('.mobile-column')
      .each(() => {
        cy.get('[test-id="tablecolumns-remove"] > .btn')
          .last()
          .then(el => {
            cy.wrap(el).click()
            cy.clickButton('ok')
            cy.wrap(el).should('not.exist')
          })
      })
  })
})
