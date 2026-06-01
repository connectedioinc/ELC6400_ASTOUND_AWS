const routeReadMessages = '/services/mobile_utilities/sms_messages/read'
const routeSendMessages = '/services/mobile_utilities/sms_messages/send'
const routeStorage = '/services/mobile_utilities/sms_messages/storage'
const endpointStorage = '/messages/storage/config'
const routeModemControl = '/services/serial_utilities/modem_control'
const endpointModemControl = '/modem_control/config'

const sectionName = 'sms_storage'
let hasPackage = true
let modems = []
let initialStorage = []

before(() => {
  cy.login()

  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/packages/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasPackage = body.data.includes('/usr/lib/opkg/info/mobutils.control')
    })
  })

  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/modems/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      modems = body.data
    })
  })
})

beforeEach(() => {
  if (!hasPackage) this.skip()
})

after(() => {
  cy.logout()
})

// Send messages
const modem = {
  primary: { type: 'select', inputName: 'modem', options: '3-1', value: 'Primary Modem' },
  secondary: { type: 'select', inputName: 'modem', options: '1-1.2', value: 'Secondary Modem' }
}
const number = { type: 'input', inputName: 'number', value: '+37012345678' }
const message = { type: 'textarea', inputName: 'message', value: 'test' }

// Storage
const msgStorage = {
  sm: { type: 'select', inputName: 'msg_storage', options: 'sm', value: 'SIM Card' },
  me: { type: 'select', inputName: 'msg_storage', options: 'me', value: 'Modem storage' }
}
const free = { type: 'input', inputName: 'free', value: '21' }

// Modem control
const enable = { type: 'switch', inputName: 'enabled', value: 'true' }
const name = { type: 'input', inputName: 'name', value: 'test' }

const ctlMode = { type: 'select', inputName: 'ctl_mode', options: 'full', value: 'Full control' }

describe('Messages configuration', () => {
  it('Message when modem is in full controll', function () {
    const schema = [enable, name, ctlMode]
    cy.hitPage(routeModemControl, endpointModemControl)
    cy.intercept('POST', `/api${endpointModemControl}`).as('postSection')
    cy.clickSectionAdd()
    let sec = ''
    cy.wait('@postSection').then(res => {
      sec = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.setValues(endpointModemControl, schema, sec)
        cy.clickEditSave()
      })

      cy.hitPage(routeReadMessages)
      cy.get('[test-id="message-modem-fullcontrol-enabled"]').should('be.visible')
      cy.hitPage(routeSendMessages)
      cy.get('[test-id="message-modem-fullcontrol-enabled"]').should('be.visible')
      cy.hitPage(routeStorage)
      cy.get('[test-id="message-modem-fullcontrol-enabled"]').should('be.visible')

      cy.hitPage(routeModemControl)
      cy.clearSection(endpointModemControl, sec)
    })
  })
  describe('Read messages configuration', () => {
    beforeEach(() => {
      cy.hitPage(routeReadMessages)
    })

    it.each([
      ['deleting all messages', 'deleteall', ' There are no messages to delete '],
      ['deleting selected messages', 'delete', ' There are no messages to delete ']
    ])('Configuration when %s fails', function (_, button, message) {
      cy.clickButton(button)
      cy.clickButton('ok')
      cy.checkMessage(message)
    })

    it('Configuration when messages are refreshed', function () {
      cy.clickButton('refresh')
    })
  })
  describe('Send messages configuration', () => {
    it.each([
      ['Default', {}, 0, modems.length !== 1],
      ['Primary', modem.primary, 0, modems.length < 2],
      ['Secondary', modem.secondary, 0, modems.length < 2]
    ])('Configuration when message is sent from %s modem', function (_, modem, index, check) {
      if (check) this.skip()
      cy.hitPage(routeSendMessages)
      const schema = [modem, number, message]
      cy.intercept('POST', '/api/mobile_utilities/sms_messages/send/actions/send').as('postMessage')
      schema.forEach(value => {
        cy.fillValues(value)
      })
      cy.clickButton('send')
      if ((index === 1 && modems.length < 2) || modems[index].simstate !== 'Inserted') {
        cy.checkMessage(' Failed to send message. SIM card is not inserted ')
      } else {
        cy.wait('@postMessage').then(res => {
          if (res.response.body.success) {
            cy.checkMessage(' Message was sent successfully ')
          } else {
            cy.checkMessage(' Failed to send message ')
          }
        })
      }
    })
  })
  describe('Storage configuration', () => {
    before(() => {
      cy.then(() => {
        cy.request({
          method: 'GET',
          url: `${Cypress.config('baseUrl')}/api${endpointStorage}`,
          headers: {
            Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
            'Content-type': 'application/json'
          }
        }).then(({ body }) => {
          initialStorage = body.data
        })
      })
    })

    const testModemSection = (schema, section) => {
      cy.get(`[test-id="tablerow-${sectionName}"]`).within(() => {
        cy.get(`[test-id="tablerow-${section.id}"]`).within(() => {
          cy.setValues(endpointStorage, schema, sectionName)
        })
      })
      cy.overviewSave(' Configuration has been applied ')
      cy.get(`[test-id="tablerow-${sectionName}"]`).within(() => {
        cy.get(`[test-id="tablerow-${section.id}"]`).within(() => {
          cy.checkValues(endpointStorage, schema, sectionName)
        })
      })
    }

    it.each([
      ['SIM Card', [msgStorage.sm, free], 0],
      ['Modem storage', [msgStorage.me, free], 0],
      ['SIM Card with second modem', [msgStorage.sm, free], 1],
      ['Modem storage with second modem', [msgStorage.me, free], 1]
    ])('Configuration when save messages to is %s', function (_, schema, index) {
      if ((index === 1 && modems.length < 2) || modems[index].simstate !== 'Inserted') this.skip()
      cy.hitPage(routeStorage)
      testModemSection(schema, initialStorage[index])
    })

    after(() => {
      if (hasPackage) {
        cy.then(() => {
          initialStorage.forEach(data => {
            delete data.modem_id
          })

          cy.request({
            method: 'PUT',
            url: `${Cypress.config('baseUrl')}/api${endpointStorage}`,
            headers: {
              Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
              'Content-type': 'application/json'
            },
            body: {
              data: initialStorage
            }
          })
        })
      }
    })
  })
})
