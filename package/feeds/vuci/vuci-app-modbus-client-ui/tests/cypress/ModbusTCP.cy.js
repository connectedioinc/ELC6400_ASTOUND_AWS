const route = '/services/modbus/modbus_client'
const endpoint = '/modbus/client/tcp/config'
before(() => {
  cy.login()
  cy.hitPage(route, endpoint)
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
const dev_ipaddr = { type: 'input', inputName: 'dev_ipaddr', value: '1.1.1.1' }
const server_port = { type: 'input', inputName: 'port', value: '50' }
const reconnect = { type: 'switch', inputName: 'reconnect', value: 'true' }
const frequency = {
  period: { type: 'select', inputName: 'frequency', options: 'period', value: 'Period' },
  schedule: { type: 'select', inputName: 'frequency', options: 'schedule', value: 'Schedule' }
}
const delay = { type: 'input', inputName: 'delay', value: '500' }
const period = { type: 'input', inputName: 'period', value: '5' }
const timeout = { type: 'input', inputName: 'timeout', value: '5' }
const schedule = { type: 'list', inputName: 'schedule', value: ['12:15:37', '18:29:59'] }

describe('Modbus tcp tests', () => {
  describe('Base Configuration', () => {
    it('overview validation test', function () {
      cy.intercept('POST', `/api${endpoint}`).as('postSection')
      cy.clickSectionAdd('modbusTcpClient')
      let sectionName = ''
      cy.wait('@postSection').then(res => {
        sectionName = res.response.body.data.id
        cy.waitForEditModalOpen()
        cy.clickEditClose()
        // eslint-disable-next-line cypress/unsafe-to-chain-command
        cy.get(`[test-id="tablerow-${sectionName}"]`)
          .scrollIntoView()
          .within(() => {
            cy.clickSwitch('enabled', '1')
          })
        cy.overviewSave('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values')
        cy.clearSection(endpoint, sectionName)
      })
    })
    it('basic serial server configuration with period', function () {
      const schema = [enabled.true, name1, serverID, dev_ipaddr, server_port, timeout, reconnect, frequency.period, delay, period]
      cy.testConfigurationEdit(endpoint, schema, 'modbusTcpClient')
    })
    it('basic serial server configuration with schedule', function () {
      const schema = [enabled.false, name1, serverID, dev_ipaddr, server_port, timeout, reconnect, frequency.schedule, delay, schedule]
      cy.testConfigurationEdit(endpoint, schema, 'modbusTcpClient')
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
      const schema = [enabled.false, name1, serverID, dev_ipaddr, server_port, timeout, reconnect, frequency.period, delay, period]
      cy.intercept('POST', `/api${endpoint}`).as('postSection')
      cy.clickSectionAdd('modbusTcpClient')
      let sectionName = ''
      let requestSectionName = ''
      cy.wait('@postSection').then(res => {
        sectionName = res.response.body.data.id
        cy.waitForEditModalOpen()
        cy.getModal().within(() => {
          cy.get('[test-id="tablerow-modbusTcpClient"]').within(() => {
            cy.setValues(endpoint, schema, sectionName)
          })
          cy.get(`[test-id="tablerow-${res.response.body.data.id}_request"]`).within(() => {
            cy.get('input[id=name]').type(instanceName)
          })
          cy.intercept('POST', `/api/modbus/client/tcp/${res.response.body.data.id}/requests/config`).as('postRequest')
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
        cy.get('[test-id="tablerow-modbusTcpClient"]').within(() => {
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
    //     reconnect,
    //     skipOnTMOS,
    //     frequency.period,
    //     delay,
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
    //     cy.getModal().within(() => {
    //       cy.setValues(slaveEndpoint, schema, sectionName)
    //       cy.intercept('POST', `/api/modbus/serial/slaves/config/${res.response.body.data.id}/alarms`).as('postRequest')
    //       cy.clickSectionAdd(`${res.response.body.data.id}_alarm`)
    //       cy.wait('@postRequest').then(res => {
    //         alarmEndPoint = `/api/modbus/serial/slaves/config/${res.response.body.data.id}/alarms`
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
