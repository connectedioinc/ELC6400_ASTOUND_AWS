const route = '/network/mobile/sim_switch/cfg01aa0e'
const endpoint = '/sim_switch/config'
const sectionName = 'simSwitch'
let modemInfo = []
let simCount = 0
let restoreSwitchData = {}
let restoreMobileData = {}
let restoreInterfaceData = {}
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
          if (simCount > 1) {
            cy.request({
              method: 'GET',
              url: `${Cypress.config('baseUrl')}/api/sim_switch/config/cfg01aa0e`,
              headers: {
                Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
                'Content-type': 'application/json'
              }
            }).then(({ body }) => {
              restoreSwitchData = body.data
            })
            cy.request({
              method: 'GET',
              url: `${Cypress.config('baseUrl')}/api/sim_cards/config/cfg01aa0e`,
              headers: {
                Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
                'Content-type': 'application/json'
              }
            }).then(({ body }) => {
              const section = body.data
              restoreMobileData = {
                primary: section.primary,
                enable_sms_limit: section.enable_sms_limit,
                sms_limit_num: section.sms_limit_num,
                sms_limit: section.sms_limit,
                period: section.period
              }
              cy.request({
                method: 'PUT',
                url: `${Cypress.config('baseUrl')}/api/sim_cards/config/cfg01aa0e`,
                body: {
                  data: {
                    primary: '1',
                    enable_sms_limit: '0'
                  }
                },
                headers: {
                  Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
                  'Content-type': 'application/json'
                }
              })
            })
            cy.request({
              method: 'GET',
              url: `${Cypress.config('baseUrl')}/api/interfaces/config`,
              headers: {
                Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
                'Content-type': 'application/json'
              }
            }).then(({ body }) => {
              const section = body.data.filter(s => s.sim === '1')[0]
              restoreInterfaceData = {
                id: section.id,
                mob_limit_enabled: section.mob_limit_enabled === '1' ? '1' : '0',
                data_limit: section.data_limit,
                period: section.period,
                reset_hour: section.reset_hour
              }
              cy.request({
                method: 'PUT',
                url: `${Cypress.config('baseUrl')}/api/interfaces/config/${restoreInterfaceData.id}`,
                body: {
                  data: {
                    mob_limit_enabled: '0'
                  }
                },
                headers: {
                  Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
                  'Content-type': 'application/json'
                }
              })
            })
          }
        })
      }
    })
  })
})

beforeEach(function () {
  if (!hasMobile || simCount < 2) this.skip()
  cy.hitPage(route)
})

after(() => {
  if (hasMobile && simCount > 1) {
    delete restoreSwitchData.modem
    delete restoreSwitchData.position
    delete restoreSwitchData.id
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api/sim_switch/config/cfg01aa0e`,
      body: {
        data: restoreSwitchData
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(() => {
      cy.request({
        method: 'PUT',
        url: `${Cypress.config('baseUrl')}/api/sim_cards/config/cfg01aa0e`,
        body: {
          data: restoreMobileData
        },
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(() => {
        const ifaceId = restoreInterfaceData.id
        delete restoreInterfaceData.id
        cy.request({
          method: 'PUT',
          url: `${Cypress.config('baseUrl')}/api/interfaces/config/${ifaceId}`,
          body: {
            data: restoreInterfaceData
          },
          headers: {
            Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
            'Content-type': 'application/json'
          }
        })
      })
    })
  }
  cy.then(() => {
    cy.logout()
  })
})
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const interval = { type: 'input', inputName: 'interval', value: 10 }
const retryCount = { type: 'input', inputName: 'retry_count', value: 10 }
const onSignal = { type: 'switch', inputName: 'on_signal', value: 'true' }
const weakSignal = { type: 'input', inputName: 'weak_signal', value: -50 }
const dataLimit = { type: 'switch', inputName: 'data_limit', value: 'true' }
const smsLimit = { type: 'switch', inputName: 'sms_limit', value: 'true' }
const roaming = { type: 'switch', inputName: 'roaming', value: 'true' }
const noNetwork = { type: 'switch', inputName: 'no_network', value: 'true' }
const denied = { type: 'switch', inputName: 'denied', value: 'true' }
const failFlag = { type: 'switch', inputName: 'fail_flag', value: 'true' }
const dataFail = {
  first: { type: 'select', inputName: 'data_fail', options: '1', value: 'LCP echo' },
  second: { type: 'select', inputName: 'data_fail', options: '2', value: 'ICMP echo' }
}
const dataFailHost = { type: 'input', inputName: 'data_fail_host', value: '10.10.10.10' }
const dataFailTimeout = { type: 'select', inputName: 'data_fail_timeout', options: '10', value: '10 sec.' }
const enableBack = { type: 'switch', inputName: 'enable_back', value: 'true' }
const switchBack = { type: 'input', inputName: 'switch_back', value: '10' }

describe('Mobile SIM switch configuration', () => {
  it('Configuration when data limit is not enabled in Interfaces General', function () {
    const schema = [enabled, dataLimit]
    cy.setValues(endpoint, schema, sectionName)
    cy.clickButton('saveandapply')
    cy.checkMessage(' Make sure you have enabled mobile data limit on one of this SIM card interfaces! ')
  })
  it('Configuration when sms limit is not enabled in Mobile General', function () {
    const schema = [enabled, smsLimit]
    cy.setValues(endpoint, schema, sectionName)
    cy.clickButton('saveandapply')
    cy.checkMessage(' Make sure you have enabled sms limit on one of this SIM card interfaces! ')
  })
  it('Configuration when sms limit and data limit are enabled', function () {
    const schema = [enabled, dataLimit, smsLimit]
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api/sim_cards/config/cfg01aa0e`,
      body: {
        data: {
          enable_sms_limit: '1',
          sms_limit_num: '10',
          sms_limit: 'day',
          period: '5'
        }
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(() => {
      cy.request({
        method: 'PUT',
        url: `${Cypress.config('baseUrl')}/api/interfaces/config/${restoreInterfaceData.id}`,
        body: {
          data: {
            mob_limit_enabled: '1',
            data_limit: '100',
            period: 'day',
            reset_hour: '5'
          }
        },
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(() => {
        cy.hitPage(route)
        cy.testNamedConfiguration(endpoint, schema, sectionName)
      })
    })
  })
  it('Configuration when data connection fail method is LCP echo', function () {
    const schema = [enabled, interval, retryCount, onSignal, weakSignal, roaming, noNetwork, denied, failFlag, dataFail.first]
    cy.testNamedConfiguration(endpoint, schema, sectionName)
  })
  it('Configuration when data connection fail method is ICMP echo', function () {
    const schema = [enabled, dataFail.second, dataFailHost, dataFailTimeout]
    cy.testNamedConfiguration(endpoint, schema, sectionName)
  })
  it('Configuration when section is not primary', function () {
    enabled.value = 'true'
    const schema = [enabled, enableBack, switchBack]
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api/sim_cards/config/cfg01aa0e`,
      body: {
        data: {
          primary: '0'
        }
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(() => {
      cy.hitPage(route)
      cy.testNamedConfiguration(endpoint, schema, sectionName)
    })
  })
  it('Configuration when enabled is false', function () {
    const enabledFalse = enabled
    enabledFalse.value = 'false'
    const schema = [enabledFalse]
    cy.testNamedConfiguration(endpoint, schema, sectionName)
  })
})
