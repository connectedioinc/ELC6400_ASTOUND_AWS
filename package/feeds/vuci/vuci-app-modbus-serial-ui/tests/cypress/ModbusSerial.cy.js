const route = '/services/modbus/modbus_serial_client'
const endpoint = '/modbus/client/serial/config'
const serverEndpoint = '/modbus/client/serial/servers/config'
const consoleRoute = '/services/serial_utilities/console'
const consoleEndpoint = '/console/config'
let rs232Options = {}
let rs485Options = {}
let rs232Status = false
let noSerial = {}
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
      if (noSerial) return
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/serial/status`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        rs232Status = body.data.some(dat => dat.name === '/dev/rs232' && dat.is_used === '1')
      })
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

// modbus configuration

const instanceName = 'test' + Math.floor(Math.random() * 100) + 1
const enabled = {
  true: { type: 'switch', inputName: 'enabled', value: 'true' },
  false: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const name1 = { type: 'input', inputName: 'name', value: 'test' }
const serverID = { type: 'input', inputName: 'server_id', value: '3' }
const skipOnTMOS = { type: 'input', inputName: 'skip_on_many_tmos', value: '5' }
const frequency = {
  period: { type: 'select', inputName: 'frequency', options: 'period', value: 'Period' },
  schedule: { type: 'select', inputName: 'frequency', options: 'schedule', value: 'Schedule' }
}
const period = { type: 'input', inputName: 'period', value: '5' }
const schedule = { type: 'list', inputName: 'schedule', value: ['12:15:37', '18:29:59'] }
const timeout = { type: 'input', inputName: 'timeout', value: '5' }
const device = {
  rs485: { type: 'select', inputName: 'device', options: '/dev/rs485', value: 'rs485' },
  rs232: { type: 'select', inputName: 'device', options: '/dev/rs232', value: 'rs232' }
}
const baudrate = { type: 'select', inputName: 'baudrate', options: '1200', value: '1200' }
const databits = { type: 'select', inputName: 'databits', options: '8', value: '8' }
const stopbits = { type: 'select', inputName: 'stopbits', options: '1', value: '1' }
const parity = { type: 'select', inputName: 'parity', options: 'odd', value: 'Odd' }
const flowcontrol = { type: 'select', inputName: 'flowcontrol', options: 'none', value: 'None' }
const duplex = {
  true: { type: 'switch', inputName: 'full_duplex_enabled', value: 'true' },
  false: { type: 'switch', inputName: 'full_duplex_enabled', value: 'false' }
}
const parityDisplay = {
  none: 'None',
  odd: 'Odd',
  even: 'Even',
  mark: 'Mark',
  space: 'Space'
}
const flowControlDisplay = {
  none: 'None',
  'rts/cts': 'RTS/CTS',
  'xon/xoff': 'Xon/Xoff'
}

describe('Modbus serial server tests', () => {
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
          cy.setValues(consoleEndpoint, [enabled.true], sec)
        })
      })
      cy.clickEditSave()
    })
    cy.hitPage(route, endpoint)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.get('#section-modbus-serial-device-configuration').within(() => {
      cy.get('input[id=name]').type(instanceName)
      cy.clickSectionAdd()
    })
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
          cy.setValues(consoleEndpoint, [enabled.true], sec)
        })
      })
      cy.clickEditSave()
    })
    cy.hitPage(route, endpoint)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.get('[test-id="tablerow-modbusSerialClient"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
    })
    cy.clickSectionAdd('modbusSerialClient')
    let sectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="switch-enabled"]').should('have.class', 'disabled')
      })
      cy.clickEditClose()
      // eslint-disable-next-line cypress/unsafe-to-chain-command
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
  describe('Base Configuration', () => {
    it('base configuration with full duplex enabled and rs485 configuration', function () {
      if (!rs485Options) this.skip()
      baudrate.value = rs485Options.bauds[0]
      baudrate.options = rs485Options.bauds[0]
      databits.value = rs485Options.data_bits[0]
      databits.options = rs485Options.data_bits[0]
      stopbits.value = rs485Options.stop_bits[0]
      stopbits.options = rs485Options.stop_bits[0]
      parity.value = parityDisplay[rs485Options.parity_types[0]]
      parity.options = rs485Options.parity_types[0]
      flowcontrol.value = flowControlDisplay[rs485Options.flow_control[0]]
      flowcontrol.options = rs485Options.flow_control[0]
      const enable = rs232Status ? enabled.false : enabled.true
      const schema = [enable, name1, device.rs485, baudrate, databits, stopbits, parity, duplex.true, flowcontrol]
      cy.get('[test-id="tablerow-modbusSerialClient"]').within(() => {
        cy.get('input[id=name]').type(instanceName)
      })
      cy.testConfigurationEdit(endpoint, schema, 'modbusSerialClient')
    })
    it('base configuration with full duplex and instance disabled, rs485', function () {
      if (!rs485Options) this.skip()
      baudrate.value = rs485Options.bauds[0]
      baudrate.options = rs485Options.bauds[0]
      databits.value = rs485Options.data_bits[0]
      databits.options = rs485Options.data_bits[0]
      stopbits.value = rs485Options.stop_bits[0]
      stopbits.options = rs485Options.stop_bits[0]
      parity.value = parityDisplay[rs485Options.parity_types[0]]
      parity.options = rs485Options.parity_types[0]
      flowcontrol.value = flowControlDisplay.none
      flowcontrol.options = 'none'
      const enable = rs232Status ? enabled.false : enabled.true
      const schema = [enable, name1, device.rs485, baudrate, databits, stopbits, parity, flowcontrol, duplex.false]
      cy.get('[test-id="tablerow-modbusSerialClient"]').within(() => {
        cy.get('input[id=name]').type(instanceName)
      })
      cy.testConfigurationEdit(endpoint, schema, 'modbusSerialClient')
    })
    it('base configuration rs232', function () {
      if (!rs232Options) this.skip()
      baudrate.value = rs232Options.bauds[0]
      baudrate.options = rs232Options.bauds[0]
      databits.value = rs232Options.data_bits[0]
      databits.options = rs232Options.data_bits[0]
      stopbits.value = rs232Options.stop_bits[0]
      stopbits.options = rs232Options.stop_bits[0]
      parity.value = parityDisplay[rs232Options.parity_types[0]]
      parity.options = rs232Options.parity_types[0]
      flowcontrol.value = flowControlDisplay[rs232Options.flow_control[0]]
      flowcontrol.options = rs232Options.flow_control[0]
      const enable = rs232Status ? enabled.false : enabled.true
      const schema = [enable, name1, device.rs232, baudrate, databits, stopbits, parity, flowcontrol]
      cy.get('[test-id="tablerow-modbusSerialClient"]').within(() => {
        cy.get('input[id=name]').type(instanceName)
      })
      cy.testConfigurationEdit(endpoint, schema, 'modbusSerialClient')
    })
    it('basic serial server configuration with period', function () {
      if (!rs232Options && !rs485Options) this.skip()
      const instanceName = 'test' + Math.floor(Math.random() * 100) + 1
      cy.get('[test-id="tablerow-modbusSerialClient"]').within(() => {
        cy.get('input[id=name]').type(instanceName)
      })
      cy.clickSectionAdd('modbusSerialClient')
      cy.waitForEditModalOpen()
      cy.clickEditSave()
      cy.get('[test-id="tablerow-modbusSerialServer"]').within(() => {
        cy.get('input[id=name]').type(instanceName)
      })
      const enable = rs232Status ? enabled.false : enabled.true
      const schema = [enable, name1, serverID, skipOnTMOS, frequency.period, period, timeout]
      cy.testConfigurationEdit(serverEndpoint, schema, 'modbusSerialServer')
      cy.clearSection(endpoint, '1')
    })
    it('basic serial server configuration with schedule', function () {
      if (!rs232Options && !rs485Options) this.skip()
      const instanceName = 'test' + Math.floor(Math.random() * 100) + 1
      cy.get('[test-id="tablerow-modbusSerialClient"]').within(() => {
        cy.get('input[id=name]').type(instanceName)
      })
      cy.clickSectionAdd('modbusSerialClient')
      cy.waitForEditModalOpen()
      cy.clickEditSave()
      cy.get('[test-id="tablerow-modbusSerialServer"]').within(() => {
        cy.get('input[id=name]').type(instanceName)
      })
      const enable = rs232Status ? enabled.false : enabled.true
      const schema = [enable, name1, serverID, skipOnTMOS, frequency.schedule, schedule, timeout]
      cy.testConfigurationEdit(serverEndpoint, schema, 'modbusSerialServer')
      cy.clearSection(endpoint, '1')
    })
    it.each([
      [{ val: '1', display: 'Read coils (1)' }, { val: '32bit_float2143', display: '32bit float, Byte order 2,1,4,3' }, '1800'],
      [{ val: '2', display: 'Read input coils (2)' }, { val: '32bit_float2143', display: '32bit float, Byte order 2,1,4,3' }, '1800'],
      [{ val: '3', display: 'Read holding registers (3)' }, { val: '32bit_float2143', display: '32bit float, Byte order 2,1,4,3' }, '124'],
      [{ val: '4', display: 'Read input registers (4)' }, { val: '32bit_float2143', display: '32bit float, Byte order 2,1,4,3' }, '124'],
      [{ val: '5', display: 'Set single coil (5)' }, { val: 'bool', display: 'Bool' }, '1'],
      [{ val: '6', display: 'Set single holding register (6)' }, { val: 'bool', display: 'Bool' }, '1'],
      [{ val: '6', display: 'Set single holding register (6)' }, { val: '8bit_int', display: '8bit INT' }, '126'],
      [{ val: '6', display: 'Set single holding register (6)' }, { val: '8bit_uint', display: '8bit UINT' }, '254'],
      [{ val: '6', display: 'Set single holding register (6)' }, { val: '16bit_int_hi_first', display: '16bit INT, high byte first' }, '32767'],
      [{ val: '6', display: 'Set single holding register (6)' }, { val: '16bit_uint_hi_first', display: '16bit UINT, high byte first' }, '65000'],
      [{ val: '6', display: 'Set single holding register (6)' }, { val: 'ascii', display: 'ASCII' }, 'u00A9afsdfasd'],
      [{ val: '6', display: 'Set single holding register (6)' }, { val: 'hex', display: 'Hex' }, '0xA9'],
      [{ val: '15', display: 'Set multiple coils (15)' }, { val: 'hex', display: 'Hex' }, '0xA9 0xB8'],
      [{ val: '15', display: 'Set multiple coils (15)' }, { val: 'bool', display: 'Bool' }, '1 0 1 0 1 0 1 0 1 0 1 0 1 0'],
      [{ val: '15', display: 'Set multiple coils (15)' }, { val: '8bit_int', display: '8bit INT' }, '120 115 105 50'],
      [{ val: '15', display: 'Set multiple coils (15)' }, { val: '8bit_uint', display: '8bit UINT' }, '240 115 105 50'],
      [{ val: '15', display: 'Set multiple coils (15)' }, { val: '16bit_int_hi_first', display: '16bit INT, high byte first' }, '12000 11500 10500 5000'],
      [{ val: '15', display: 'Set multiple coils (15)' }, { val: '16bit_uint_hi_first', display: '16bit UINT, high byte first' }, '50000 11500 10500 5000'],
      [{ val: '15', display: 'Set multiple coils (15)' }, { val: '32bit_int1234', display: '32bit INT, Byte order 1,2,3,4' }, '5000000 11500 10500 5000'],
      [{ val: '15', display: 'Set multiple coils (15)' }, { val: '32bit_uint1234', display: '32bit UINT, Byte order 1,2,3,4' }, '4294967290 11500 10500 5000'],
      [{ val: '15', display: 'Set multiple coils (15)' }, { val: '32bit_float1234', display: '32bit float, Byte order 1,2,3,4' }, '3.2e+38 11500 10500 5000']
    ])('tests request validation', (func, type, value) => {
      if (!rs232Options && !rs485Options) this.skip()
      const enable = rs232Status ? enabled.false : enabled.true
      const schema = [enable, name1, serverID, skipOnTMOS, frequency.period, period, timeout]
      cy.get('[test-id="tablerow-modbusSerialClient"]').within(() => {
        cy.get('input[id=name]').type(instanceName)
      })
      cy.clickSectionAdd('modbusSerialClient')
      cy.waitForEditModalOpen()
      cy.clickEditSave()
      let sectionName = ''
      let requestSectionName = ''

      cy.get('[test-id="tablerow-modbusSerialServer"]').within(() => {
        cy.get('input[id=name]').type(instanceName)
        cy.intercept('POST', `/api${serverEndpoint}`).as('post')
        cy.clickSectionAdd()
      })
      cy.wait('@post').then(res => {
        sectionName = res.response.body.data.id
        cy.waitForEditModalOpen()
        cy.getModal().within(() => {
          cy.get('[test-id="tablerow-modbusSerialServer"]').within(() => {
            cy.setValues(serverEndpoint, schema, sectionName)
          })
          cy.get(`[test-id="tablerow-${res.response.body.data.id}_request"]`).within(() => {
            cy.get('input[id=name]').type(instanceName)
          })
          cy.intercept('POST', `/api/modbus/client/serial/servers/${res.response.body.data.id}/requests/config`).as('postRequest')
          cy.clickSectionAdd(`${res.response.body.data.id}_request`)
          cy.wait('@postRequest').then(res => {
            requestSectionName = res.response.body.data.id
            // eslint-disable-next-line cypress/unsafe-to-chain-command
            cy.get(`[test-id="tablerow-${requestSectionName}"]`)
              .scrollIntoView()
              .within(() => {
                cy.selectValue('function', func.val)
                cy.selectValue('data_type', type.val)
                cy.fillInput('first_reg', '500')
                cy.fillInput('reg_count', value)
              })
          })
        })
      })
      cy.clickEditSave()
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-modbusSerialServer"]').within(() => {
          cy.checkValues(endpoint, schema, sectionName)
        })
        // eslint-disable-next-line cypress/unsafe-to-chain-command
        cy.get(`[test-id="tablerow-${requestSectionName}"]`)
          .scrollIntoView()
          .within(() => {
            cy.getSelectValue('function', func.val, func.display)
            cy.getSelectValue('data_type', type.val, type.display)
            cy.getInputValue('first_reg', '500')
            cy.getInputValue('reg_count', value)
          })
      })
      cy.clickEditClose()
      cy.clearSection(serverEndpoint, '2')
      cy.clearSection(endpoint, '1')
    })
    // TODO: fix alarm tests when 2nd lvl modal is opened at the top
    // scroll to top is not working correctly in 3rd level modal
    // it('advanced modbus configuration', function () {
    //   if (!rs232Options && !rs485Options) this.skip()
    //   let alarmEndPoint = ''
    //   const enable = rs232Status ? enabled.false : enabled.true
    //   const schema = [
    //     enable,
    //     name1,
    //     serverID,
    //     frequency.period,
    //     period,
    //     timeout
    //   ]
    //   const alarmSchema = [
    //     enabledAlarm.true,
    //     alarmFunctionCode,
    //     alarmDataType,
    //     alarmRegister,
    //     alarmValue,
    //     alarmCondition,
    //     alarmActionTrigger,
    //     redundancyAlarm.true,
    //     redundancyPeriod,
    //     alarmAction,
    //     ioAction
    //   ]
    //   cy.get(`[test-id="tablerow-modbusSerialClient"]`).within(() => {
    //     cy.get('input[id=name]').type(instanceName)
    //   })
    //   cy.clickSectionAdd('modbusSerialClient')
    //   cy.waitForEditModalOpen()
    //   cy.clickEditSave()
    //   let sectionName = ''
    //   cy.get(`[test-id="tablerow-modbusSerialServer"]`).within(() => {
    //     cy.get('input[id=name]').type(instanceName)
    //     cy.intercept('POST', `/api${serverEndpoint}`).as('post')
    //     cy.clickSectionAdd()
    //   })
    //   cy.wait('@post').then(res => {
    //     sectionName = res.response.body.data.id
    //     cy.waitForEditModalOpen()
    //     cy.get('.modal-container').within(() => {
    //       cy.setValues(serverEndpoint, schema, sectionName)
    //       cy.intercept('POST', `/api/services/modbus/serial/servers/config/${res.response.body.data.id}/alarms`).as('postRequest')
    //       cy.clickSectionAdd(`${res.response.body.data.id}_alarm`)
    //       cy.wait('@postRequest').then(res => {
    //         alarmEndPoint = `/api/services/modbus/serial/servers/config/${res.response.body.data.id}/alarms`
    //         cy.checkValues(alarmEndPoint, checkSchema, res.response.body.data.id)
    //         cy.scrollTo('top')
    //         cy.setValues(alarmEndPoint, alarmSchema, res.response.body.data.id)
    //       })
    //     })
    //     cy.clickEditSave()
    //   })
    //   cy.clickEditSave()
    //   cy.openLastCreatedEdit()
    //   cy.getModal().within(() => {
    //     cy.checkValues(endpoint, schema, sectionName)
    //   })
    //   cy.clickEditClose()
    //   cy.clearSection(serverEndpoint, '2')
    //   cy.clearSection(endpoint, '1')
    // })
  })
})
