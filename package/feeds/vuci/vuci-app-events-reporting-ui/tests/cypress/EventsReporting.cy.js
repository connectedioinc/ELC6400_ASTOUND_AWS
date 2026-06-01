const route = '/services/events_reporting'
const endpoint = '/events_reporting/config'
let availableEvents = []
let hasModem = false
let phoneGroups = ''
let emailGroups = ''
let skipPop = false

before(function () {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/events_reporting/options`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      availableEvents = body.data.events
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/modems/status`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        hasModem = body.data.length > 0
        action.sendSMS.depend = hasModem
        recipientFormat.single.depend = hasModem
        recipientFormat.group.depend = hasModem
        telnum.depend = hasModem
        cy.request({
          method: 'GET',
          url: `${Cypress.config('baseUrl')}/api/system/device/status`,
          headers: {
            Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
            'Content-type': 'application/json'
          }
        }).then(({ body }) => {
          if (body.data.mnfinfo.name.startsWith('TRB5')) {
            availableEvents = availableEvents?.filter(e => e !== 'quota_limit')
          }
          cy.request({
            method: 'GET',
            url: `${Cypress.config('baseUrl')}/api/recipients/email_users/config`,
            body: {
              data: {
                name: 'testEmail'
              }
            },
            headers: {
              Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
              'Content-type': 'application/json'
            }
          }).then(({ body }) => {
            emailGroups = body.data.id
          })
          if (hasModem) {
            cy.request({
              method: 'GET',
              url: `${Cypress.config('baseUrl')}/api/recipients/phone_groups/config`,
              body: {
                data: {
                  name: 'testPhone',
                  tel: ['+37012345678']
                }
              },
              headers: {
                Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
                'Content-type': 'application/json'
              }
            }).then(({ body }) => {
              phoneGroups = body.data.id
            })
          }
        })
      })
    })
  })
  cy.hitPage(route)
})

