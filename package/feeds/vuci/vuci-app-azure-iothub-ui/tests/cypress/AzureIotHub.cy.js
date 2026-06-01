const route = '/azure_iothub'
const endpoint = '/azure_iothub/config/'
let modemInfo = []
let restoreData = {}

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/modems/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      modemInfo = body.data
    })
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${endpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      restoreData = body.data
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.config('baseUrl')}/api${endpoint}`,
    body: {
      data: restoreData
    },
    headers: {
      Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
      'Content-type': 'application/json'
    }
  })
  cy.logout()
})

describe('Azure IoT Hub configuration', () => {
  const enable = { type: 'switch', inputName: 'enable', value: 'true' }
  const connectionString = { type: 'input', inputName: 'connection_string', value: 'test' }
  const msgType = {
    mqtt: { type: 'select', inputName: 'msg_type', options: 'mqtt', value: 'MQTT messages' },
    gsmctl: { type: 'select', inputName: 'msg_type', options: 'gsmctl', value: 'GSM values' }
  }
  // MQTT
  const mqttIp = { type: 'input', inputName: 'mqtt_ip', value: 'example.com' }
  const mqttPort = { type: 'input', inputName: 'mqtt_port', value: '12' }
  const mqttTopic = { type: 'input', inputName: 'mqtt_topic', value: 'test12' }
  const mqttUsername = { type: 'input', inputName: 'mqtt_username', value: 'user' }
  const mqttPassword = { type: 'input', inputName: 'mqtt_password', value: 'user123' }
  // GSM
  const messageInterval = { type: 'input', inputName: 'message_interval', value: '60' }
  const gsm = { type: 'multiselect', inputName: 'gsm', value: [{ options: 'imei', value: 'IMEI' }] }

  it('Configuration with enabled service and messages type `GSM values`', function () {
    if (modemInfo.length <= 0) this.skip()
    const schema = [enable, connectionString, msgType.gsmctl, messageInterval, gsm]
    cy.testNamedConfiguration(endpoint, schema, 'azure_iothub')
  })
  it('Configuration with enabled service and empty `message_interval` when `msg_type` is `gsmctl', function () {
    if (modemInfo.length <= 0) this.skip()
    const emptyMessageInterval = { type: 'input', inputName: 'message_interval', value: '' }
    const schema = [enable, connectionString, msgType.gsmctl, emptyMessageInterval, gsm]
    cy.testNamedConfiguration(endpoint, schema, 'azure_iothub', 'Some fields are invalid')
  })
  it('Configuration with enabled service and empty `message_interval` when `gsm` is `gsmctl', function () {
    if (modemInfo.length <= 0) this.skip()
    const emptyGsm = { type: 'multiselect', inputName: 'gsm', value: [] }
    const schema = [enable, connectionString, msgType.gsmctl, messageInterval, emptyGsm]
    cy.testNamedConfiguration(endpoint, schema, 'azure_iothub', 'Some fields are invalid')
  })
  it('Configuration with enabled service and messages type `MQTT messages`', () => {
    const schema = [enable, connectionString, msgType.mqtt, mqttIp, mqttPort, mqttTopic, mqttUsername, mqttPassword]
    cy.testNamedConfiguration(endpoint, schema, 'azure_iothub')
  })
  it('Configuration with enabled service and empty `connection_string` when `msg_type` is `mqtt`', () => {
    const emptyConnectionString = { type: 'input', inputName: 'connection_string', value: '' }
    const schema = [enable, emptyConnectionString, msgType.mqtt, mqttIp, mqttPort, mqttTopic, mqttUsername, mqttPassword]
    cy.testNamedConfiguration(endpoint, schema, 'azure_iothub', 'Some fields are invalid')
  })
  it('Configuration with enabled service and empty `mqtt_ip` when `msg_type` is `mqtt`', () => {
    const emptyMqttIp = { type: 'input', inputName: 'mqtt_ip', value: '' }
    const schema = [enable, connectionString, msgType.mqtt, emptyMqttIp, mqttPort, mqttTopic, mqttUsername, mqttPassword]
    cy.testNamedConfiguration(endpoint, schema, 'azure_iothub', 'Some fields are invalid')
  })
  it('Configuration with enabled service and empty `mqtt_port` when `msg_type` is `mqtt`', () => {
    const emptyMqttPort = { type: 'input', inputName: 'mqtt_port', value: '' }
    const schema = [enable, connectionString, msgType.mqtt, mqttIp, emptyMqttPort, mqttTopic, mqttUsername, mqttPassword]
    cy.testNamedConfiguration(endpoint, schema, 'azure_iothub', 'Some fields are invalid')
  })
  it('Configuration with enabled service and empty `mqtt_topic` when `msg_type` is `mqtt`', () => {
    const emptyMqttTopic = { type: 'input', inputName: 'mqtt_topic', value: '' }
    const schema = [enable, connectionString, msgType.mqtt, mqttIp, mqttPort, emptyMqttTopic, mqttUsername, mqttPassword]
    cy.testNamedConfiguration(endpoint, schema, 'azure_iothub', 'Some fields are invalid')
  })
})
