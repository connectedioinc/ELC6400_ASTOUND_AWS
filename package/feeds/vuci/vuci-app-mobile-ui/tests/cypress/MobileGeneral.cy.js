const cfgName = 'cfg01aa0e'
const route = `/network/mobile/general/${cfgName}`
const endpoint = '/sim_cards/config'
const operatorEndpoint = '/operator_lists/config'
let restoreData = {}
let advancedMode = 0
let administartionId = 'main'
let sectionModem = {}
let serviceModes = []
const gsmBands = []
const lteBands = []
const umtsBands = []
const nr5gBands = []
let nbBands = []
let simCount = 0
let modemCount = 0
let resetBands = true
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
          url: `${Cypress.config('baseUrl')}/api${endpoint}/${cfgName}`,
          headers: {
            Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
            'Content-type': 'application/json'
          }
        }).then(({ body }) => {
          restoreData = body.data
          cy.request({
            method: 'GET',
            url: `${Cypress.config('baseUrl')}/api${endpoint}`,
            headers: {
              Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
              'Content-type': 'application/json'
            }
          }).then(({ body }) => {
            const modemId = body.data.filter(s => s.id === cfgName)[0].modem
            cy.request({
              method: 'GET',
              url: `${Cypress.config('baseUrl')}/api/modems/status`,
              headers: {
                Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
                'Content-type': 'application/json'
              }
            }).then(({ body }) => {
              const modemInfo = body.data.find(s => s.id === modemId)
              serviceModes = Object.keys(modemInfo.service_modes)
              sectionModem = modemInfo
              if (modemInfo.service_modes['2G']) {
                modemInfo.service_modes['2G'].forEach(e => gsmBands.push({ options: e, value: e.toUpperCase().replace('_', ' ') }))
                gsm.depend = gsmBands.length > 0
              }
              if (modemInfo.service_modes['4G']) {
                modemInfo.service_modes['4G'].forEach(e => lteBands.push({ options: e, value: e.split('_').pop().toUpperCase() }))
                lte.depend = lteBands.length > 0
              }
              if (modemInfo.service_modes['3G']) {
                modemInfo.service_modes['3G'].forEach(e => umtsBands.push({ options: e, value: e.toUpperCase().replace('_', ' ') }))
                umts.depend = umtsBands.length > 0
              }
              if (modemInfo.service_modes.NB) {
                modemInfo.service_modes.NB.forEach(e => nbBands.push({ options: e, value: `NB${e.split('_nb')[1]}` }))
              }
              if (Object.keys(modemInfo.service_modes).includes('5G_NSA')) {
                const duplicates = modemInfo.service_modes['5G_NSA'].map(value => value.split('_n').pop())
                duplicates.forEach((dupVal, index) => {
                  if (duplicates.indexOf(dupVal) !== index) {
                    nr5gBands.push({ options: dupVal, value: dupVal })
                  }
                })
                nr5g.depend = nr5gBands.length > 0
              }
              modemCount = body.data.length
              simCount =
                body.data.length > 0
                  ? Math.max.apply(
                      Math,
                      body.data.map(o => o.sim_count)
                    )
                  : 0
            })
          })
          cy.request({
            method: 'GET',
            url: `${Cypress.config('baseUrl')}/api/system/config`,
            headers: {
              Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
              'Content-type': 'application/json'
            }
          }).then(({ body }) => {
            advancedMode = body.data[0].advanced
            administartionId = body.data[0].id
            if (advancedMode === '0') {
              cy.request({
                method: 'PUT',
                url: `${Cypress.config('baseUrl')}/api/system/config/${administartionId}`,
                body: {
                  data: {
                    advanced: '1'
                  }
                },
                headers: {
                  Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
                  'Content-type': 'application/json'
                }
              })
            }
          })
        })
      }
    })
  })
})
beforeEach(function () {
  if (!hasMobile) this.skip()
  resetBands = true
  cy.hitPage(route)
})
afterEach(() => {
  if (!resetBands) {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${endpoint}/${cfgName}`,
      body: {
        data: {
          band: 'auto',
          nr5g: [],
          lte: [],
          umts: [],
          gsm: []
        }
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  }
})
after(() => {
  if (hasMobile) {
    delete restoreData.modem
    delete restoreData.position
    delete restoreData.id
    if (!serviceModes.includes('4G') || !sectionModem.volte_supported) delete restoreData.volte
    if (restoreData.service === '2g') {
      delete restoreData.nr5g
      delete restoreData.lte
      delete restoreData.umts
    }
    if (restoreData.service === '3g') {
      delete restoreData.nr5g
      delete restoreData.lte
      delete restoreData.gsm
    }
    if (restoreData.service === 'lte') {
      delete restoreData.nr5g
      delete restoreData.umts
      delete restoreData.gsm
    }
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${endpoint}/${cfgName}`,
      body: {
        data: restoreData
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(() => {
      if (advancedMode === '0') {
        cy.then(() => {
          cy.request({
            method: 'PUT',
            url: `${Cypress.config('baseUrl')}/api/system/config/${administartionId}`,
            body: {
              data: {
                advanced: '0'
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
  cy.then(() => {
    cy.logout()
  })
})

// SIM card settings section
const primary = { type: 'switch', inputName: 'primary', value: 'true', depend: simCount > 1 }
const denyRoaming = { type: 'switch', inputName: 'deny_roaming', value: 'true' }
const volte = {
  auto: { type: 'select', inputName: 'volte', options: 'auto', value: 'Auto', depend: sectionModem.volte_supported },
  on: { type: 'select', inputName: 'volte', options: 'on', value: 'On', depend: sectionModem.volte_supported },
  off: { type: 'select', inputName: 'volte', options: 'off', value: 'Off', depend: sectionModem.volte_supported }
}
const service = {
  '2g': { type: 'select', inputName: 'service', options: '2g', value: '2g', depend: serviceModes.includes('2G') && serviceModes.length > 1 },
  '3g': { type: 'select', inputName: 'service', options: '3g', value: '3g', depend: serviceModes.includes('3G') && serviceModes.length > 1 },
  '4g': { type: 'select', inputName: 'service', options: 'lte', value: 'lte', depend: serviceModes.includes('4G') && serviceModes.length > 1 },
  '5g_pref': {
    type: 'select',
    inputName: 'service',
    options: 'nr5g_pref',
    value: '5G auto',
    depend: serviceModes.includes('5G_NSA') && (serviceModes.includes('4G') || serviceModes.includes('3G') || serviceModes.includes('2G')) && serviceModes.length > 1
  },
  '4g_pref': {
    type: 'select',
    inputName: 'service',
    options: 'lte_pref',
    value: '4G auto',
    depend: serviceModes.includes('4G') && (serviceModes.includes('3G') || (serviceModes.includes('2G') && serviceModes.length > 1))
  },
  '3g_pref': { type: 'select', inputName: 'service', options: '3g_pref', value: '3G auto', depend: serviceModes.includes('3G') && serviceModes.includes('2G') && serviceModes.length > 1 }
}
const categoryLte = { m1: { type: 'select', inputName: 'category_lte', options: 'm1', value: 'M1 only' }, nb: { type: 'select', inputName: 'category_lte', options: 'nb', value: 'NB only' } }
const pincode = { type: 'input', inputName: 'pincode', value: 1000 }
const band = {
  auto: { type: 'select', inputName: 'band', options: 'auto', value: 'Auto' },
  manual: { type: 'select', inputName: 'band', options: 'manual', value: 'Manual' }
}
const gsm = { type: 'multiselect', inputName: 'gsm', value: gsmBands, depend: gsmBands.length > 0 }
const umts = { type: 'multiselect', inputName: 'umts', value: umtsBands, depend: umtsBands.length > 0 }
const lte = { type: 'multiselect', inputName: 'lte', value: lteBands, depend: lteBands.length > 0 }
const nr5g = { type: 'multiselect', inputName: 'nr5g', value: nr5gBands, depend: nr5gBands.length > 0 }
const ltenb = { type: 'multiselect', inputName: 'lte_nb', value: nbBands, depend: nbBands.length > 0 }

// Low signal reconnect section
const signalResetEnabled = { type: 'switch', inputName: 'signal_reset_enabled', value: 'true' }
const signalResetThreshold = { type: 'input', inputName: 'signal_reset_threshold', options: '10', value: -100 }
const signalResetTimeout = { type: 'input', inputName: 'signal_reset_timeout', value: 1000 }

// Operator settings section
const operlist = { type: 'switch', inputName: 'operlist', value: 'true' }
const opermode = { type: 'select', inputName: 'opermode', options: 'blacklist', value: 'Blacklist' }
const operlistName = { type: 'select', inputName: 'operlist_name', options: 'testOperator', value: 'testOperator' }

// Operator settings section
const enableSmsLimit = { type: 'switch', inputName: 'enable_sms_limit', value: 'true' }
const smsLimitNum = { type: 'input', inputName: 'sms_limit_num', value: 10 }
const smsLimit = {
  day: { type: 'select', inputName: 'sms_limit', options: 'day', value: 'Day' },
  week: { type: 'select', inputName: 'sms_limit', options: 'week', value: 'Week' },
  month: { type: 'select', inputName: 'sms_limit', options: 'month', value: 'Month' }
}
const period = {
  day: { type: 'select', inputName: 'period', options: '23', value: '23' },
  week: { type: 'select', inputName: 'period', options: '1', value: 'Monday' },
  month: { type: 'select', inputName: 'period', options: '1', value: '1' }
}

// USSD section
const ussd = { type: 'input', inputName: 'ussd_code', value: '*100#' }
const ussdResponse = { type: 'textarea', inputName: 'ussd_response', value: 'No response yet' }

describe('Mobile General configuration', () => {
  describe('SIM card settings configuration', () => {
    it('Configuration when band selection is auto', function () {
      resetBands = false
      const schema = [primary, denyRoaming, volte.on, pincode, band.auto]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when service is 2G only and band selection is manual', function () {
      if (gsmBands.length === 0) this.skip()
      resetBands = false
      service['2g'].depend = serviceModes.includes('2G')
      const schema = [service['2g'], volte.on, band.manual, gsm]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when service is 3G only and band selection is manual', function () {
      if (umtsBands.length === 0) this.skip()
      resetBands = false
      service['3g'].depend = serviceModes.includes('3G')
      const schema = [service['3g'], band.manual, umts]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when service is 4G only and band selection is manual', function () {
      if (lteBands.length === 0) this.skip()
      resetBands = false
      service['4g'].depend = serviceModes.includes('4G')
      const schema = [service['4g'], band.manual, lte]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when service is 4G only and band selection is manual and selecting all bands', function () {
      if (lteBands.length === 0) this.skip()
      resetBands = false
      service['4g'].depend = serviceModes.includes('4G')
      const schema = [service['4g'], band.manual, { type: 'multiselect', inputName: 'lte', value: [{ options: 'all', value: 'All' }] }]
      cy.setValues(endpoint, schema, 'simcards')
      cy.overviewSave(' Configuration has been applied ')
      const schema2 = [service['4g'], band.manual, lte]
      cy.checkValues(endpoint, schema2, 'simcards')
    })
    it('Configuration when service is 4G and modem mode is 3 (BG95, BG96 modems)', function () {
      if (sectionModem.mode !== 3) this.skip()
      resetBands = false
      service['4g'].depend = serviceModes.includes('4G')
      const schema = [service['4g'], categoryLte.m1]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when service is 4G, modem mode is 3 (BG95, BG96 modems) and selecting NB bands', function () {
      if (sectionModem.mode !== 3) this.skip()
      resetBands = false
      service['4g'].depend = serviceModes.includes('4G')
      const schema = [service['4g'], categoryLte.nb, band.manual, ltenb]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when service is 5G/... auto and band selection is auto', function () {
      if (nr5gBands.length === 0) this.skip()
      resetBands = false
      service['5g_pref'].depend = serviceModes.includes('5G_NSA') && (serviceModes.includes('4G') || serviceModes.includes('3G') || serviceModes.includes('2G'))
      const schema = [service['5g_pref'], band.auto]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when service is 4G/... auto and band selection is auto', function () {
      if (lteBands.length === 0) this.skip()
      resetBands = false
      service['4g_pref'].depend = serviceModes.includes('4G') && (serviceModes.includes('3G') || serviceModes.includes('2G'))
      const schema = [service['4g_pref'], band.auto]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when service is 3G/... auto and band selection is auto', function () {
      if (umtsBands.length === 0 || gsmBands.length === 0) this.skip()
      resetBands = false
      service['3g_pref'].depend = serviceModes.includes('3G') && serviceModes.includes('2G')
      const schema = [service['3g_pref'], band.auto]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when service is 3G/... auto and band selection is manual', function () {
      if (umtsBands.length === 0 || gsmBands.length === 0) this.skip()
      resetBands = false
      const list = [umts]
      if (gsmBands.length > 0) list.push(gsm)
      service['3g_pref'].depend = serviceModes.includes('3G') && serviceModes.includes('2G')
      const schema = [service['3g_pref'], band.manual, ...list]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when service is 4G/... auto and band selection is manual', function () {
      if (lteBands.length === 0) this.skip()
      resetBands = false
      const list = [lte]
      let skipTest = true
      if (gsmBands.length > 0) {
        list.push(gsm)
        skipTest = false
      }
      if (umtsBands.length > 0) {
        list.push(umts)
        skipTest = false
      }
      if (skipTest) this.skip()
      service['4g_pref'].depend = serviceModes.includes('4G') && (serviceModes.includes('3G') || serviceModes.includes('2G'))
      const schema = [service['4g_pref'], band.manual, ...list]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when service is 5G/... auto and band selection is manual', function () {
      if (nr5gBands.length === 0) this.skip()
      resetBands = false
      const list = [nr5g]
      let skipTest = true
      if (gsmBands.length > 0) {
        list.push(gsm)
        skipTest = false
      }
      if (umtsBands.length > 0) {
        list.push(umts)
        skipTest = false
      }
      if (lteBands.length > 0) {
        list.push(lte)
        skipTest = false
      }
      if (skipTest) this.skip()
      service['5g_pref'].depend = serviceModes.includes('5G_NSA') && (serviceModes.includes('4G') || serviceModes.includes('3G') || serviceModes.includes('2G'))
      const schema = [service['5g_pref'], band.manual, ...list]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when set back to default', function () {
      primary.value = 'false'
      denyRoaming.value = 'false'
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.clickInput(pincode.inputName).clear()
      const schema = [primary, denyRoaming, volte.auto, service['4g'], band.auto]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
  })
  describe('Low signal reconnect configuration', () => {
    it('Configuration when low signal reconnect enabled', function () {
      const schema = [signalResetEnabled, signalResetThreshold, signalResetTimeout]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when set back to default', function () {
      signalResetEnabled.value = 'false'
      const schema = [signalResetEnabled]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
  })
  describe('Operator settings configuration', () => {
    it('Configuration when operator settings enabled', function () {
      const schema = [operlist, opermode, operlistName]
      cy.request({
        method: 'POST',
        url: `${Cypress.config('baseUrl')}/api${operatorEndpoint}`,
        body: {
          data: {
            name: 'testOperator',
            mcc_mnc: ['1000']
          }
        },
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        },
        failOnStatusCode: false
      }).then(({ body }) => {
        cy.hitPage(route)
        cy.testNamedConfiguration(endpoint, schema, 'simcards')
        cy.request({
          method: 'DELETE',
          url: `${Cypress.config('baseUrl')}/api${operatorEndpoint}/${body.data.id}`,
          headers: {
            Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
            'Content-type': 'application/json'
          }
        })
      })
    })
    it('Configuration when set back to default', function () {
      operlist.value = 'false'
      const schema = [operlist]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
  })
  describe('SMS limit settings configuration', () => {
    it('Configuration when period is day', function () {
      const schema = [enableSmsLimit, smsLimitNum, smsLimit.day, period.day]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when period is week', function () {
      const schema = [smsLimit.week, period.week]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when period is month', function () {
      const schema = [smsLimit.month, period.month]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })

    it('Configuration when set back to default', function () {
      enableSmsLimit.value = 'false'
      const schema = [enableSmsLimit]
      cy.testNamedConfiguration(endpoint, schema, 'simcards')
    })
    it('Configuration when sms limit is cleared', function () {
      cy.clickSwitch(enableSmsLimit.inputName, true)
      cy.clickButton('clear')
      cy.request({
        method: 'POST',
        url: `${Cypress.config('baseUrl')}/api/sim_cards/${cfgName}/actions/clear_sms_limit`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        },
        failOnStatusCode: false
      }).then(({ body }) => {
        if (body.success) cy.checkMessage(' SMS limit cleared successfully ')
        else if (!body.success) cy.checkMessage(' SMS limit clear error! ')
      })
    })
  })
  describe('Ussd configuration', () => {
    it('Configuration when USSD message is sent with empty USSD field', function () {
      if (sectionModem.mode !== 3) this.skip()
      cy.clickButton('send')
      cy.checkMessage(' USSD code can not be empty! ')
    })
    it('Configuration when USSD message is sent', function () {
      if (sectionModem.mode !== 3) this.skip()
      cy.intercept('POST', `/api/modems/${sectionModem.id}/actions/send_ussd`).as('postUSSD')
      cy.fillValues(ussd)
      cy.clickButton('send')
      cy.wait('@postUSSD').then(res => {
        if (res.response.body.success) {
          ussdResponse.value = res.response.body.data.response
          cy.getValues(ussdResponse)
          cy.checkMessage(' USSD code sent successfully ')
        } else {
          cy.getValues(ussdResponse)
          cy.checkMessage(' Failed to send USSD code ')
        }
      })
    })
  })
  describe('SIM card settings second tab', () => {
    it('Check Default SIM switch and tabs visibility', () => {
      if (simCount < 2) {
        cy.get('[test-id="switch-primary"]').should('not.exist')
        if (modemCount < 2) cy.get('.tab-navigation > :nth-child(1)').should('not.exist')
        else cy.get('.tab-navigation > :nth-child(1)').should('exist')
      } else {
        cy.get('[test-id="switch-primary"]').should('exist')
      }
      if (modemCount === 2) {
        cy.get('.tab-navigation').within(() => {
          cy.get('.tab-item').eq(0).should('contain', 'SIM (Primary Modem)')
          cy.get('.tab-item').eq(1).should('contain', 'SIM (Secondary Modem)')
        })
      } else if (simCount === 2) {
        cy.get('.tab-navigation').within(() => {
          cy.get('.tab-item').eq(0).should('contain', 'SIM1')
          cy.get('.tab-item').eq(1).should('contain', 'SIM2')
        })
      }
    })
  })
})
