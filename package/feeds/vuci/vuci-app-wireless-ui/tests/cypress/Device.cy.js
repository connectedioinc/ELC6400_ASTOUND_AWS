const route = '/network/wireless/ssids'
const statusEndpoint = '/wireless/devices/options'
const boardEndpoint = '/system/device/status'
const deviceEndpoint = '/wireless/devices/config'
const scannerEndpoint = '/wireless/wifi_scanner/config/general'
const section = 'wifiinfo'

let wifiOptions
let section2Id
let section5Id
let startingOptions
let scannerStartingOptions
let hasWifi
before(function () {
  cy.login()
  cy.then(() => {
    cy.then(() => {
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/system/device/status`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        hasWifi = body.data.board.hwinfo.wifi
        if (!hasWifi) this.skip()
      })
    })
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${deviceEndpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      startingOptions = body.data
    })
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${scannerEndpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      scannerStartingOptions = body.data
    })
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${boardEndpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      const hasWireless = body.data.board.hwinfo.wifi
      if (!hasWireless) this.skip()
    })
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${statusEndpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      section2Id = body.data[0].id
      section5Id = body.data[1]?.id
      wifiOptions = body.data[0].options
      wifiOptions.htmodelist = Object.entries(wifiOptions.htmodelist)
        .filter(([, value]) => value)
        .map(([key]) => key)
      wifiOptions.hwmodelist = Object.entries(wifiOptions.hwmodelist)
        .filter(([, value]) => value)
        .map(([key]) => (['b', 'g'].includes(key) ? '' : key))
    })
  })
  cy.hitPage(route)
})

after(() => {
  if (!hasWifi) return
  cy.wrap(startingOptions).each(sectionData => {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${deviceEndpoint}/${sectionData.id}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          distance: '',
          frag: '',
          rts: '',
          channel: '',
          beacon_int: '',
          ...sectionData,
          id: undefined
        }
      }
    })
  })
  cy.request({
    method: 'PUT',
    url: `${Cypress.config('baseUrl')}/api${scannerEndpoint}`,
    headers: {
      Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
      'Content-type': 'application/json'
    },
    body: {
      data: {
        interval: '',
        ...scannerStartingOptions,
        id: undefined
      }
    }
  })
  cy.logout()
})

// General Setup
const enabled = {
  on: { type: 'switch', inputName: 'enabled', value: 'true' },
  off: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const hwmode = { type: 'select', inputName: 'hwmode' }
const channel = {
  auto: { type: 'select', inputName: 'channel', options: 'auto' },
  1: { type: 'select', inputName: 'channel', options: '1' }
}
const htmode = { type: 'select', inputName: 'htmode' } // depend
const txpower = { type: 'select', inputName: 'txpower', options: '100' }
const country = { type: 'select', inputName: 'country' }
// Advanced Settings
const legacyRates = {
  on: { type: 'switch', inputName: 'legacy_rates', value: 'true' },
  off: { type: 'switch', inputName: 'legacy_rates', value: 'false' }
}
const distance = { type: 'input', inputName: 'distance' }
const frag = { type: 'input', inputName: 'frag' }
const rts = { type: 'input', inputName: 'rts' }
const noscan = {
  on: { type: 'switch', inputName: 'noscan', value: 'true' },
  off: { type: 'switch', inputName: 'noscan', value: 'false' }
}
const beaconInt = { type: 'input', inputName: 'beacon_int' }
const acsExcludeDfs = {
  on: { type: 'switch', inputName: 'acs_exclude_dfs', value: 'true' },
  off: { type: 'switch', inputName: 'acs_exclude_dfs', value: 'false' }
}
// Wifi Scanner
const twoGEnabled = {
  on: { type: 'switch', inputName: 'two_g_enabled', value: 'true' },
  off: { type: 'switch', inputName: 'two_g_enabled', value: 'false' }
}
const interval = { type: 'input', inputName: 'interval' }

describe('Wireless: Device configuration', () => {
  it('Save with default options', () => {
    cy.testConfigurationEditNoCreate([], section2Id, section)
  })
  it('Save with legecy mode', function () {
    if (!wifiOptions.hwmodelist.includes('')) this.skip()
    const schema = [
      {
        tab: 'General Setup',
        inputs: [enabled.off, { ...hwmode, options: '' }, channel[1], txpower, { ...country, options: wifiOptions.countrylist[0].alpha2 }]
      }
    ]
    cy.testConfigurationEditNoCreate(schema, section2Id, section)
  })
  it('Save with non legecy mode and advanced options', function () {
    const notLegecyModes = wifiOptions.hwmodelist.filter(e => e !== '')
    if (notLegecyModes === 0) this.skip()
    const schema = [
      {
        tab: 'General Setup',
        inputs: [
          enabled.off,
          { ...hwmode, options: notLegecyModes[0] },
          channel[1],
          { ...htmode, options: wifiOptions.htmodelist[0] },
          txpower,
          { ...country, options: wifiOptions.countrylist[0].alpha2 }
        ]
      },
      {
        tab: 'Advanced Settings',
        inputs: [legacyRates.on, { ...distance, value: '10' }, { ...frag, value: '2346' }, { ...rts, value: '2347' }, noscan.on, { ...beaconInt, value: '100' }]
      },
      {
        tab: 'Wifi Scanner',
        inputs: [twoGEnabled.on, { ...interval, value: '100' }]
      }
    ]
    cy.testConfigurationEditNoCreate(schema, section2Id, section)
  })
  it('Save 5ghz advance options', function () {
    if (!section5Id) this.skip()
    const schema = [
      {
        tab: 'Advanced Settings',
        inputs: [{ ...distance, value: '10' }, { ...frag, value: '2346' }, { ...rts, value: '2347' }, noscan.on, { ...beaconInt, value: '100' }, acsExcludeDfs.on]
      }
    ]
    cy.testConfigurationEditNoCreate(schema, section5Id, section)
  })
})
