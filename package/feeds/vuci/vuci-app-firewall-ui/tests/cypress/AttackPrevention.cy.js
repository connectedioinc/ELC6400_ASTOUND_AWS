const route = 'network/attack_prevention'
const sections = {
  synFlood: {
    name: 'synFlood',
    endpoint: '/attack_prevention/syn_flood/config'
  },
  icmp: {
    name: 'icmp',
    endpoint: '/attack_prevention/icmp/config'
  },
  sshAttack: {
    name: 'sshAttack',
    endpoint: '/attack_prevention/ssh/config'
  },
  httpAttack: {
    name: 'httpAttack',
    endpoint: '/attack_prevention/http/config'
  },
  httpsAttack: {
    name: 'httpsAttack',
    endpoint: '/attack_prevention/https/config'
  }
}
const portScanSection = {
  name: 'portScan',
  endpoint: 'firewall/attack_prevention/port_scan/config/pscan'
}

before(() => {
  cy.login()
  cy.then(() => {
    Object.keys(sections).forEach(key => {
      const section = sections[key]
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api${section.endpoint}`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        section.endpoint += `/${body.data[0].id}`
      })
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const synFlood = {
  on: { type: 'switch', inputName: 'syn_flood', value: 'true' },
  off: { type: 'switch', inputName: 'syn_flood', value: 'false' }
}
const synfloodRate = { type: 'input', inputName: 'synflood_rate' }
const synfloodBurst = { type: 'input', inputName: 'synflood_burst' }
const tcpSyncookies = {
  on: { type: 'switch', inputName: 'tcp_syncookies', value: 'true' },
  off: { type: 'switch', inputName: 'tcp_syncookies', value: 'false' }
}

const enabled = {
  on: { type: 'switch', inputName: 'enabled', value: 'true' },
  off: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const icmpLimit = {
  on: { type: 'switch', inputName: 'icmp_limit', value: 'true' },
  off: { type: 'switch', inputName: 'icmp_limit', value: 'false' }
}
const sshLimit = {
  on: { type: 'switch', inputName: 'ssh_limit', value: 'true' },
  off: { type: 'switch', inputName: 'ssh_limit', value: 'false' }
}
const httpLimit = {
  on: { type: 'switch', inputName: 'http_limit', value: 'true' },
  off: { type: 'switch', inputName: 'http_limit', value: 'false' }
}
const httpsLimit = {
  on: { type: 'switch', inputName: 'https_limit', value: 'true' },
  off: { type: 'switch', inputName: 'https_limit', value: 'false' }
}

// Port scan
const portScan = {
  on: { type: 'switch', inputName: 'port_scan', value: 'true' },
  off: { type: 'switch', inputName: 'port_scan', value: 'false' }
}
const hitcount = { type: 'input', inputName: 'hitcount' }
const seconds = { type: 'input', inputName: 'seconds' }
const synFin = {
  on: { type: 'switch', inputName: 'syn_fin', value: 'true' },
  off: { type: 'switch', inputName: 'syn_fin', value: 'false' }
}
const synRst = {
  on: { type: 'switch', inputName: 'syn_rst', value: 'true' },
  off: { type: 'switch', inputName: 'syn_rst', value: 'false' }
}
const xMax = {
  on: { type: 'switch', inputName: 'x_max', value: 'true' },
  off: { type: 'switch', inputName: 'x_max', value: 'false' }
}
const nmapFin = {
  on: { type: 'switch', inputName: 'nmap_fin', value: 'true' },
  off: { type: 'switch', inputName: 'nmap_fin', value: 'false' }
}
const nullFlags = {
  on: { type: 'switch', inputName: 'null_flags', value: 'true' },
  off: { type: 'switch', inputName: 'null_flags', value: 'false' }
}

// Common
const period = {
  second: { type: 'select', inputName: 'period', value: 'Second' },
  minute: { type: 'select', inputName: 'period', value: 'Minute' },
  hour: { type: 'select', inputName: 'period', value: 'Hour' },
  day: { type: 'select', inputName: 'period', value: 'Day' }
}
const limit = { type: 'input', inputName: 'limit' }
const limitBurst = { type: 'input', inputName: 'limit_burst' }

const checkValuesAfterRefresh = (endpoint, schema, section) => {
  cy.hitPage(route)
  cy.get(`[test-id="tablerow-${section}"]`).within(() => {
    cy.checkValues(endpoint, schema, section)
  })
}

describe('Firewall: Attack prevention', () => {
  describe('Syn flood', () => {
    it('Save options with changed options', () => {
      const section = sections.synFlood
      const schema = [synFlood.off, { ...synfloodRate, value: '' }, { ...synfloodBurst, value: '' }, tcpSyncookies.on]
      cy.testNamedConfiguration(section.endpoint, schema, section.name)
    })
    it('Save options with default options', () => {
      const section = sections.synFlood
      const schema = [synFlood.on, { ...synfloodRate, value: '25' }, { ...synfloodBurst, value: '50' }, tcpSyncookies.off]
      cy.testNamedConfiguration(section.endpoint, schema, section.name)
    })
  })
  describe('Remote ICMP Requests', () => {
    it('Save options with changed options', () => {
      const section = sections.icmp
      const schema = [enabled.off, icmpLimit.on, period.day, { ...limit, value: '100' }, { ...limitBurst, value: '100' }]
      cy.testNamedConfiguration(section.endpoint, schema, section.name)
      checkValuesAfterRefresh(section.endpoint, schema, section.name)
    })
    it('Save options with default options', () => {
      const section = sections.icmp
      const schema = [enabled.on, icmpLimit.off]
      cy.testNamedConfiguration(section.endpoint, schema, section.name)
    })
  })
  describe('SSH Attack Prevention', () => {
    it('Save options with changed options', () => {
      const section = sections.sshAttack
      const schema = [sshLimit.on, period.day, { ...limit, value: '100' }, { ...limitBurst, value: '100' }]
      cy.testNamedConfiguration(section.endpoint, schema, section.name)
      checkValuesAfterRefresh(section.endpoint, schema, section.name)
    })
    it('Save options with default options', () => {
      const section = sections.sshAttack
      const schema = [sshLimit.off]
      cy.testNamedConfiguration(section.endpoint, schema, section.name)
    })
  })
  describe('HTTP Attack Prevention', () => {
    it('Save options with changed options', () => {
      const section = sections.httpAttack
      const schema = [httpLimit.on, period.day, { ...limit, value: '100' }, { ...limitBurst, value: '100' }]
      cy.testNamedConfiguration(section.endpoint, schema, section.name)
      checkValuesAfterRefresh(section.endpoint, schema, section.name)
    })
    it('Save options with default options', () => {
      const section = sections.httpAttack
      const schema = [httpLimit.off]
      cy.testNamedConfiguration(section.endpoint, schema, section.name)
    })
  })
  describe('HTTPS Attack Prevention', () => {
    it('Save options with changed options', () => {
      const section = sections.httpsAttack
      const schema = [httpsLimit.on, period.day, { ...limit, value: '100' }, { ...limitBurst, value: '100' }]
      cy.testNamedConfiguration(section.endpoint, schema, section.name)
      checkValuesAfterRefresh(section.endpoint, schema, section.name)
    })
    it('Save options with default options', () => {
      const section = sections.httpsAttack
      const schema = [httpsLimit.off]
      cy.testNamedConfiguration(section.endpoint, schema, section.name)
    })
  })
  describe('Port Scan ', () => {
    it('Save options with changed options', () => {
      const section = portScanSection
      const schema = [portScan.on, { ...hitcount, value: '100' }, { ...seconds, value: '100' }, synFin.on, synRst.on, xMax.on, nmapFin.on, nullFlags.on]
      cy.testNamedConfiguration(section.endpoint, schema, section.name)
    })
    it('Save options with default options', () => {
      const section = portScanSection
      const schema = [portScan.off, { ...hitcount, value: '' }, { ...seconds, value: '' }, synFin.off, synRst.off, xMax.off, nmapFin.off, nullFlags.off]
      cy.testNamedConfiguration(section.endpoint, schema, section.name)
    })
  })
})
