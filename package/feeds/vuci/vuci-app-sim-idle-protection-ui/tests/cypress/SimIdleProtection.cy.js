const route = '/network/mobile/sim_idle_protection'
const endpoint = 'sim_idle_protection/config'
const sectionName = 'sim_idle_protection'
let modemInfo = []
let simCount = 0
let hasMobile = false

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
      hasMobile = body.data.includes('/usr/lib/opkg/info/mobifd.control')
      if (hasMobile) {
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
          cy.hitPage(route)
        })
      }
    })
  })
})

beforeEach(function () {
  if (!hasMobile || simCount < 2) this.skip()
})

after(() => {
  cy.logout()
})

const enable = { type: 'switch', inputName: 'enable', value: 'true' }
const period = {
  month: { type: 'select', inputName: 'period', options: 'month', value: 'Month' },
  week: { type: 'select', inputName: 'period', options: 'week', value: 'Week' }
}
const day = { type: 'select', inputName: 'day', options: '1', value: '1' }
const weekday = { type: 'select', inputName: 'day', options: '1', value: 'Monday' }
const time = { type: 'input', inputName: 'time', value: '01:00' }
const ipType = {
  ipv4: { type: 'select', inputName: 'ip_type', options: 'ipv4', value: 'IPv4' },
  ipv6: { type: 'select', inputName: 'ip_type', options: 'ipv6', value: 'IPv6' }
}
const host = {
  ipv4: { type: 'input', inputName: 'host', value: '127.0.0.1' },
  ipv6: { type: 'input', inputName: 'host', value: '0000:0000:0000:0000:0000:0000:0000:0001' }
}
const packetSize = { type: 'input', inputName: 'packet_size', value: '56' }
const count = { type: 'input', inputName: 'count', value: '2' }

describe('Sim idle protection configuration', () => {
  it('Enable configuration, select period week and IP type IPv4', function () {
    const schema = [enable, period.week, weekday, time, ipType.ipv4, host.ipv4, packetSize, count]
    cy.testNamedConfiguration(endpoint, schema, sectionName)
  })
  it('Enable configuration, select period month and IP type IPv6', function () {
    const schema = [enable, period.month, day, time, ipType.ipv6, host.ipv6, packetSize, count]
    cy.testNamedConfiguration(endpoint, schema, sectionName)
  })
  it('Disable configuration', function () {
    enable.value = 'false'
    const schema = [enable]
    cy.testNamedConfiguration(endpoint, schema, sectionName)
  })
  it('Switch to second sim/modem tab and disable configuration', function () {
    cy.get('.tab-navigation > :nth-child(2)').click()
    enable.value = 'false'
    const schema = [enable]
    cy.testNamedConfiguration(endpoint, schema, sectionName)
  })
})
