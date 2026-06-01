const route = '/network/failover/mwan'
const endpoint = '/failover/interfaces/config'
const endpoint2 = '/failover/rules/config'
const section = 'mwan'
const ruleSection = 'mwanRule'
const policySectionName = 'add-new-instance'

let oldData = {}

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${endpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      oldData = body.data[0]
      if (!oldData.flush_conntrack) oldData.flush_conntrack = []
      delete oldData.network_type
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const interval = { type: 'input', inputName: 'interval', value: '10' }
const flush_conntrack = {
  all: {
    type: 'multiselect',
    inputName: 'flush_conntrack',
    value: [
      { options: 'connected', value: 'Connected' },
      { options: 'disconnected', value: 'Disconnected' }
    ]
  },
  connected: { type: 'multiselect', inputName: 'flush_conntrack', value: [{ options: 'connected', value: 'Connected' }] },
  disconnected: { type: 'multiselect', inputName: 'flush_conntrack', value: [{ options: 'disconnected', value: 'Disconnected' }] }
}
const track_method = {
  ping: { type: 'select', inputName: 'track_method', value: 'Ping' },
  wget: { type: 'select', inputName: 'track_method', value: 'Wget' }
}
const family = {
  ipv4: { type: 'select', inputName: 'family', value: 'IPv4' },
  ipv6: { type: 'select', inputName: 'family', value: 'IPv6' }
}
const track_ip = {
  v4: { type: 'list', inputName: 'track_ip', value: ['1.1.1.1'] },
  v6: { type: 'list', inputName: 'track_ip', value: ['::0000:8a2e:0370:7334', '::0000:8a2e:0370:7335'], clearBeforeInput: true },
  url: { type: 'list', inputName: 'track_ip', value: ['1.1.1.1', 'www.test1.com', 'www.test2.com'] }
}
const reliability = { type: 'input', inputName: 'reliability', value: '1' }
const count = { type: 'input', inputName: 'count', value: '1' }
const up = { type: 'input', inputName: 'up', value: '1' }
const down = { type: 'input', inputName: 'down', value: '1' }

const testNamedEditForm = (endpoint, schema, section) => {
  cy.get('[test-id="button-edit"]').filter(':visible').first().click()
  cy.getModal().within(() => {
    cy.get(`[test-id="tablerow-${section}"]`).within(() => {
      cy.setValues(endpoint, schema, section)
    })
    cy.clickButton('saveandapply')
  })
  cy.get('[test-id="button-edit"]').filter(':visible').first().click()
  cy.getModal().within(() => {
    cy.get(`[test-id="tablerow-${section}"]`).within(() => {
      cy.checkValues(endpoint, schema, section)
    })
  })
  cy.clickEditClose()
}

const resetForm = () => {
  cy.then(() => {
    cy.request({
      method: 'PUT',
      url: `http://192.168.1.1/api${endpoint}/${oldData.id}`,
      body: {
        data: oldData
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(() => {
      cy.hitPage(route)
    })
  })
}

describe('Failover / load balancing interfaces configuration', () => {
  it('Failover interface configuration first batch IPv4', () => {
    const schema = [enabled, interval, flush_conntrack.connected, track_method.ping, family.ipv4, track_ip.v4, reliability, count, up, down]
    testNamedEditForm(endpoint, schema, section)
    resetForm()
  })

  it('Failover interface configuration first batch IPv6', () => {
    const schema = [enabled, interval, flush_conntrack.connected, track_method.ping, family.ipv6, track_ip.v6, reliability, count, up, down]
    testNamedEditForm(endpoint, schema, section)
    resetForm()
  })

  it('Failover interface configuration second batch', () => {
    interval.value = '65000'
    const schema = [enabled, interval, flush_conntrack.disconnected, track_method.wget, track_ip.v4, reliability, count, up, down]
    testNamedEditForm(endpoint, schema, section)
    resetForm()
  })

  it('Failover interface configuration second batch with url option', () => {
    interval.value = '65000'
    const schema = [enabled, interval, flush_conntrack.disconnected, track_method.wget, track_ip.url, reliability, count, up, down]
    testNamedEditForm(endpoint, schema, section)
    resetForm()
  })

  it('Failover interface configuration third batch', () => {
    reliability.value = '65000'
    count.value = '65000'
    up.value = '65000'
    down.value = '65000'
    const schema = [enabled, interval, flush_conntrack.all, track_method.ping, family.ipv4, track_ip.v4, reliability, count, up, down]
    testNamedEditForm(endpoint, schema, section)
    resetForm()
  })
})

const rulesSection = { type: 'input', inputName: 'id', value: 'test' }
const proto = {
  all: { type: 'select', inputName: 'proto', value: 'all' },
  tcp: { type: 'select', inputName: 'proto', value: 'tcp' },
  udp: { type: 'select', inputName: 'proto', value: 'udp' },
  icmp: { type: 'select', inputName: 'proto', value: 'icmp' },
  esp: { type: 'select', inputName: 'proto', value: 'esp' }
}
const src_ip = { type: 'list', inputName: 'src_ip', value: ['192.168.1.0/24', '192.168.2.0/24'] }
const src_port = proto => {
  return { type: 'input', inputName: 'src_port', value: '84', depend: proto === 'tcp' || proto === 'udp' }
}
const dest_ip = { type: 'list', inputName: 'dest_ip', value: ['192.169.1.0/24', '192.169.2.0/24'] }
const dest_port = proto => {
  return { type: 'input', inputName: 'dest_port', value: '84', depend: proto === 'tcp' || proto === 'udp' }
}
const sticky = { type: 'switch', inputName: 'sticky', value: 'true' }
const timeout = sticky => {
  return { type: 'input', inputName: 'timeout', value: '160', depend: sticky === 'true' }
}

const policySection = { type: 'input', inputName: 'id', value: 'test2' }
const policyMode = {
  failover: { type: 'select', inputName: 'mode', value: 'Failover' },
  load: { type: 'select', inputName: 'mode', value: 'Load balancing' }
}

const testRules = (endpoint, ruleSchema, policySchema, proto) => {
  cy.intercept('POST', `/api${endpoint2}`).as('postSection')
  cy.fillValues(rulesSection)
  cy.clickSectionAdd()
  cy.wait('@postSection').then(res => {
    const sectionData = res.response.body.data
    cy.getModal().within(() => {
      cy.fillValues(proto)
      cy.get('.modal-content').scrollTo('top')
      cy.get(`[test-id="tablerow-${ruleSection}"]`).within(() => {
        cy.setValues(endpoint, ruleSchema, ruleSection)
      })
      cy.get('.modal-content').scrollTo('bottom')
      cy.setValues(endpoint, policySchema, policySectionName)
      cy.clickSectionAdd()
    })
    cy.clickEditSave()
    cy.openLastCreatedEdit()
    cy.getModal().within(() => {
      cy.get(`[test-id="tablerow-${ruleSection}"]`).within(() => {
        cy.checkValues(endpoint, [proto], ruleSection)
        cy.checkValues(endpoint, ruleSchema, ruleSection)
      })
    })
    cy.get('.modal-content').scrollTo('bottom')
    cy.clearSection(endpoint, policySchema[1].value === 'Load balancing' ? `balance_${policySection.value}` : `mwan_${policySection.value}`)
    cy.clickEditClose()
    cy.clearSection(endpoint, sectionData.id)
  })
}

describe('Rules configuration', () => {
  it('Rule configuration with all protocol', () => {
    const selectedProto = proto.all
    const ruleSchema = [src_ip, src_port(selectedProto.value), dest_ip, dest_port(selectedProto.value), sticky, timeout(sticky.value)]
    const policySchema = [policySection, policyMode.load]

    testRules(endpoint2, ruleSchema, policySchema, selectedProto)
  })

  it('Rule configuration with tcp protocol', () => {
    const selectedProto = proto.tcp
    const ruleSchema = [src_ip, src_port(selectedProto.value), dest_ip, dest_port(selectedProto.value), sticky, timeout(sticky.value)]
    const policySchema = [policySection, policyMode.failover]

    testRules(endpoint2, ruleSchema, policySchema, selectedProto)
  })

  it('Rule configuration with udp protocol', () => {
    const selectedProto = proto.udp
    const ruleSchema = [src_ip, src_port(selectedProto.value), dest_ip, dest_port(selectedProto.value), sticky, timeout(sticky.value)]
    const policySchema = [policySection, policyMode.failover]

    testRules(endpoint2, ruleSchema, policySchema, selectedProto)
  })

  it('Rule configuration with icmp protocol', () => {
    const selectedProto = proto.icmp
    const ruleSchema = [src_ip, src_port(selectedProto.value), dest_ip, dest_port(selectedProto.value), sticky, timeout(sticky.value)]
    const policySchema = [policySection, policyMode.load]

    testRules(endpoint2, ruleSchema, policySchema, selectedProto)
  })

  it('Rule configuration with esp protocol', () => {
    const selectedProto = proto.esp
    const ruleSchema = [src_ip, src_port(selectedProto.value), dest_ip, dest_port(selectedProto.value), sticky, timeout(sticky.value)]
    const policySchema = [policySection, policyMode.load]

    testRules(endpoint2, ruleSchema, policySchema, selectedProto)
  })
})
