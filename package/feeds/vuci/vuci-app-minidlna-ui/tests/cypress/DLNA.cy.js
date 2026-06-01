const route = '/services/sd_usb_tools/minidlna'
const endpoint = '/minidlna/config'
let restoreData = {}
let hasUSB = false
before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasUSB = body.data.board.hwinfo.usb
    })
  })
  if (hasUSB) {
    cy.then(() => {
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api${endpoint}`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        restoreData = body.data
      })
    })
  }
  cy.hitPage(route)
})

beforeEach(function () {
  if (!hasUSB) this.skip()
})

after(() => {
  if (hasUSB) {
    cy.request({
      method: 'PUT',
      url: `${Cypress.config('baseUrl')}/api${endpoint}`,
      body: {
        data: restoreData
      },
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  }
  cy.logout()
})
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const port = { type: 'input', inputName: 'port', value: '8222' }
const friendly_name = { type: 'input', inputName: 'friendly_name', value: 'DLNAserver' }
const root_container = {
  standard: { type: 'select', inputName: 'root_container', options: '.', value: 'Standard Container' },
  browse: { type: 'select', inputName: 'root_container', options: 'B', value: 'Browse Directory' },
  music: { type: 'select', inputName: 'root_container', options: 'M', value: 'Music' },
  video: { type: 'select', inputName: 'root_container', options: 'V', value: 'Video' },
  pictures: { type: 'select', inputName: 'root_container', options: 'P', value: 'Pictures' }
}
const album_art_names = { type: 'list', inputName: 'album_art_names', value: ['albumCover.jpg'] }
const inotify = { type: 'switch', inputName: 'inotify', value: 'false' }
const enable_tivo = { type: 'switch', inputName: 'enable_tivo', value: 'true' }
const strict_dlna = { type: 'switch', inputName: 'strict_dlna', value: 'true' }
const notify_interval = { type: 'input', inputName: 'notify_interval', value: '123' }

describe('Configuration with DLNA service', () => {
  describe('General Settings section', () => {
    it('Configuration with enabled server', () => {
      const schema = [enabled, port, friendly_name, root_container.pictures, album_art_names]
      cy.testNamedConfiguration(endpoint, schema, 'minidlna')
    })
  })
  describe('Advanced Settings section', () => {
    it('Configuration with enabled server', () => {
      const schema = [inotify, enable_tivo, strict_dlna, notify_interval]
      cy.changeInnerTab('Advanced Settings')
      cy.testNamedConfiguration(endpoint, schema, 'minidlna')
    })
  })
})
