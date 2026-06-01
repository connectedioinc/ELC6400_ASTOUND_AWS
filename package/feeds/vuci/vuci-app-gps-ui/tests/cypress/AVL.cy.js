let hasGPS = false
let hasWifi = false
let ioInfo = []
let sectionNames = []
const route = '/services/gps/avl'
const endpoint = '/gps/avl/config'
const ruleEndpoint = '/gps/avl/secondary_rules/config'
const tavlEndpoint = '/gps/avl/tavl_rules/config'
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
      hasGPS = body.data.board.hwinfo.gps
      hasWifi = body.data.board.hwinfo.wifi
    })
  })
  cy.then(() => {
    if (hasGPS) {
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/io/status`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        ioInfo = body.data.filter(io => io.block_pins && io.io_name)
      })
      cy.then(() => {
        cy.request({
          method: 'GET',
          url: `${Cypress.config('baseUrl')}/api${tavlEndpoint}`,
          headers: {
            Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
            'Content-type': 'application/json'
          }
        }).then(({ body }) => {
          sectionNames = body.data.map(section => section.id)
        })
      })
    }
  })
  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasGPS) this.skip()
})

after(() => {
  cy.logout()
})
describe('AVL page tests', () => {
  const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
  const sendRetry = { type: 'switch', inputName: 'send_retry', value: 'true' }
  const hostname = { type: 'input', inputName: 'hostname', value: '0.0.0.0' }
  const proto = { type: 'select', inputName: 'proto', options: 'udp', value: 'UDP' }
  const port = { type: 'input', inputName: 'port', value: '8501' }
  const conCont = { type: 'switch', inputName: 'con_cont', value: 'true' }
  const staticNavigation = { type: 'switch', inputName: 'static_navigation', value: 'true' }
  describe('AVL server settings ', () => {
    it('Avl server configuration with enabled service', () => {
      const schema = [enabled, sendRetry, hostname, proto, port, conCont, staticNavigation]
      cy.testNamedConfiguration(endpoint, schema, 'avl')
    })
    it('Avl server configuration with disabled service', () => {
      const schema = [enabled, sendRetry, hostname, proto, port, conCont, staticNavigation]
      schema[0].value = 'false'
      cy.testNamedConfiguration(endpoint, schema, 'avl')
    })
  })
  describe('AVL main rule tests', () => {
    const collectPeriod = { type: 'input', inputName: 'collect_period', value: '100' }
    const angle = { type: 'input', inputName: 'angle', value: '40' }
    const accuracy = { type: 'input', inputName: 'accuracy', value: '10' }
    const distance = { type: 'input', inputName: 'distance', value: '40' }
    const savedRecords = { type: 'input', inputName: 'saved_records', value: '30' }
    const sendPeriod = { type: 'input', inputName: 'send_period', value: '1000' }
    it('AVL main rule test', () => {
      const schema = [collectPeriod, distance, angle, savedRecords, sendPeriod, accuracy]
      const sectionName = 'avl_rule_main'
      cy.get(`[test-id="tablerow-${sectionName}"]`).within(() => {
        cy.clickButton('edit')
      })
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.setValues(endpoint, schema, sectionName)
      })
      cy.clickEditSave()
      cy.get(`[test-id="tablerow-${sectionName}"]`).within(() => {
        cy.clickButton('edit')
      })
      cy.getModal().within(() => {
        cy.checkValues(endpoint, schema, sectionName)
      })
      cy.clickEditClose()
    })
  })
  describe('AVL Secondary rule test', () => {
    const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
    const wanStatus = {
      mobile_both: { type: 'select', inputName: 'wan_status', options: 'mobile_both', value: 'Mobile both' },
      wifi: { type: 'select', inputName: 'wan_status', options: 'wifi', value: 'WiFi' }
    }
    const ignore = { type: 'switch', inputName: 'ignore', value: 'true' }
    const dinStatus = { type: 'select', inputName: 'din_status', options: 'high', value: 'High Level' }
    const ioType = { type: 'select', inputName: 'io_type', options: 'gpio', value: 'GPIO' }
    const priority = { type: 'select', inputName: 'priority', options: 'high', value: 'High priority level' }
    const collectPeriod = { type: 'input', inputName: 'collect_period', value: '100' }
    const angle = { type: 'input', inputName: 'angle', value: '40' }
    const distance = { type: 'input', inputName: 'distance', value: '40' }
    const savedRecords = { type: 'input', inputName: 'saved_records', value: '30' }
    const sendPeriod = { type: 'input', inputName: 'send_period', value: '1000' }
    const accuracy = { type: 'input', inputName: 'accuracy', value: '10' }
    it('AVL secondary rule with ignore enabled', () => {
      const schema = [enabled, wanStatus.mobile_both, ignore, priority, collectPeriod, angle, distance, savedRecords, sendPeriod, accuracy]
      cy.testConfigurationEdit(ruleEndpoint, schema, 'avlSecondaryRules')
    })
    it('AVL secondary rule with ignore disabled', () => {
      const gpio = ioInfo.find(pin => pin.type === 'gpio' && pin.direction === 'in')
      const ioName = { type: 'select', inputName: 'io_name', options: gpio.name, value: `${gpio.io_name} (${gpio.block_pins.join()})` }
      const schema = [enabled, wanStatus.mobile_both, ignore, dinStatus, ioType, ioName, priority, collectPeriod, angle, distance, savedRecords, sendPeriod, accuracy]
      schema[2].value = 'false'
      cy.testConfigurationEdit(ruleEndpoint, schema, 'avlSecondaryRules')
    })
    it('AVL secondary rule with ignore enabled and wifi selected', function () {
      if (!hasWifi) this.skip()
      cy.selectValue('wan_status', 'wifi', 'WiFi')
      const schema = [enabled, wanStatus.wifi, ignore, priority, collectPeriod, angle, distance, savedRecords, sendPeriod, accuracy]
      cy.testConfigurationEdit(ruleEndpoint, schema, 'avlSecondaryRules')
    })
  })
  describe('TAVL Settings', () => {
    const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
    it('Enable all configurations', () => {
      for (let i = 0; i < sectionNames.length; i++) {
        const schema = [enabled]
        cy.testNamedConfiguration(tavlEndpoint, schema, sectionNames[i])
      }
    })
    it('Disable all configurations', () => {
      for (let i = 0; i < sectionNames.length; i++) {
        const schema = [enabled]
        schema[0].value = 'false'
        cy.testNamedConfiguration(tavlEndpoint, schema, sectionNames[i])
      }
    })
  })
})