after(() => {
  if (hasModem && phoneGroups) {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/recipients/phone_groups/config`,
      body: {
        data: [phoneGroups]
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  }
  if (emailGroups) {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/recipients/email_users/config`,
      body: {
        data: [emailGroups]
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  }
  cy.logout()
})

const enable = { type: 'switch', inputName: 'enable', value: 'true' }
const eventType = {
  config: { type: 'select', inputName: 'event', options: 'Config', value: 'Config change' },
  dhcp: { type: 'select', inputName: 'event', options: 'DHCP', value: 'New DHCP client' },
  reboot: { type: 'select', inputName: 'event', options: 'Reboot', value: 'Reboot' },
  ssh: { type: 'select', inputName: 'event', options: 'SSH', value: 'SSH' },
  webUI: { type: 'select', inputName: 'event', options: 'Web UI', value: 'Web UI' },
  wifi: { type: 'select', inputName: 'event', options: 'WiFi', value: 'New WiFi client' },
  mobileData: { type: 'select', inputName: 'event', options: 'Mobile data', value: 'Mobile data' },
  failover: { type: 'select', inputName: 'event', options: 'Failover', value: 'WAN failover' },
  sms: { type: 'select', inputName: 'event', options: 'SMS', value: 'SMS' },
  signalStrength: { type: 'select', inputName: 'event', options: 'Signal strength', value: 'Signal strength' },
  simSwitch: { type: 'select', inputName: 'event', options: 'SIM switch', value: 'SIM switch' },
  switchEvents: { type: 'select', inputName: 'event', options: 'Switch Events', value: 'Port state' },
  switchTopology: { type: 'select', inputName: 'event', options: 'Switch Topology', value: 'Topology state' },
  gps: { type: 'select', inputName: 'event', options: 'GPS', value: 'GPS' }
}
const eventSubtype = {
  // Config
  azureIothub: { type: 'select', inputName: 'eventMark', options: 'azure_iothub', value: 'Azure IoT Hub' },
  bacnetRouter: { type: 'select', inputName: 'eventMark', options: 'bacnet_router', value: 'Bacnet' },
  bleDevices: { type: 'select', inputName: 'eventMark', options: 'ble_devices', value: 'Bluetooth devices' },
  buttons: { type: 'select', inputName: 'eventMark', options: 'buttons', value: 'Buttons' },
  callUtils: { type: 'select', inputName: 'eventMark', options: 'call_utils', value: 'Call utilities' },
  cli: { type: 'select', inputName: 'eventMark', options: 'cli', value: 'CLI' },
  dmvpn: { type: 'select', inputName: 'eventMark', options: 'dmvpn', value: 'DMVPN' },
  dnp3Client: { type: 'select', inputName: 'eventMark', options: 'dnp3_client', value: 'DNP3 TCP client' },
  dnp3Outstation: { type: 'select', inputName: 'eventMark', options: 'dnp3_outstation', value: 'DNP3 outstation' },
  easycwmp: { type: 'select', inputName: 'eventMark', options: 'easycwmp', value: 'TR-069' },
  emailToSms: { type: 'select', inputName: 'eventMark', options: 'email_to_sms', value: 'Email to SMS' },
  emailRelay: { type: 'select', inputName: 'eventMark', options: 'emailrelay', value: 'Email relay' },
  frr: { type: 'select', inputName: 'eventMark', options: 'frr', value: 'Dynamic routes' },
  fstab: { type: 'select', inputName: 'eventMark', options: 'fstab', value: 'SD & USB tools' },
  igmpproxy: { type: 'select', inputName: 'eventMark', options: 'igmpproxy', value: 'IGMP' },
  iojuggler: { type: 'select', inputName: 'eventMark', options: 'iojuggler', value: 'I/O juggler' },
  iot: { type: 'select', inputName: 'eventMark', options: 'iot', value: 'Cumulocity' },
  iottw: { type: 'select', inputName: 'eventMark', options: 'iottw', value: 'ThingWorx' },
  ipBlockd: { type: 'select', inputName: 'eventMark', options: 'ip_blockd', value: 'IP block' },
  landingpage: { type: 'select', inputName: 'eventMark', options: 'landingpage', value: 'Landing page' },
  minidlna: { type: 'select', inputName: 'eventMark', options: 'minidlna', value: 'MiniDLNA' },
  modbusServer: { type: 'select', inputName: 'eventMark', options: 'modbus', value: 'Modbus server' },
  modbusClient: { type: 'select', inputName: 'eventMark', options: 'modbus_client', value: 'Modbus TCP client' },
  modbusgateway: { type: 'select', inputName: 'eventMark', options: 'modbusgateway', value: 'Modbus gateway' },
  multiWifi: { type: 'select', inputName: 'eventMark', options: 'multi_wifi', value: 'Multi AP' },
  opcuaClient: { type: 'select', inputName: 'eventMark', options: 'opcua_client', value: 'OPC UA' },
  operctl: { type: 'select', inputName: 'eventMark', options: 'operctl', value: 'Mobile operator list' },
  overview: { type: 'select', inputName: 'eventMark', options: 'overview', value: 'Overview' },
  p910nd: { type: 'select', inputName: 'eventMark', options: 'p910nd', value: 'Printer server' },
  packageRestore: { type: 'select', inputName: 'eventMark', options: 'package_restore', value: 'Package restore' },
  pptpd: { type: 'select', inputName: 'eventMark', options: 'pptpd', value: 'PPTP' },
  qos: { type: 'select', inputName: 'eventMark', options: 'QoS', value: 'QoS' },
  rmsMqtt: { type: 'select', inputName: 'eventMark', options: 'rms_mqtt', value: 'RMS' },
  rpcd: { type: 'select', inputName: 'eventMark', options: 'rpcd', value: 'Users management' },
  rsConsole: { type: 'select', inputName: 'eventMark', options: 'rs_console', value: 'RS console' },
  rsModbus: { type: 'select', inputName: 'eventMark', options: 'rs_modbus', value: 'RS modbus' },
  rsModem: { type: 'select', inputName: 'eventMark', options: 'rs_modem', value: 'RS modem' },
  rsNtrip: { type: 'select', inputName: 'eventMark', options: 'rs_ntrip', value: 'RS NTRIP' },
  rsOverip: { type: 'select', inputName: 'eventMark', options: 'rs_overip', value: 'RS overIP' },
  rutFota: { type: 'select', inputName: 'eventMark', options: 'rut_fota', value: 'Fota' },
  simSwitchConf: { type: 'select', inputName: 'eventMark', options: 'sim_switch', value: 'Sim switch' },
  smpp: { type: 'select', inputName: 'eventMark', options: 'smpp', value: 'SMPP' },
  snmptrap: { type: 'select', inputName: 'eventMark', options: 'snmptrap', value: 'SNMP Trap' },
  socat: { type: 'select', inputName: 'eventMark', options: 'socat', value: 'Console' },
  sshfs: { type: 'select', inputName: 'eventMark', options: 'sshfs', value: 'SSHFS' },
  stunnel: { type: 'select', inputName: 'eventMark', options: 'stunnel', value: 'Stunnel' },
  system: { type: 'select', inputName: 'eventMark', options: 'system', value: 'System' },
  telnetd: { type: 'select', inputName: 'eventMark', options: 'telnetd', value: 'Telnet' },
  tinc: { type: 'select', inputName: 'eventMark', options: 'tinc', value: 'Tinc VPN' },
  udprelay: { type: 'select', inputName: 'eventMark', options: 'udprelay', value: 'UDP broadcast relay' },
  uhttpd: { type: 'select', inputName: 'eventMark', options: 'uhttpd', value: 'Web server' },
  userGroups: { type: 'select', inputName: 'eventMark', options: 'user_groups', value: 'User groups' },
  widget: { type: 'select', inputName: 'eventMark', options: 'widget', value: 'Widget' },
  wifiScanner: { type: 'select', inputName: 'eventMark', options: 'wifi_scanner', value: 'WiFi scanner' },
  xl2tpd: { type: 'select', inputName: 'eventMark', options: 'xl2tpd', value: 'L2TP' },
  zerotier: { type: 'select', inputName: 'eventMark', options: 'zerotier', value: 'Zerotier' },

  all: { type: 'select', inputName: 'eventMark', options: 'all', value: 'All' },
  openvpn: { type: 'select', inputName: 'eventMark', options: 'openvpn', value: 'OpenVPN' },
  eventsReporting: { type: 'select', inputName: 'eventMark', options: 'events_reporting', value: 'Events reporting' },
  periodicReboot: { type: 'select', inputName: 'eventMark', options: 'periodic_reboot', value: 'Reboot scheduler' },
  pingReboot: { type: 'select', inputName: 'eventMark', options: 'ping_reboot', value: 'Ping reboot' },
  profile: { type: 'select', inputName: 'eventMark', options: 'profiles', value: 'Profiles' },
  ipsec: { type: 'select', inputName: 'eventMark', options: 'ipsec', value: 'IPsec' },
  dhcp: { type: 'select', inputName: 'eventMark', options: 'dhcp', value: 'DHCP' },
  dropbear: { type: 'select', inputName: 'eventMark', options: 'dropbear', value: 'SSH' },
  network: { type: 'select', inputName: 'eventMark', options: 'network', value: 'Network' },
  firewall: { type: 'select', inputName: 'eventMark', options: 'firewall', value: 'Firewall' },
  ntpclient: { type: 'select', inputName: 'eventMark', options: 'ntpclient', value: 'NTP client' },
  ntpd: { type: 'select', inputName: 'eventMark', options: 'ntpd', value: 'NTPD' },
  ntpserver: { type: 'select', inputName: 'eventMark', options: 'ntpserver', value: 'NTP server' },
  io: { type: 'select', inputName: 'eventMark', options: 'input/output', value: 'From input/output' },
  signalStrength113: { type: 'select', inputName: 'eventMark', options: 'Signal strength dropped below -113 dBm', value: '-121dBm -113dBm' },
  signalStrength98: { type: 'select', inputName: 'eventMark', options: 'Signal strength dropped below -98 dBm', value: '-113dBm -98dBm' },
  signalStrength93: { type: 'select', inputName: 'eventMark', options: 'Signal strength dropped below -93 dBm', value: '-98dBm -93dBm' },
  signalStrength75: { type: 'select', inputName: 'eventMark', options: 'Signal strength dropped below -75 dBm', value: '-93dBm -75dBm' },
  signalStrength60: { type: 'select', inputName: 'eventMark', options: 'Signal strength dropped below -60 dBm', value: '-75dBm -60dBm' },
  signalStrength50: { type: 'select', inputName: 'eventMark', options: 'Signal strength dropped below -50 dBm', value: '-60dBm -50dBm' },
  ddns: { type: 'select', inputName: 'eventMark', options: 'ddns', value: 'DDNS' },
  snmpd: { type: 'select', inputName: 'eventMark', options: 'snmpd', value: 'SNMP' },
  simcard: { type: 'select', inputName: 'eventMark', options: 'simcard', value: 'Mobile' },
  mwan: { type: 'select', inputName: 'eventMark', options: 'mwan3', value: 'Failover' },
  quotaLimit: { type: 'select', inputName: 'eventMark', options: 'quota_limit', value: 'Data limit' },
  gps: { type: 'select', inputName: 'eventMark', options: 'gps', value: 'GPS' },
  hostblock: { type: 'select', inputName: 'eventMark', options: 'hostblock', value: 'Site blocking' },
  privoxy: { type: 'select', inputName: 'eventMark', options: 'privoxy', value: 'Content blocker' },
  vrrpd: { type: 'select', inputName: 'eventMark', options: 'vrrpd', value: 'VRRP' },
  upnpd: { type: 'select', inputName: 'eventMark', options: 'upnpd', value: 'UPNP' },
  blesem: { type: 'select', inputName: 'eventMark', options: 'blesem', value: 'Bluetooth' },
  sqm: { type: 'select', inputName: 'eventMark', options: 'sqm', value: 'SQM' },
  ulogd: { type: 'select', inputName: 'eventMark', options: 'ulogd', value: 'Traffic logging' },
  modbusDataSender: { type: 'select', inputName: 'eventMark', options: 'modbus_data_sender', value: 'Data to server' },
  mosquitto: { type: 'select', inputName: 'eventMark', options: 'mosquitto', value: 'MQTT broker' },
  mqttPub: { type: 'select', inputName: 'eventMark', options: 'mqtt_pub', value: 'MQTT publisher' },
  chilli: { type: 'select', inputName: 'eventMark', options: 'chilli', value: 'Hotspot' },
  wireless: { type: 'select', inputName: 'eventMark', options: 'wireless', value: 'Wireless' },
  samba: { type: 'select', inputName: 'eventMark', options: 'samba', value: 'Network shares' },
  etherwake: { type: 'select', inputName: 'eventMark', options: 'etherwake', value: 'Wake on LAN' },
  smsGateway: { type: 'select', inputName: 'eventMark', options: 'sms_gateway', value: 'SMS gateway' },
  smsUtils: { type: 'select', inputName: 'eventMark', options: 'sms_utils', value: 'SMS utilities' },

  // wifi
  clientConnected: { type: 'select', inputName: 'eventMark', options: 'client connected', value: 'Connected' },
  clientDisconnected: { type: 'select', inputName: 'eventMark', options: 'client disconnected', value: 'Disconnected' },

  // gps
  leftGeofence: { type: 'select', inputName: 'eventMark', options: 'left geofence', value: 'Left geofence' },
  enteredGeofence: { type: 'select', inputName: 'eventMark', options: 'entered geofence', value: 'Entered geofence' },

  // ssh
  succeeded: { type: 'select', inputName: 'eventMark', options: 'succeeded', value: 'Successful authentication' },
  bad: { type: 'select', inputName: 'eventMark', options: 'bad', value: 'Unsuccessful authentication' },

  // switch topology
  changesInTopology: { type: 'select', inputName: 'eventMark', options: 'Changes in topology', value: 'Topology changes' },

  // switch events
  portLinkState: { type: 'select', inputName: 'eventMark', options: 'Port link state', value: 'Link state' },
  portSpeedFor: { type: 'select', inputName: 'eventMark', options: 'Port speed for', value: 'Link speed' },
  changedToDOWN: { type: 'select', inputName: 'eventMark', options: 'changed to DOWN', value: 'Unplugged' },
  changedToUP: { type: 'select', inputName: 'eventMark', options: 'changed to UP', value: 'Plugged in' },

  // reboot
  webUI: { type: 'select', inputName: 'eventMark', options: 'web ui', value: 'From Web UI' },
  ioman: { type: 'select', inputName: 'eventMark', options: 'input/output', value: 'Input/output' },
  pingReboot2: { type: 'select', inputName: 'eventMark', options: 'ping reboot', value: 'From ping reboot' },
  rebootScheduler: { type: 'select', inputName: 'eventMark', options: 'reboot scheduler', value: 'From reboot scheduler' },
  fromButton: { type: 'select', inputName: 'eventMark', options: 'from button', value: 'From button' },
  smsReboot: { type: 'select', inputName: 'eventMark', options: 'sms reboot', value: 'From SMS' },

  // failover
  switchedToMain: { type: 'select', inputName: 'eventMark', options: 'Switched to main', value: 'Switched to main' },
  switchedToBackup: { type: 'select', inputName: 'eventMark', options: 'Switched to backup', value: 'Switched to failover' },

  // mobile data
  dataConnected: { type: 'select', inputName: 'eventMark', options: 'data connected', value: 'Connected' },
  dataDisconnected: { type: 'select', inputName: 'eventMark', options: 'data disconnected', value: 'Disconnected' },

  // sms
  receivedFrom: { type: 'select', inputName: 'eventMark', options: 'received from', value: 'SMS received' },

  // webui
  wasSuccessful: { type: 'select', inputName: 'eventMark', options: 'was successful', value: 'Successful authentication' },
  notSuccessful: { type: 'select', inputName: 'eventMark', options: 'not successful', value: 'Unsuccessful authentication' },

  // sim switch
  toSIM1: { type: 'select', inputName: 'eventMark', options: 'to SIM1', value: 'Changing to SIM1' },
  toSIM2: { type: 'select', inputName: 'eventMark', options: 'to SIM2', value: 'Changing to SIM2' },

  // dhcp
  lan: { type: 'select', inputName: 'eventMark', options: 'lan', value: 'Connected from LAN' },
  wifi: { type: 'select', inputName: 'eventMark', options: 'wifi', value: 'Connected from WiFi' }
}

const action = {
  sendEmail: { type: 'select', inputName: 'action', options: 'sendEmail', value: 'Send Email' },
  sendSMS: { type: 'select', inputName: 'action', options: 'sendSMS', value: 'Send SMS', depend: hasModem }
}

const message = { type: 'textarea', inputName: 'message', value: 'Test 123' }

// Action send Email
const subject = { type: 'input', inputName: 'subject', value: 'Test' }
const recipEmail = { type: 'list', inputName: 'recipEmail', value: ['test@test.com'] }

const recipientFormat = {
  single: { type: 'select', inputName: 'recipient_format', options: 'single', value: 'Single', depend: hasModem },
  group: { type: 'select', inputName: 'recipient_format', options: 'group', value: 'Group', depend: hasModem }
}
const telnum = { type: 'input', inputName: 'telnum', value: '+37000000000', depend: hasModem }

function checkEventSubtype(type, subtype) {
  return availableEvents[type] ? availableEvents[type].includes(subtype) : false
}

describe('Events reporting rules configuration', () => {
  const mainSchema = [enable, message]
  const emailSchema = [[...mainSchema], action.sendEmail, subject, recipEmail]
  const groupSchema = [[...mainSchema], action.sendSMS, recipientFormat.group]
  const singleSchema = [[...mainSchema], action.sendSMS, recipientFormat.single, telnum]
  describe('Event type: Config change', function () {
    const configEmailSchema = [eventType.config, ...emailSchema]
    const configGroupSchema = [eventType.config, ...groupSchema]
    const configSingleSchema = [eventType.config, ...singleSchema]
    const allConfigSchemas = [configEmailSchema, configGroupSchema, configSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: All', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.all.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.all
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })

    describe('Event subtype: Azure IoT Hub', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.azureIothub.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.azureIothub
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Bacnet', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.bacnetRouter.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.bacnetRouter
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Bluetooth devices', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.bleDevices.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.bleDevices
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Buttons', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.buttons.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.buttons
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Call utilities', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.callUtils.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.callUtils
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: CLI', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.cli.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.cli
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: DMVPN', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.dmvpn.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.dmvpn
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: DNP3 TCP client', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.dnp3Client.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.dnp3Client
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: DNP3 outstation', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.dnp3Outstation.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.dnp3Outstation
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: TR-069', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.easycwmp.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.easycwmp
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Email to SMS', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.emailToSms.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.emailToSms
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Email relay', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.emailRelay.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.emailRelay
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Dynamic routes', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.frr.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.frr
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: SD & USB tools', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.fstab.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.fstab
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: IGMP', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.igmpproxy.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.igmpproxy
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: I/O juggler', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.iojuggler.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.iojuggler
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Cumulocity', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.iot.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.iot
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: ThingWorx', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.iottw.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.iottw
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: IP block', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.ipBlockd.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.ipBlockd
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Landing page', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.landingpage.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.landingpage
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: MiniDLNA', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.minidlna.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.minidlna
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Modbus', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config?.options, eventSubtype?.modbus?.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.modbus
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Modbus TCP client', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.modbusClient.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.modbusClient
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Modbus gateway', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.modbusgateway.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.modbusgateway
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Multi AP', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.multiWifi.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.multiWifi
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: OPC UA', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.opcuaClient.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.opcuaClient
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Mobile operator list', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.operctl.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.operctl
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Overview', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.overview.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.overview
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Printer server', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.p910nd.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.p910nd
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Package restore', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.packageRestore.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.packageRestore
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: PPTP', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.pptpd.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.pptpd
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: QoS', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.qos.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.qos
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: RMS', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.rmsMqtt.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.rmsMqtt
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Users management', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.rpcd.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.rpcd
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: RS console', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.rsConsole.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.rsConsole
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: RS modbus', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.rsModbus.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.rsModbus
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: RS modem', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.rsModem.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.rsModem
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: RS NTRIP', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.rsNtrip.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.rsNtrip
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: RS overIP', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.rsOverip.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.rsOverip
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Fota', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.rutFota.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.rutFota
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Sim switch', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.simSwitchConf.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.simSwitchConf
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: SMPP', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.smpp.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.smpp
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: SNMP Trap', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.snmptrap.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.snmptrap
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Console', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.socat.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.socat
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: SSHFS', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.sshfs.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.sshfs
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Stunnel', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.stunnel.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.stunnel
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: System', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.system.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.system
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Telnet', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.telnetd.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.telnetd
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Tinc VPN', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.tinc.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.tinc
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: UDP broadcast relay', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.udprelay.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.udprelay
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Web server', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.uhttpd.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.uhttpd
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: User groups', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.userGroups.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.userGroups
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Widget', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.widget.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.widget
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: WiFi scanner', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.wifiScanner.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.wifiScanner
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: L2TP', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.xl2tpd.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.xl2tpd
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Zerotier', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.zerotier.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.zerotier
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
        console.log(allConfigSchemas)
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })

    describe('Event subtype: OpenVPN', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.openvpn.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.openvpn
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Events reporting', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.eventsReporting.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.eventsReporting
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Reboot scheduler', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.periodicReboot.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.periodicReboot
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Ping reboot', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.pingReboot.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.pingReboot
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Profiles', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.profile.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.profile
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: IPsec', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.ipsec.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.ipsec
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: DHCP', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.dhcp.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.dhcp
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: SSH', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.dropbear.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.dropbear
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Network', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.network.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.network
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Firewall', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.firewall.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.firewall
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: NTP client', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.ntpclient.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.ntpclient
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: NTPD', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.ntpd.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.ntpd
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: NTP server', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.ntpserver.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.ntpserver
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: DDNS', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.ddns.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.ddns
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: SNMP', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.snmpd.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.snmpd
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Mobile', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.simcard.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.simcard
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Failover', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.mwan.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.mwan
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Data limit', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.quotaLimit.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.quotaLimit
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: GPS', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.gps.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.gps
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Site blocking', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.hostblock.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.hostblock
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Content blocker', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.privoxy.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.privoxy
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: VRRP', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.vrrpd.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.vrrpd
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: UPNP', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.upnpd.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.upnpd
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Bluetooth', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.blesem.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.blesem
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: SQM', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.sqm.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.sqm
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Traffic logging', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.ulogd.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.ulogd
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Data to server', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.modbusDataSender.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.modbusDataSender
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: MQTT broker', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.mosquitto.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.mosquitto
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: MQTT publisher', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.mqttPub.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.mqttPub
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Hotspot', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.chilli.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.chilli
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Input/output', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.ioman.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.ioman
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Wireless', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.wireless.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.wireless
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Network shares', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.samba.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.samba
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Wake on LAN', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.etherwake.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.etherwake
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: SMS gateway', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.smsGateway.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.smsGateway
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: SMS utils', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.config.options, eventSubtype.smsUtils.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.smsUtils
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, configEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, configSingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: New DHCP client', () => {
    const dhcpEmailSchema = [eventType.dhcp, ...emailSchema]
    const dhcpGroupSchema = [eventType.dhcp, ...groupSchema]
    const dhcpSingleSchema = [eventType.dhcp, ...singleSchema]
    const allConfigSchemas = [dhcpEmailSchema, dhcpGroupSchema, dhcpSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: All', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.dhcp.options, eventSubtype.all.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.all
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, dhcpEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, dhcpGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, dhcpSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Connected from LAN', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.dhcp.options, eventSubtype.lan.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.lan
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, dhcpEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, dhcpGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, dhcpSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Connected from WiFi', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.dhcp.options, eventSubtype.wifi.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.wifi
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, dhcpEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, dhcpGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, dhcpSingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: Reboot', () => {
    const rebootEmailSchema = [eventType.reboot, ...emailSchema]
    const rebootGroupSchema = [eventType.reboot, ...groupSchema]
    const rebootSingleSchema = [eventType.reboot, ...singleSchema]
    const allConfigSchemas = [rebootEmailSchema, rebootGroupSchema, rebootSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: All', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.reboot.options, eventSubtype.all.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.all
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, rebootEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: From Web UI', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.reboot.options, eventSubtype.webUI.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.webUI
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, rebootEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: From input/output', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.reboot.options, eventSubtype.io.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.io
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, rebootEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: From ping reboot', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.reboot.options, eventSubtype.pingReboot2.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.pingReboot2
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, rebootEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: From reboot scheduler', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.reboot.options, eventSubtype.rebootScheduler.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.rebootScheduler
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, rebootEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: From button', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.reboot.options, eventSubtype.fromButton.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.fromButton
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, rebootEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: From SMS', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.reboot.options, eventSubtype.smsReboot.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.smsReboot
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, rebootEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, rebootSingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: SSH', () => {
    const sshEmailSchema = [eventType.ssh, ...emailSchema]
    const sshGroupSchema = [eventType.ssh, ...groupSchema]
    const sshSingleSchema = [eventType.ssh, ...singleSchema]
    const allConfigSchemas = [sshEmailSchema, sshGroupSchema, sshSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: All', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.ssh.options, eventSubtype.all.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.all
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, sshEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, sshGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, sshSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Successful authentication', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.ssh.options, eventSubtype.succeeded.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.succeeded
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, sshEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, sshGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, sshSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Unsuccessful authentication', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.ssh.options, eventSubtype.bad.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.bad
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, sshEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, sshGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, sshSingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: Web UI', () => {
    const webuiEmailSchema = [eventType.webUI, ...emailSchema]
    const webuiGroupSchema = [eventType.webUI, ...groupSchema]
    const webuiSingleSchema = [eventType.webUI, ...singleSchema]
    const allConfigSchemas = [webuiEmailSchema, webuiGroupSchema, webuiSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: All', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.webUI.options, eventSubtype.all.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.all
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, webuiEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, webuiGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, webuiSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Successful authentication', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.webUI.options, eventSubtype.wasSuccessful.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.wasSuccessful
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, webuiEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, webuiGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, webuiSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Unsuccessful authentication', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.webUI.options, eventSubtype.notSuccessful.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.notSuccessful
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, webuiEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, webuiGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, webuiSingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: New WiFi client', () => {
    const wifiEmailSchema = [eventType.wifi, ...emailSchema]
    const wifiGroupSchema = [eventType.wifi, ...groupSchema]
    const wifiSingleSchema = [eventType.wifi, ...singleSchema]
    const allConfigSchemas = [wifiEmailSchema, wifiGroupSchema, wifiSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: All', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.wifi.options, eventSubtype.all.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.all
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, wifiEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, wifiGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, wifiSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Connected', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.wifi.options, eventSubtype.clientConnected.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.clientConnected
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, wifiEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, wifiGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, wifiSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Disconnected', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.wifi.options, eventSubtype.clientDisconnected.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.clientDisconnected
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, wifiEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, wifiGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, wifiSingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: Mobile Data', () => {
    const mobileDataEmailSchema = [eventType.mobileData, ...emailSchema]
    const mobileDataGroupSchema = [eventType.mobileData, ...groupSchema]
    const mobileDataSingleSchema = [eventType.mobileData, ...singleSchema]
    const allConfigSchemas = [mobileDataEmailSchema, mobileDataGroupSchema, mobileDataSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: All', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.mobileData.options, eventSubtype.all.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.all
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, mobileDataEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, mobileDataGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, mobileDataSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Connected', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.mobileData.options, eventSubtype.dataConnected.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.dataConnected
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, mobileDataEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, mobileDataGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, mobileDataSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Disconnected', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.mobileData.options, eventSubtype.dataDisconnected.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.dataDisconnected
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, mobileDataEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, mobileDataGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, mobileDataSingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: WAN failover', () => {
    const failoverEmailSchema = [eventType.failover, ...emailSchema]
    const failoverGroupSchema = [eventType.failover, ...groupSchema]
    const failoverSingleSchema = [eventType.failover, ...singleSchema]
    const allConfigSchemas = [failoverEmailSchema, failoverGroupSchema, failoverSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: All', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.failover.options, eventSubtype.all.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.all
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, failoverEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, failoverGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, failoverSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Switched to main', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.failover.options, eventSubtype.switchedToMain.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.switchedToMain
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, failoverEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, failoverGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, failoverSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Switched to failover', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.failover.options, eventSubtype.switchedToBackup.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.switchedToBackup
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, failoverEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, failoverGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, failoverSingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: SMS', () => {
    const smsEmailSchema = [eventType.sms, ...emailSchema]
    const smsGroupSchema = [eventType.sms, ...groupSchema]
    const smsSingleSchema = [eventType.sms, ...singleSchema]
    const allConfigSchemas = [smsEmailSchema, smsGroupSchema, smsSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: SMS received', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.sms.options, eventSubtype.receivedFrom.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.receivedFrom
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, smsEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, smsGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, smsSingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: Signal strength', () => {
    const signalEmailSchema = [eventType.signalStrength, ...emailSchema]
    const signalGroupSchema = [eventType.signalStrength, ...groupSchema]
    const signalSingleSchema = [eventType.signalStrength, ...singleSchema]
    const allConfigSchemas = [signalEmailSchema, signalGroupSchema, signalSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: All', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.signalStrength.options, eventSubtype.all.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.all
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, signalEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: -121dBm -113dBm', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.signalStrength.options, eventSubtype.signalStrength113.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.signalStrength113
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, signalEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: -113dBm -98dBm', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.signalStrength.options, eventSubtype.signalStrength98.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.signalStrength98
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, signalEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: -98dBm -93dBm', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.signalStrength.options, eventSubtype.signalStrength93.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.signalStrength93
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, signalEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: -93dBm -75dBm', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.signalStrength.options, eventSubtype.signalStrength75.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.signalStrength75
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, signalEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: -75dBm -60dBm', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.signalStrength.options, eventSubtype.signalStrength60.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.signalStrength60
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, signalEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: -60dBm -50dBm', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.signalStrength.options, eventSubtype.signalStrength50.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.signalStrength50
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, signalEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, signalSingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: SIM switch', () => {
    const simSwitchEmailSchema = [eventType.simSwitch, ...emailSchema]
    const simSwitchGroupSchema = [eventType.simSwitch, ...groupSchema]
    const simSwitchSingleSchema = [eventType.simSwitch, ...singleSchema]
    const allConfigSchemas = [simSwitchEmailSchema, simSwitchGroupSchema, simSwitchSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: All', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.simSwitch.options, eventSubtype.all.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.all
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, simSwitchEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, simSwitchGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, simSwitchSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Changing to SIM1', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.simSwitch.options, eventSubtype.toSIM1.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.toSIM1
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, simSwitchEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, simSwitchGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, simSwitchSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Changing to SIM2', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.simSwitch.options, eventSubtype.toSIM2.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.toSIM2
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, simSwitchEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, simSwitchGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, simSwitchSingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: Port state', () => {
    const switchEventsEmailSchema = [eventType.switchEvents, ...emailSchema]
    const switchEventsGroupSchema = [eventType.switchEvents, ...groupSchema]
    const switchEventsSingleSchema = [eventType.switchEvents, ...singleSchema]
    const allConfigSchemas = [switchEventsEmailSchema, switchEventsGroupSchema, switchEventsSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: All', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.switchEvents.options, eventSubtype.all.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.all
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, switchEventsEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, switchEventsGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, switchEventsSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Link state', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.switchEvents.options, eventSubtype.portLinkState.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.portLinkState
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, switchEventsEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, switchEventsGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, switchEventsSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Link speed', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.switchEvents.options, eventSubtype.portSpeedFor.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.portSpeedFor
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, switchEventsEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, switchEventsGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, switchEventsSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Unplugged', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.switchEvents.options, eventSubtype.changedToDOWN.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.changedToDOWN
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, switchEventsEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, switchEventsGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, switchEventsSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Plugged in', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.switchEvents.options, eventSubtype.changedToUP.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.changedToDOWN
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, switchEventsEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, switchEventsGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, switchEventsSingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: Topology state', () => {
    const switchTopologyEmailSchema = [eventType.switchTopology, ...emailSchema]
    const switchTopologyGroupSchema = [eventType.switchTopology, ...groupSchema]
    const switchTopologySingleSchema = [eventType.switchTopology, ...singleSchema]
    const allConfigSchemas = [switchTopologyEmailSchema, switchTopologyGroupSchema, switchTopologySingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: Topology changes', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.switchTopology.options, eventSubtype.changesInTopology.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.changesInTopology
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, switchTopologyEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, switchTopologyGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, switchTopologySingleSchema, 'events_reporting')
      })
    })
  })
  describe('Event type: GPS', () => {
    const gpsEmailSchema = [eventType.gps, ...emailSchema]
    const gpsGroupSchema = [eventType.gps, ...groupSchema]
    const gpsSingleSchema = [eventType.gps, ...singleSchema]
    const allConfigSchemas = [gpsEmailSchema, gpsGroupSchema, gpsSingleSchema]
    afterEach(function () {
      if (!skipPop) {
        allConfigSchemas.forEach(schema => {
          schema.pop()
        })
      }
      skipPop = false
    })
    describe('Event subtype: All', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.gps.options, eventSubtype.all.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.all
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, gpsEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, gpsGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, gpsSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Left geofence', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.gps.options, eventSubtype.leftGeofence.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.leftGeofence
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, gpsEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, gpsGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, gpsSingleSchema, 'events_reporting')
      })
    })
    describe('Event subtype: Entered geofence', () => {
      beforeEach(function () {
        if (!checkEventSubtype(eventType.gps.options, eventSubtype.enteredGeofence.options)) {
          skipPop = true
          this.skip()
        }
        const subtype = eventSubtype.enteredGeofence
        allConfigSchemas.forEach(schema => {
          schema.push(subtype)
        })
      })
      it('Action send email without email account selected', () => {
        cy.testConfigurationEdit(endpoint, gpsEmailSchema, 'events_reporting')
      })
      it('Action send sms, recipients Group', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, gpsGroupSchema, 'events_reporting')
      })
      it('Action send sms, recipients Single', function () {
        if (!hasModem) this.skip()
        cy.testConfigurationEdit(endpoint, gpsSingleSchema, 'events_reporting')
      })
    })
  })
})
