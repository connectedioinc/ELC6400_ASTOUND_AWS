const route = '/system/maintenance/backup'
const downloadEndpoint = '/backup/actions/download'

before(() => {
  cy.login()
  cy.visit(route)
})

after(() => {
  cy.logout()
})

describe('Configuration backup', () => {
  it('Downloads backup and shows restore backup page after successfull upload', () => {
    cy.intercept('POST', `/api${downloadEndpoint}`).as('getFile')
    cy.clickButton('download')
    cy.checkMessage('Backup download was successful')
    cy.wait('@getFile').then(interception => {
      const fileName = interception.response.headers['content-disposition'].split('filename=')[1].replace(/"/g, '')
      cy.uploadFile('backup_file', `tests/cypress/downloads/${fileName}`, true)
    })
    cy.get('[test-id="section-upload-backup-archive"]').contains('Upload Backup Archive').should('be.visible')
    cy.get('[test-id="button-cancel"]').should('be.visible')
    cy.get('[test-id="button-proceed"]').should('be.visible')
    cy.clickButton('cancel')
  })
  it('Shows side error for encrypted backup if archiver package is not installed', () => {
    cy.clickSwitch('encrypt')
    cy.get('.alert').contains('7z Format Archiver package is needed to encrypt and archive Troubleshoot file. A package can be installed using the').should('be.visible')
  })
})
