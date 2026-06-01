/* eslint-disable cypress/unsafe-to-chain-command */
const route = '/services/dnp3/serial_client'
const endpoint = '/dnp3/serial/config'
const consoleRoute = '/services/serial_utilities/console'
const consoleEndpoint = '/console/config'
let rs232Options = {}
let rs485Options = {}
let noSerial = false
before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      rs232Options = body.data.board.serial ? body.data.board.serial.find(ser => ser.devices && ser.devices.includes('rs232')) : false
      rs485Options = body.data.board.serial ? body.data.board.serial.find(ser => ser.devices && ser.devices.includes('rs485')) : false
      noSerial = !!(!rs232Options && !rs485Options)
    })
  })
  cy.hitPage(route, endpoint)
})
beforeEach(function () {
  if (noSerial) this.skip()
})

after(() => {
  cy.logout()
})
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const name = { type: 'input', inputName: 'name', value: 'test' }
const serialPort = {
  rs485: { type: 'select', inputName: 'device', options: '/dev/rs485', value: 'rs485' },
  rs232: { type: 'select', inputName: 'device', options: '/dev/rs232', value: 'rs232' }
}
const baudrate = { type: 'select', inputName: 'baudrate', options: '1200', value: '1200' }
const databits = { type: 'select', inputName: 'databits', options: '8', value: '8' }
const stopbits = { type: 'select', inputName: 'stopbits', options: '1', value: '1' }
const parity = { type: 'select', inputName: 'parity', options: 'odd', value: 'Odd' }
const flowcontrol = { type: 'select', inputName: 'flowcontrol', options: 'none', value: 'None' }
const fullDuplexEnabled = { type: 'switch', inputName: 'full_duplex_enabled', value: 'true' }
const timeDuration = { type: 'input', inputName: 'time_duration', value: '888' }
const localAddr = { type: 'input', inputName: 'local_addr', value: '8888' }
const remoteAddr = { type: 'input', inputName: 'remote_addr', value: '8888' }
const integrityPeriod = { type: 'input', inputName: 'integrity_period', value: '59' }
const timeout = { type: 'input', inputName: 'timeout', value: '59' }
const saveToFlash = { type: 'switch', inputName: 'save_to_flash', value: 'true' }

const index = { type: 'input', inputName: 'index', value: '20' }
const count = { type: 'input', inputName: 'count', value: '20' }
const dataType = { type: 'select', inputName: 'data_type', options: '20', value: 'Counter' }

