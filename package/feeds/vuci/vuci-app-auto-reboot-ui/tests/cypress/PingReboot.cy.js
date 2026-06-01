const route = '/system/maintenance/auto_reboot/ping_reboot'
const endpoint = '/auto_reboot/ping_wget/config'
let modemInfo = []
let simCount = 0
let builtInModemsCount = 0
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
      simCount =
        modemInfo.length > 0
          ? Math.max.apply(
              Math,
              modemInfo.map(o => o.sim_count)
            )
          : 0
      builtInModemsCount = modemInfo.filter(e => e.builtin === true).length
    })
    cy.hitPage(route)
  })
})
after(() => {
  cy.logout()
})
const enable = { type: 'switch', inputName: 'enable', value: 'true' }
const stop_action = { type: 'switch', inputName: 'stop_action', value: 'true', depend: modemInfo.length > 0 }
const type = {
  ping: { type: 'select', inputName: 'type', options: 'ping', value: 'Ping' },
  wget: { type: 'select', inputName: 'type', options: 'wget', value: 'Wget' }
}
const action = {
  device_reboot: { type: 'select', inputName: 'action', options: '1', value: 'Device reboot' },
  modem_reboot: { type: 'select', inputName: 'action', options: '2', value: 'Modem reboot' },
  none: { type: 'select', inputName: 'action', options: '3', value: 'None' },
  reregister: { type: 'select', inputName: 'action', options: '4', value: '(Re)register' },
  restart_mobile_connection: { type: 'select', options: '5', inputName: 'action', value: 'Restart mobile connection' },
  send_sms: { type: 'select', inputName: 'action', options: '6', value: 'Send SMS' }
}
const modem = { type: 'select', inputName: 'modem', value: 'Primary modem', depend: modemInfo.length > 1 }
const modem_id_sms = { type: 'select', inputName: 'modem_id_sms', value: 'Primary modem', depend: modemInfo.length > 1 }
const number = { type: 'list', inputName: 'number', value: ['+37060000000'] }
const message = { type: 'textarea', inputName: 'message', value: 'test' }
const time = { type: 'select', inputName: 'time', options: '15', value: '15 mins' }
const retry = { type: 'input', inputName: 'retry', value: '1' }
const time_out = { type: 'input', inputName: 'time_out', value: '1' }
const packet_size = { type: 'input', inputName: 'packet_size', value: '1' }
const interfaces = {
  automatically_selected: { type: 'select', inputName: 'interface', options: '1', value: 'Automatically selected' },
  ping_from_mobile: { type: 'select', inputName: 'interface', options: '2', value: 'Ping from mobile' }
}
const ip_type = {
  ipv4: { type: 'select', inputName: 'ip_type', options: 'ipv4', value: 'IPv4' },
  ipv6: { type: 'select', inputName: 'ip_type', options: 'ipv6', value: 'IPv6' }
}

