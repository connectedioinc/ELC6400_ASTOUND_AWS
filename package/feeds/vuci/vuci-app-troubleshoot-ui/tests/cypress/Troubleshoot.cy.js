const route = '/system/maintenance/troubleshoot'
const loggingEndpoint = '/logging/config'
let hasTcpDump = false

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/packages/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasTcpDump = body.data.includes('/usr/lib/opkg/info/tcpdump.control')
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

// Logging settings
const logBuffer = { type: 'input', inputName: 'log_buffer_size', value: '128' }
const logIp = { type: 'input', inputName: 'log_ip', value: '0.0.0.0' }
const logPort = { type: 'input', inputName: 'log_port', value: '514' }
const logProto = {
  udp: { type: 'select', inputName: 'log_proto', options: 'udp', value: 'UDP' },
  tcp: { type: 'select', inputName: 'log_proto', options: 'tcp', value: 'TCP' }
}
const logType = {
  circular: { type: 'select', inputName: 'log_type', options: 'circular', value: 'RAM memory' },
  file: { type: 'select', inputName: 'log_type', options: 'file', value: 'Flash memory' }
}
const logHostname = { type: 'switch', inputName: 'log_hostname', value: 'true' }
// Flash memory
const logSize = { type: 'input', inputName: 'log_size', value: '200' }
const logCompress = { type: 'switch', inputName: 'log_compress', value: 'true' }

// Troubleshoot
const tcpDump = { type: 'switch', inputName: 'tcp_dump', value: 'true' }
const tcpDumpInterface = {
  lan: { type: 'select', inputName: 'tcp_dump_interface', options: 'br-lan', value: 'br-lan (lan)' }
}
const tcpDumpFilter = {
  all: { type: 'select', inputName: 'tcp_dump_filter', options: '', value: 'All' },
  icmp: { type: 'select', inputName: 'tcp_dump_filter', options: 'icmp', value: 'ICMP' },
  tcp: { type: 'select', inputName: 'tcp_dump_filter', options: 'tcp', value: 'TCP' },
  udp: { type: 'select', inputName: 'tcp_dump_filter', options: 'udp', value: 'UDP' },
  arp: { type: 'select', inputName: 'tcp_dump_filter', options: 'arp', value: 'ARP' }
}
const tcpInout = {
  inout: { type: 'select', inputName: 'tcp_inout', options: 'inout', value: 'Incoming/Outgoing' },
  in: { type: 'select', inputName: 'tcp_inout', options: 'in', value: 'Incoming' },
  out: { type: 'select', inputName: 'tcp_inout', options: 'out', value: 'Outgoing' }
}
const tcpHost = { type: 'input', inputName: 'tcp_host', value: '0.0.0.0' }
const tcpPort = { type: 'input', inputName: 'tcp_port', value: '80' }
const tcpMount = {
  lan: { type: 'select', inputName: 'tcp_mount', options: '/tmp', value: 'RAM memory' }
}

// Diagnostics
const method = {
  ping: { type: 'select', inputName: 'diagnosticsForm', options: 'ping', value: 'Ping' },
  traceroute: { type: 'select', inputName: 'diagnosticsForm', options: 'traceroute', value: 'Traceroute' },
  nslookup: { type: 'select', inputName: 'diagnosticsForm', options: 'nslookup', value: 'Nslookup' }
}
const proto = {
  ipv4: { type: 'select', inputName: 'proto', options: 'ipv4', value: 'IPv4' },
  ipv6: { type: 'select', inputName: 'proto', options: 'ipv6', value: 'IPv6' }
}
const host = {
  ipv4: { type: 'input', inputName: 'host', value: '8.8.8.8' },
  ipv6: { type: 'input', inputName: 'host', value: '2001:4860:4860::8888' }
}

