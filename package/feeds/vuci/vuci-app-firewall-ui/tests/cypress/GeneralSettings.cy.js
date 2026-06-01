const route = 'network/firewall/zones'
const endpoints = {
  general: '/firewall/zones/config',
  nat: '/nat_offloading/global/',
  zones: '/firewall/zones/config'
}

let zones
let ifaces
before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${endpoints.zones}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      zones = body.data
    })
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/interfaces/config`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      ifaces = body.data
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

// general settings
const dropValid = {
  on: { type: 'switch', inputName: 'drop_invalid', value: 'true' },
  off: { type: 'switch', inputName: 'drop_invalid', value: 'false' }
}
const autoHelper = {
  on: { type: 'switch', inputName: 'auto_helper', value: 'true' },
  off: { type: 'switch', inputName: 'auto_helper', value: 'false' }
}

// Routing/NAT Offloading
const flowOffloading = {
  on: { type: 'switch', inputName: 'flow_offloading', value: 'true' },
  off: { type: 'switch', inputName: 'flow_offloading', value: 'false' }
}

// common
const input = {
  reject: { type: 'select', inputName: 'input', value: 'Reject' },
  accept: { type: 'select', inputName: 'input', value: 'Accept' },
  drop: { type: 'select', inputName: 'input', value: 'Drop' }
}
const output = {
  reject: { type: 'select', inputName: 'output', value: 'Reject' },
  accept: { type: 'select', inputName: 'output', value: 'Accept' },
  drop: { type: 'select', inputName: 'output', value: 'Drop' }
}
const forward = {
  reject: { type: 'select', inputName: 'forward', value: 'Reject' },
  accept: { type: 'select', inputName: 'forward', value: 'Accept' },
  drop: { type: 'select', inputName: 'forward', value: 'Drop' }
}

// Zones
const zoneName = { type: 'input', inputName: 'name' }
const masq = {
  on: { type: 'switch', inputName: 'masq', value: 'true' },
  off: { type: 'switch', inputName: 'masq', value: 'false' }
}
const mtuFix = {
  on: { type: 'switch', inputName: 'mtu_fix', value: 'true' },
  off: { type: 'switch', inputName: 'mtu_fix', value: 'false' }
}
const network = { type: 'multiselect', inputName: 'network' }
// advance
const ipvFamily = {
  both: { type: 'select', inputName: 'family', value: 'IPv4 and IPv6' },
  ipv4: { type: 'select', inputName: 'family', value: 'IPv4 only' },
  ipv6: { type: 'select', inputName: 'family', value: 'IPv6 only' }
}
const masqSrc = { type: 'list', inputName: 'masq_src' }
const masqDest = { type: 'list', inputName: 'masq_dest' }
const conntrack = {
  on: { type: 'switch', inputName: 'conntrack', value: 'true' },
  off: { type: 'switch', inputName: 'conntrack', value: 'false' }
}
const log = {
  on: { type: 'switch', inputName: 'log', value: 'true' },
  off: { type: 'switch', inputName: 'log', value: 'false' }
}
const logLimit = { type: 'input', inputName: 'log_limit' }
// forwarding
const forwardOut = { type: 'multiselect', inputName: 'out' }
const forwardIn = { type: 'multiselect', inputName: 'in' }

describe('Firewall: general settings', () => {
  describe('General setting section', () => {
    it('Change general settings', () => {
      const schema = [dropValid.on, autoHelper.off, input.accept, output.reject, forward.drop]
      cy.testNamedConfiguration(endpoints.general, schema, 'general')
    })
    it('Revert general settings', () => {
      const schema = [dropValid.off, autoHelper.on, input.reject, output.accept, forward.reject]
      cy.testNamedConfiguration(endpoints.general, schema, 'general')
    })
  })
  describe('Routing/NAT Offloading settings', () => {
    it('Turn on offloading', () => {
      const schema = [flowOffloading.on]
      cy.testNamedConfiguration(endpoints.general, schema, 'nat')
    })
    it('Turn off offloading', () => {
      const schema = [flowOffloading.off]
      cy.testNamedConfiguration(endpoints.general, schema, 'nat')
    })
  })
  describe('Zone settings', () => {
    describe('Overview', () => {
      it('Change lan=>wan config', () => {
        const schema = [input.accept, output.reject, forward.drop, masq.on, mtuFix.on]
        cy.testNamedConfiguration(endpoints.zones, schema, zones[0].id)
      })
      it('Revert lan=>wan config', () => {
        const schema = [input.accept, output.accept, forward.accept, masq.off, mtuFix.off]
        cy.testNamedConfiguration(endpoints.zones, schema, zones[0].id)
      })
    })
    describe('Edit', () => {
      it('Save with default options', () => {
        cy.testConfigurationEdit(endpoints.zones, [], 'zones')
      })
      it('Save with all depends off', () => {
        const schema = [
          {
            tab: 'General Settings',
            inputs: [
              { ...zoneName, value: 'test' },
              input.accept,
              output.accept,
              forward.accept,
              masq.on,
              mtuFix.on,
              { ...network, value: [{ options: ifaces[0].id, value: ifaces[0].id }] },
              { ...forwardOut, value: [{ options: zones[1].name, value: zones[1].name }] },
              { ...forwardIn, value: [{ options: zones[0].name, value: zones[0].name }] }
            ]
          },
          {
            tab: 'Advanced Settings',
            inputs: [ipvFamily.ipv4, { ...masqSrc, value: ['192.168.12.0/24', '192.168.11.0/24'] }, { ...masqDest, value: ['192.168.12.10/24', '192.168.11.10/24'] }, conntrack.on, log.off]
          }
        ]
        cy.testConfigurationEdit(endpoints.zones, schema, 'zones')
      })
      it('Save with all depends on', () => {
        const schema = [
          {
            tab: 'General Settings',
            inputs: [
              { ...zoneName, value: 'test' },
              input.accept,
              output.accept,
              forward.accept,
              masq.on,
              mtuFix.on,
              { ...network, value: [{ options: ifaces[0].id, value: ifaces[0].id }] },
              { ...forwardOut, value: [{ options: zones[1].name, value: zones[1].name }] },
              { ...forwardIn, value: [{ options: zones[0].name, value: zones[0].name }] }
            ]
          },
          {
            tab: 'Advanced Settings',
            inputs: [
              ipvFamily.ipv4,
              { ...masqSrc, value: ['192.168.12.0/24', '192.168.11.0/24'] },
              { ...masqDest, value: ['192.168.12.10/24', '192.168.11.10/24'] },
              conntrack.on,
              log.on,
              { ...logLimit, value: '10/minute' }
            ]
          }
        ]
        cy.testConfigurationEdit(endpoints.zones, schema, 'zones')
      })
    })
  })
})