const host_url = { type: 'input', inputName: 'host', value: 'http://www.example.com' }
const host_to_ping = {
  ipv4: { type: 'input', inputName: 'host', value: '8.8.8.8' },
  ipv6: { type: 'input', inputName: 'host', value: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' }
}
const ip_type1 = {
  ipv4: { type: 'select', inputName: 'ip_type1', options: 'ipv4', value: 'IPv4' },
  ipv6: { type: 'select', inputName: 'ip_type1', options: 'ipv6', value: 'IPv6' }
}
const host1 = {
  ipv4: { type: 'input', inputName: 'host1', value: '8.8.8.8' },
  ipv6: { type: 'input', inputName: 'host1', value: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' }
}
const ip_type2 = {
  ipv4: { type: 'select', inputName: 'ip_type2', options: 'ipv4', value: 'IPv4', depend: (modemInfo.length !== 0 && simCount > 1) || builtInModemsCount > 1 },
  ipv6: { type: 'select', inputName: 'ip_type2', options: 'ipv6', value: 'IPv6', depend: (modemInfo.length !== 0 && simCount > 1) || builtInModemsCount > 1 }
}
const host2 = {
  ipv4: { type: 'input', inputName: 'host2', value: '8.8.8.8', depend: (modemInfo.length !== 0 && simCount > 1) || builtInModemsCount > 1 },
  ipv6: { type: 'input', inputName: 'host2', value: '2001:0db8:85a3:0000:0000:8a2e:0370:7334', depend: (modemInfo.length !== 0 && simCount > 1) || builtInModemsCount > 1 }
}
describe('Ping/wget reboot configuration', () => {
  describe('Configuration of ping reboot with tupe `Ping`', () => {
    describe('Configuration with Action if no echo is received `Device reboot`', () => {
      describe('Configuration with Interface `Automatically selected`', () => {
        it('Configurations of ping reboot with ipv4', { skipDevice: 'RUTX' }, () => {
          const schema = [enable, stop_action, action.device_reboot, time, retry, time_out, packet_size, interfaces.automatically_selected, ip_type.ipv4, host_to_ping.ipv4]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
        it('Configurations of ping reboot with ipv6', () => {
          const schema = [enable, stop_action, action.device_reboot, time, retry, time_out, packet_size, interfaces.automatically_selected, ip_type.ipv6, host_to_ping.ipv6]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
      })
      describe('Configuration with Interface `Ping from mobile`', () => {
        it('Configurations of ping reboot with ipv4', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.device_reboot, time, retry, time_out, packet_size, interfaces.ping_from_mobile, ip_type1.ipv4, host1.ipv4, ip_type2.ipv4, host2.ipv4]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
        it('Configurations of ping reboot with ipv6', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.device_reboot, time, retry, time_out, packet_size, interfaces.ping_from_mobile, ip_type1.ipv6, host1.ipv6, ip_type2.ipv6, host2.ipv6]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
      })
    })
    describe('Configuration with Action if no echo is received `None`', () => {
      describe('Configuration with Interface `Automatically selected`', () => {
        it('Configurations of ping reboot with ipv4', () => {
          const schema = [enable, stop_action, action.none, time, retry, time_out, packet_size, interfaces.automatically_selected, ip_type.ipv4, host_to_ping.ipv4]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
        it('Configurations of ping reboot with ipv6', () => {
          const schema = [enable, stop_action, action.none, time, retry, time_out, packet_size, interfaces.automatically_selected, ip_type.ipv6, host_to_ping.ipv6]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
      })
      describe('Configuration with Interface `Ping from mobile`', () => {
        it('Configurations of ping reboot with ipv4', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.none, time, retry, time_out, packet_size, interfaces.ping_from_mobile, ip_type1.ipv4, host1.ipv4, ip_type2.ipv4, host2.ipv4]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
        it('Configurations of ping reboot with ipv6', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.none, time, retry, time_out, packet_size, interfaces.ping_from_mobile, ip_type1.ipv6, host1.ipv6, ip_type2.ipv6, host2.ipv6]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
      })
    })
    describe('Configuration with Action if no echo is received `Modem reboot`', () => {
      describe('Configuration with Interface `Automatically selected`', () => {
        it('Configurations of ping reboot with ipv4', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.modem_reboot, modem, time, retry, time_out, packet_size, interfaces.automatically_selected, ip_type.ipv4, host_to_ping.ipv4]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
        it('Configurations of ping reboot with ipv6', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.modem_reboot, modem, time, retry, time_out, packet_size, interfaces.automatically_selected, ip_type.ipv6, host_to_ping.ipv6]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
      })
      describe('Configuration with Interface `Ping from mobile`', () => {
        it('Configurations of ping reboot with ipv4', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.modem_reboot, modem, time, retry, time_out, packet_size, interfaces.ping_from_mobile, ip_type1.ipv4, host1.ipv4, ip_type2.ipv4, host2.ipv4]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
        it('Configurations of ping reboot with ipv6', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.modem_reboot, modem, time, retry, time_out, packet_size, interfaces.ping_from_mobile, ip_type1.ipv6, host1.ipv6, ip_type2.ipv6, host2.ipv6]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
      })
    })
    describe('Configuration with Action if no echo is received `(Re)register`', () => {
      describe('Configuration with Interface `Automatically selected`', () => {
        it('Configurations of ping reboot with ipv4', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.reregister, modem, time, retry, time_out, packet_size, interfaces.automatically_selected, ip_type.ipv4, host_to_ping.ipv4]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
        it('Configurations of ping reboot with ipv6', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.reregister, modem, time, retry, time_out, packet_size, interfaces.automatically_selected, ip_type.ipv6, host_to_ping.ipv6]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
      })
      describe('Configuration with Interface `Ping from mobile`', () => {
        it('Configurations of ping reboot with ipv4', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.reregister, modem, time, retry, time_out, packet_size, interfaces.ping_from_mobile, ip_type1.ipv4, host1.ipv4, ip_type2.ipv4, host2.ipv4]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
        it('Configurations of ping reboot with ipv6', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.reregister, modem, time, retry, time_out, packet_size, interfaces.ping_from_mobile, ip_type1.ipv6, host1.ipv6, ip_type2.ipv6, host2.ipv6]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
      })
    })
    describe('Configuration with Action if no echo is received `Restart mobile connection`', () => {
      describe('Configuration with Interface `Automatically selected`', () => {
        it('Configurations of ping reboot with ipv4', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.restart_mobile_connection, modem, time, retry, time_out, packet_size, interfaces.automatically_selected, ip_type.ipv4, host_to_ping.ipv4]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
        it('Configurations of ping reboot with ipv6', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [enable, stop_action, action.restart_mobile_connection, modem, time, retry, time_out, packet_size, interfaces.automatically_selected, ip_type.ipv6, host_to_ping.ipv6]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
      })
      describe('Configuration with Interface `Ping from mobile`', () => {
        it('Configurations of ping reboot with ipv4', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [
            enable,
            stop_action,
            action.restart_mobile_connection,
            modem,
            time,
            retry,
            time_out,
            packet_size,
            interfaces.ping_from_mobile,
            ip_type1.ipv4,
            host1.ipv4,
            ip_type2.ipv4,
            host2.ipv4
          ]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
        it('Configurations of ping reboot with ipv6', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [
            enable,
            stop_action,
            action.restart_mobile_connection,
            modem,
            time,
            retry,
            time_out,
            packet_size,
            interfaces.ping_from_mobile,
            ip_type1.ipv6,
            host1.ipv6,
            ip_type2.ipv6,
            host2.ipv6
          ]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
      })
    })
    describe('Configuration with Action if no echo is received `Send SMS`', () => {
      describe('Configuration with Interface `Automatically selected`', () => {
        it('Configurations of ping reboot with ipv4', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [stop_action, action.send_sms, modem_id_sms, number, message, time, retry, time_out, packet_size, interfaces.automatically_selected, ip_type.ipv4, host_to_ping.ipv4]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
        it('Configurations of ping reboot with ipv6', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [stop_action, action.send_sms, modem_id_sms, number, message, time, retry, time_out, packet_size, interfaces.automatically_selected, ip_type.ipv6, host_to_ping.ipv6]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
      })
      describe('Configuration with Interface `Ping from mobile`', () => {
        it('Configurations of ping reboot with ipv4', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [
            stop_action,
            action.send_sms,
            modem_id_sms,
            number,
            message,
            time,
            retry,
            time_out,
            packet_size,
            interfaces.ping_from_mobile,
            ip_type1.ipv4,
            host1.ipv4,
            ip_type2.ipv4,
            host2.ipv4
          ]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
        it('Configurations of ping reboot with ipv6', function () {
          if (modemInfo.length === 0) this.skip()
          const schema = [
            stop_action,
            action.send_sms,
            modem_id_sms,
            number,
            message,
            time,
            retry,
            time_out,
            packet_size,
            interfaces.ping_from_mobile,
            ip_type1.ipv6,
            host1.ipv6,
            ip_type2.ipv6,
            host2.ipv6
          ]
          cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
        })
      })
    })
  })
  describe('Configuration of ping reboot with tupe `Wget` testing', () => {
    it('Configuration with Action if no echo is received `Device reboot`', () => {
      const schema = [enable, stop_action, type.wget, action.device_reboot, time, retry, time_out, host_url]
      cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
    })
    it('Configuration with Action if no echo is received `None`', () => {
      const schema = [enable, stop_action, type.wget, action.none, time, retry, time_out, host_url]
      cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
    })
    it('Configuration with Action if no echo is received `Modem reboot`', function () {
      if (modemInfo.length === 0) this.skip()
      const schema = [enable, stop_action, type.wget, action.modem_reboot, modem, time, retry, time_out, host_url]
      cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
    })
    it('Configuration with Action if no echo is received `(Re)register`', function () {
      if (modemInfo.length === 0) this.skip()
      const schema = [enable, stop_action, type.wget, action.reregister, modem, time, retry, time_out, host_url]
      cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
    })
    it('Configuration with Action if no echo is received `Restart mobile connection`', function () {
      if (modemInfo.length === 0) this.skip()
      const schema = [enable, stop_action, type.wget, action.restart_mobile_connection, modem, time, retry, time_out, host_url]
      cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
    })
    it('Configuration with Action if no echo is received `Send SMS`', function () {
      if (modemInfo.length === 0) this.skip()
      const schema = [stop_action, type.wget, action.send_sms, modem_id_sms, number, message, time, retry, time_out, host_url]
      cy.testConfigurationEdit(endpoint, schema, 'ping_reboot')
    })
  })
})