describe('Troubleshoot configuration', () => {
  describe('Logging settings section', () => {
    it('TCP, Save log in `Flash memory` and show hostname enabled', () => {
      const schema = [logBuffer, logIp, logPort, logProto.tcp, logType.file, logSize, logCompress, logHostname]
      cy.testNamedConfiguration(loggingEndpoint, schema, 'logging_general')
    })
    it('UDP, Save log in `RAM memory` and show hostname disabled', () => {
      logIp.value = '1.1.1.1'
      logPort.value = '50'
      logHostname.value = 'false'
      const schema = [logBuffer, logIp, logPort, logProto.udp, logType.circular, logHostname]
      cy.testNamedConfiguration(loggingEndpoint, schema, 'logging_general')
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.clickInput(logIp.inputName).clear()
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.clickInput(logPort.inputName).clear()
    })
  })
  describe('Troubleshoot section', () => {
    describe('Enable TCP dump', () => {
      beforeEach(function () {
        if (!hasTcpDump) this.skip()
      })
      it('Proto All, direction Incoming/Outgoing', () => {
        const schema = [tcpDump, tcpDumpInterface.lan, tcpDumpFilter.all, tcpInout.inout, tcpHost, tcpPort, tcpMount]
        cy.testNamedConfiguration(loggingEndpoint, schema, 'troubleshoot_system')
      })
      it('Proto ICMP, direction Incoming', () => {
        const schema = [tcpDump, tcpDumpInterface.lan, tcpDumpFilter.icmp, tcpInout.in, tcpHost, tcpPort, tcpMount]
        cy.testNamedConfiguration(loggingEndpoint, schema, 'troubleshoot_system')
      })
      it('Proto TCP, direction Outgoing', () => {
        const schema = [tcpDump, tcpDumpInterface.lan, tcpDumpFilter.tcp, tcpInout.out, tcpHost, tcpPort, tcpMount]
        cy.testNamedConfiguration(loggingEndpoint, schema, 'troubleshoot_system')
      })
      it('Proto UDP, direction Incoming', () => {
        const schema = [tcpDump, tcpDumpInterface.lan, tcpDumpFilter.udp, tcpInout.in, tcpHost, tcpPort, tcpMount]
        cy.testNamedConfiguration(loggingEndpoint, schema, 'troubleshoot_system')
      })
      it('Proto UDP, direction Incoming', () => {
        const schema = [tcpDump, tcpDumpInterface.lan, tcpDumpFilter.arp, tcpInout.inout, tcpHost, tcpPort, tcpMount]
        cy.testNamedConfiguration(loggingEndpoint, schema, 'troubleshoot_system')
      })
      it('Clicks download TCP dump file', () => {
        cy.clickButton('getTcpDump')
        cy.get('.spin-content').filter(':visible').invoke('text').should('contain', ' Generating file ')
        // TODO: update e2e test when file download will be implemented
      })
      it('downloads Troubleshoot file', () => {
        cy.clickButton('getTroubleshoot')
        cy.get('.spin-content').filter(':visible').invoke('text').should('contain', ' Generating file ')
        cy.checkMessage('Troubleshoot download was successful')
      })
      it('downloads encrypted Troubleshoot file', () => {
        cy.get('.side-messages .error').should('not.exist')
        cy.clickButton('getTroubleshoot')
        cy.get('.spin-content').filter(':visible').invoke('text').should('contain', ' Generating file ')
        cy.checkMessage('Troubleshoot download was successful')
      })
    })
    describe('Disable TCP dump', () => {
      it('Disables TCP dump', function () {
        if (!hasTcpDump) this.skip()
        tcpDump.value = 'false'
        const schema = [tcpDump]
        cy.testNamedConfiguration(loggingEndpoint, schema, 'troubleshoot_system')
      })
      it('Clicks show System log', () => {
        cy.clickButton('showSystemLog')
        cy.waitForEditModalOpen().within(() => {
          cy.get('.info_hint').filter(':visible').invoke('text').should('include', 'System Log')
        })
        cy.get('.nav-bar').within(() => {
          cy.get('.close-btn-wrapper').click()
        })
      })
      it('Clicks show Kernel log', () => {
        cy.clickButton('showKernelLog')
        cy.waitForEditModalOpen().within(() => {
          cy.get('.info_hint').filter(':visible').invoke('text').should('include', 'Kernel Log')
        })
        cy.get('.nav-bar').within(() => {
          cy.get('.close-btn-wrapper').click()
        })
      })
      it('Clicks download TCP dump file', function () {
        if (!hasTcpDump) this.skip()
        cy.clickButton('getTcpDump')
        cy.get('.spin-content').filter(':visible').invoke('text').should('contain', ' Generating file ')
        cy.checkMessage(' TCP dump is not enabled ')
      })
    })
  })
  describe('Diagnostics section', () => {
    function pressPerform(value) {
      cy.clickButton('perform')
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000)
      cy.getTextarea('output')
        .invoke('val')
        .should(text => {
          expect(text.toLowerCase()).to.contain(value.toLowerCase())
        })
    }
    it('Performs ping with IPv4 address', () => {
      cy.fillValues(method.ping)
      cy.fillValues(proto.ipv4)
      cy.fillValues(host.ipv4)
      pressPerform('ping')
    })
    it('Performs ping with IPv6 address', () => {
      cy.fillValues(method.ping)
      cy.fillValues(proto.ipv6)
      cy.fillValues(host.ipv6)
      pressPerform('ping')
    })
    it('Performs traceroute with IPv4 address', () => {
      cy.fillValues(method.traceroute)
      cy.fillValues(proto.ipv4)
      cy.fillValues(host.ipv4)
      pressPerform('traceroute')
    })
    it('Performs traceroute with IPv6 address', () => {
      cy.fillValues(method.traceroute)
      cy.fillValues(proto.ipv6)
      cy.fillValues(host.ipv6)
      pressPerform('traceroute')
    })
    it('Performs nslookup with IPv4 address', () => {
      cy.fillValues(method.nslookup)
      cy.fillValues(host.ipv4)
      pressPerform('Server')
    })
  })
})