describe('DNP3 Serial Client configuration', () => {
  it('info indication when serial device is enabled validation test', function () {
    cy.hitPage(consoleRoute, consoleEndpoint)
    cy.intercept('POST', `/api${consoleEndpoint}`).as('postConsole')
    cy.clickSectionAdd()
    let sec = ''
    cy.wait('@postConsole').then(res => {
      sec = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-console"]').within(() => {
          cy.setValues(consoleEndpoint, [enabled], sec)
        })
      })
      cy.clickEditSave()
    })
    cy.hitPage(route, endpoint)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.clickSectionAdd()
    let sectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="switch-enabled"]').should('have.class', 'disabled')
        cy.get('[test-id="device-service-enabled-link"]').click()
        cy.url().should('contain', consoleRoute)
        cy.document().its('body').find('.spin-content')
        cy.document().its('body').find('.spin-content').should('not.exist')
      })
      cy.clearSection(consoleEndpoint, sec)
      cy.hitPage(route, endpoint)
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('disabled enable button test', function () {
    cy.hitPage(consoleRoute, consoleEndpoint)
    cy.intercept('POST', `/api${consoleEndpoint}`).as('postConsole')
    cy.clickSectionAdd()
    let sec = ''
    cy.wait('@postConsole').then(res => {
      sec = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-console"]').within(() => {
          cy.setValues(consoleEndpoint, [enabled], sec)
        })
      })
      cy.clickEditSave()
    })
    cy.hitPage(route, endpoint)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.clickSectionAdd()
    let sectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="switch-enabled"]').should('have.class', 'disabled')
      })
      cy.clickEditClose()
      cy.get(`[test-id="tablerow-${sectionName}"]`)
        .scrollIntoView()
        .within(() => {
          cy.get('[test-id="switch-enabled"]').should('have.class', 'disabled')
        })
      cy.clearSection(endpoint, sectionName)
      cy.hitPage(consoleRoute, consoleEndpoint)
      cy.clearSection(consoleEndpoint, sec)
      cy.hitPage(route, endpoint)
    })
  })
  it('overview validation test', function () {
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.clickSectionAdd()
    let sectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.clickEditClose()
      cy.get(`[test-id="tablerow-${sectionName}"]`)
        .scrollIntoView()
        .within(() => {
          cy.clickSwitch('enabled', '1')
        })
      cy.overviewSave('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values')
      cy.clearSection(endpoint, sectionName)
    })
  })
  it('test rs232 serial client configuration', function () {
    if (!rs232Options) this.skip()
    const schema = [enabled, name, serialPort.rs232, baudrate, databits, stopbits, parity, flowcontrol, timeDuration, localAddr, remoteAddr, integrityPeriod, timeout, saveToFlash]
    cy.testConfigurationEdit(endpoint, schema, 'dnp3')
  })
  it('test rs485 serial client configuration', function () {
    if (!rs485Options) this.skip()
    const schema = [enabled, name, serialPort.rs485, baudrate, databits, stopbits, parity, flowcontrol, fullDuplexEnabled, timeDuration, localAddr, remoteAddr, integrityPeriod, timeout, saveToFlash]
    cy.testConfigurationEdit(endpoint, schema, 'dnp3')
  })
  it('test rs232 serial client request configuration', function () {
    if (!rs232Options) this.skip()
    const schema = [enabled, name, serialPort.rs232, baudrate, databits, stopbits, parity, flowcontrol, timeDuration, localAddr, remoteAddr, integrityPeriod, timeout, saveToFlash]
    const schemaNewSection = [name]
    const schema2 = [index, count, dataType, enabled]
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    let requestSectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.intercept('POST', `/api/dnp3/serial/${sectionName}/requests/config`).as('postSection2')
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-dnp3"]').within(() => {
          cy.setValues(endpoint, schema, sectionName)
        })
        cy.get(`[test-id="tablerow-${sectionName}"]`)
          .scrollIntoView()
          .within(() => {
            cy.setValues(endpoint, schemaNewSection, sectionName)
            cy.clickSectionAdd()
          })
      })
      cy.wait('@postSection2').then(res => {
        requestSectionName = res.response.body.data.id
        cy.getModal().within(() => {
          cy.get(`[test-id="tablerow-${requestSectionName}"]`)
            .scrollIntoView()
            .within(() => {
              cy.setValues(endpoint, schema2, requestSectionName)
            })
        })
        cy.clickEditSave()
        cy.openLastCreatedEdit()
        cy.getModal().within(() => {
          cy.get('[test-id="tablerow-dnp3"]').within(() => {
            cy.checkValues(endpoint, schema, sectionName)
          })
          cy.get(`[test-id="tablerow-${requestSectionName}"]`)
            .scrollIntoView()
            .within(() => {
              cy.checkValues(endpoint, schema2, requestSectionName)
            })
        })
        cy.clearSection(endpoint, requestSectionName)
        cy.clickEditSave()
        cy.clearSection(endpoint, sectionName)
      })
    })
  })
  it('test rs485 serial client request configuration', function () {
    if (!rs485Options) this.skip()
    const schema = [enabled, name, serialPort.rs485, baudrate, databits, stopbits, parity, flowcontrol, fullDuplexEnabled, timeDuration, localAddr, remoteAddr, integrityPeriod, timeout, saveToFlash]
    const schemaNewSection = [name]
    const schema2 = [index, count, dataType, enabled]
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    let requestSectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.intercept('POST', `/api/dnp3/serial/${sectionName}/requests/config`).as('postSection2')
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-dnp3"]').within(() => {
          cy.setValues(endpoint, schema, sectionName)
        })
        cy.get(`[test-id="tablerow-${sectionName}"]`)
          .scrollIntoView()
          .within(() => {
            cy.setValues(endpoint, schemaNewSection, sectionName)
            cy.clickSectionAdd()
          })
      })
      cy.wait('@postSection2').then(res => {
        requestSectionName = res.response.body.data.id
        cy.getModal().within(() => {
          cy.get(`[test-id="tablerow-${requestSectionName}"]`)
            .scrollIntoView()
            .within(() => {
              cy.setValues(endpoint, schema2, requestSectionName)
            })
        })
        cy.clickEditSave()
        cy.openLastCreatedEdit()
        cy.getModal().within(() => {
          cy.get('[test-id="tablerow-dnp3"]').within(() => {
            cy.checkValues(endpoint, schema, sectionName)
          })
          cy.get(`[test-id="tablerow-${requestSectionName}"]`)
            .scrollIntoView()
            .within(() => {
              cy.checkValues(endpoint, schema2, requestSectionName)
            })
        })
        cy.clearSection(endpoint, requestSectionName)
        cy.clickEditSave()
        cy.clearSection(endpoint, sectionName)
      })
    })
  })
})
