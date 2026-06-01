const route = 'services/dlms'
const endpoint = '/dlms/connections/config'
const endpointGroup = '/dlms/cosem_group/config'
let rs232Options = {}
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
      const noSerial = !rs232Options
      if (noSerial) return
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/serial/status`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      })
    })
  })
  cy.hitPage(route, endpoint)
})

after(() => {
  cy.logout()
})

function randomName(prefix) {
  return prefix + (Math.floor(Math.random() * 100) + 1)
}

const instanceName = randomName('test')
const enabled = {
  true: { type: 'switch', inputName: 'enabled', value: 'true' },
  false: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const name1 = { type: 'input', inputName: 'name', value: randomName('test') }
const name2 = { type: 'input', inputName: 'name', value: randomName('Test') }
const interval = { type: 'input', inputName: 'interval', value: '15' }
const device = {
  rs485: { type: 'select', inputName: 'device', options: '/dev/rs485', value: 'rs485' },
  rs232: { type: 'select', inputName: 'device', options: '/dev/rs232', value: 'rs232' }
}
const baudrate = { type: 'select', inputName: 'baudrate', options: '1200', value: '1200' }
const databits = { type: 'select', inputName: 'databits', options: '8', value: '8' }
const stopbits = { type: 'select', inputName: 'stopbits', options: '1', value: '1' }
const parity = { type: 'select', inputName: 'parity', options: 'odd', value: 'Odd' }
const flowcontrol = { type: 'select', inputName: 'flowcontrol', options: 'none', value: 'None' }
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

const connectionType = {
  tcp: { type: 'select', inputName: 'connection_type', options: '0', value: 'TCP' },
  serial: { type: 'select', inputName: 'connection_type', options: '1', value: 'Serial' }
}
const address = { type: 'input', inputName: 'address', value: '192.168.1.156' }
const port = { type: 'input', inputName: 'port', value: '4061' }

const serverAddr = { type: 'input', inputName: 'server_addr', value: '5' }
const logicalServerAddr = { type: 'input', inputName: 'log_server_addr', value: '15' }
const clientAddr = { type: 'input', inputName: 'client_addr', value: '15' }
const password = { type: 'input', inputName: 'password', value: 'testas' }
const invocationCounter = { type: 'input', inputName: 'invocation_counter', value: 'testas' }
const authenticationKey = { type: 'input', inputName: 'authentication_key', value: 'veeeeeeeeeeeeeeeerylongtestvalue' }
const blockCipherKey = { type: 'input', inputName: 'block_cipher_key', value: 'veeeeeeeeeeeeeeeerylongtestvalue' }
const dedicatedKey = { type: 'input', inputName: 'dedicated_key', value: 'veeeeeeeeeeeeeeeerylongtestvalue' }
const accessSecurity = {
  none: { type: 'select', inputName: 'access_security', options: '0', value: 'None' },
  low: { type: 'select', inputName: 'access_security', options: '1', value: 'Low' }
}
const interfaceOP = { type: 'select', inputName: 'interface', options: '0', value: 'HDLC' }
const transportSecurity = {
  none: { type: 'select', inputName: 'transport_security', options: '0', value: 'None' },
  auth: { type: 'select', inputName: 'transport_security', options: '48', value: 'Authentication encryption' }
}

const physicalDevice = {
  type: 'multiselect',
  inputName: 'physical_device',
  value: [{ options: '2', value: randomName('Test') }]
}
const obis = { type: 'input', inputName: 'obis', value: 'testas' }
const cosemClass = { type: 'select', inputName: 'cosem_id', options: '7', value: 'PROFILE GENERIC (ID: 7)' }
const entries = { type: 'input', inputName: 'entries', value: '500' }

describe('DLMS tests', () => {
  it('TCP connection', function () {
    const schema = [name1, connectionType.tcp, address, port]
    cy.get('[test-id="tablerow-connection"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
      cy.selectValue('connection_type', '0', 'TCP')
    })
    cy.testConfigurationEdit(endpoint, schema, 'connection')
  })
  it('cosem group configuration', function () {
    const schema = [enabled.false, name1, interval]
    cy.get('[test-id="tablerow-cosem_group"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
    })
    cy.testConfigurationEdit(endpointGroup, schema, 'cosem_group')
  })
  it('Serial connection', function () {
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
    const schema = [name1, connectionType.serial, device.rs232, baudrate, databits, stopbits, parity, flowcontrol]
    cy.get('[test-id="tablerow-connection"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
      cy.selectValue('connection_type', '1', 'Serial')
    })
    cy.testConfigurationEdit(endpoint, schema, 'connection')
  })
  it('TCP connection, device', function () {
    const schema = [name1, connectionType.tcp, address, port]
    const deviceSchema = [enabled.true, name1, serverAddr, logicalServerAddr, clientAddr, accessSecurity.none, interfaceOP, transportSecurity]
    cy.get('[test-id="tablerow-connection"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
      cy.selectValue('connection_type', '0', 'TCP')
    })
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.clickSectionAdd('connection')
    let sectionName = ''
    let deviceSectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.get('.modal-container').within(() => {
        cy.get('[test-id="tablerow-connection"]').within(() => {
          cy.setValues(endpoint, schema, sectionName)
        })
        cy.get(`[test-id="tablerow-${sectionName}_device"]`).within(() => {
          cy.get('input[id=name]').type(instanceName)
        })
        cy.intercept('POST', `/api/dlms/connections/config/${sectionName}/devices`).as('postNode')
        cy.clickSectionAdd(`${sectionName}_device`)
        cy.wait('@postNode').then(res => {
          deviceSectionName = res.response.body.data.id
          cy.setValues(null, deviceSchema, deviceSectionName)
        })
      })
      cy.clickEditSave()
      cy.openLastCreatedEdit()
      cy.get('.modal-container').within(() => {
        cy.checkValues(null, deviceSchema, deviceSectionName)
      })
      cy.clickEditClose()
      cy.get('.modal-container').within(() => {
        cy.get(`[test-id="tablerow-${deviceSectionName}"]`).within(() => {
          cy.clickButton('delete')
        })
      })
      cy.get('[test-id="button-ok"]').click()
      cy.get('.modal-container').within(() => {
        cy.get('[test-id="tablerow-connection"]').within(() => {
          cy.checkValues(endpoint, schema, sectionName)
        })
      })
      cy.clickEditClose()
      cy.clearSection(null, sectionName)
    })
  })
  it('TCP connection, device with password', function () {
    const schema = [name1, connectionType, address, port]
    const deviceSchema = [
      enabled.true,
      name1,
      serverAddr,
      logicalServerAddr,
      clientAddr,
      accessSecurity.low,
      password,
      interfaceOP,
      transportSecurity.auth,
      invocationCounter,
      authenticationKey,
      blockCipherKey,
      dedicatedKey
    ]
    cy.get('[test-id="tablerow-connection"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
      cy.selectValue('connection_type', '0', 'TCP')
    })
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.clickSectionAdd('connection')
    let sectionName = ''
    let deviceSectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-connection"]').within(() => {
          cy.setValues(endpoint, schema, sectionName)
        })
        cy.get(`[test-id="tablerow-${sectionName}_device"]`).within(() => {
          cy.get('input[id=name]').type(instanceName)
        })
        cy.intercept('POST', `/api/dlms/connections/config/${sectionName}/devices`).as('postNode')
        cy.clickSectionAdd(`${sectionName}_device`)
        cy.wait('@postNode').then(res => {
          deviceSectionName = res.response.body.data.id
          cy.setValues(null, deviceSchema, deviceSectionName)
        })
      })
      cy.clickEditSave()
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.checkValues(null, deviceSchema, deviceSectionName)
      })
      cy.clickEditClose()
      cy.getModal().within(() => {
        cy.get(`[test-id="tablerow-${deviceSectionName}"]`).within(() => {
          cy.clickButton('delete')
        })
      })
      cy.get('[test-id="button-ok"]').click()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-connection"]').within(() => {
          cy.checkValues(endpoint, schema, sectionName)
        })
      })
      cy.clickEditClose()
      cy.clearSection(null, sectionName)
    })
  })
  it('cosem value configuration', function () {
    const schemaCon = [name1, connectionType, address, port]
    const deviceSchema = [
      enabled.true,
      name2,
      serverAddr,
      logicalServerAddr,
      clientAddr,
      accessSecurity.low,
      password,
      interfaceOP,
      transportSecurity.auth,
      invocationCounter,
      authenticationKey,
      blockCipherKey,
      dedicatedKey
    ]
    cy.get('[test-id="tablerow-connection"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
      cy.selectValue('connection_type', '0', 'TCP')
    })
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    cy.clickSectionAdd('connection')
    let sectionNameCon = ''
    let deviceSectionName = ''
    cy.wait('@postSection').then(res => {
      sectionNameCon = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-connection"]').within(() => {
          cy.setValues(endpoint, schemaCon, sectionNameCon)
        })
        cy.get(`[test-id="tablerow-${sectionNameCon}_device"]`).within(() => {
          cy.get('input[id=name]').type(instanceName)
        })
        cy.intercept('POST', `/api/dlms/connections/config/${sectionNameCon}/devices`).as('postNode')
        cy.clickSectionAdd(`${sectionNameCon}_device`)
        cy.wait('@postNode').then(res => {
          deviceSectionName = res.response.body.data.id
          cy.setValues(null, deviceSchema, deviceSectionName)
        })
      })
      cy.clickEditSave()
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.checkValues(null, deviceSchema, deviceSectionName)
      })
      cy.clickEditClose()
      cy.clickEditClose()
    })
    const schema = [enabled.false, name1, interval]
    const cosemSchema = [enabled.true, name1, physicalDevice, obis, cosemClass, entries]
    cy.get('[test-id="tablerow-cosem_group"]').within(() => {
      cy.get('input[id=name]').type(instanceName)
    })
    cy.intercept('POST', `/api${endpointGroup}`).as('postSection')
    cy.clickSectionAdd('cosem_group')
    let sectionName = ''
    let cosemSectionName = ''
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-cosem_group"]').within(() => {
          cy.setValues(endpointGroup, schema, sectionName)
        })
        cy.get(`[test-id="tablerow-${sectionName}_cosem"]`).within(() => {
          cy.get('input[id=name]').type(instanceName)
        })
        cy.intercept('POST', `/api/dlms/cosem_group/config/${sectionName}/cosem`).as('postCosem')
        cy.clickSectionAdd(`${sectionName}_cosem`)
        cy.wait('@postCosem').then(res => {
          cosemSectionName = res.response.body.data.id
          cy.setValues(null, cosemSchema, cosemSectionName)
        })
      })
      cy.clickEditSave()
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.checkValues(null, cosemSchema, cosemSectionName)
      })
      cy.clickEditClose()
      cy.getModal().within(() => {
        cy.get(`[test-id="tablerow-${cosemSectionName}"]`).within(() => {
          cy.clickButton('delete')
        })
      })
      cy.get('[test-id="button-ok"]').click()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-cosem_group"]').within(() => {
          cy.checkValues(endpoint, schema, sectionName)
        })
      })
      cy.clickEditClose()
      cy.clearSection(null, sectionName)
      cy.clearSection(null, sectionNameCon)
    })
  })
})
