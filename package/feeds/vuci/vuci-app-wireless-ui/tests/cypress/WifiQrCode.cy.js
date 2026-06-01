import { fields } from './WifiInterfaceFields'

const route = '/network/wireless/ssids'
const wifiSection = 'radio0'
const endpoint = '/wireless/interfaces/config'

before(() => {
  cy.login()
  cy.boardCondition(data => data.board.hwinfo.wifi)
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

function testQr(schema, showCredentials) {
  const aditionalTest = id => {
    cy.log(id)
    cy.get(`[test-id="tablerow-${id}"]`).within(() => {
      cy.clickButton('qrCode')
      if (!showCredentials) cy.get('[test-id="checkbox-showCredentials"]').filterVisible().click()
      cy.clickButton('downloadCard')
      const qrCodeFile = `${Cypress.config('downloadsFolder')}/QR_Code.png`
      cy.readFile(qrCodeFile)
      cy.task('deleteFile', qrCodeFile)
      cy.clickButton('close')
    })
  }
  cy.testConfigurationEdit(endpoint, schema, 'wifiInterfaces', aditionalTest)
}

describe('least posible options, credentials off', () => {
  it('simplest', () => {
    cy.get(`[test-id="tablerow-${wifiSection}"]`).within(() => {
      const schema = [
        {
          tab: 'General Setup',
          inputs: [{ ...fields.ssid, value: 'Custom interface' }]
        },
        {
          tab: 'Wireless Security',
          inputs: [fields.encryption.none]
        }
      ]
      testQr(schema, false)
    })
  })
  it('all options, credentials on', () => {
    cy.get(`[test-id="tablerow-${wifiSection}"]`).within(() => {
      const schema = [
        {
          tab: 'General Setup',
          inputs: [{ ...fields.ssid, value: 'Custom interface' }, { ...fields.key, value: 'myPassword' }, fields.hidden.on]
        }
      ]
      testQr(schema, true)
    })
  })
})
