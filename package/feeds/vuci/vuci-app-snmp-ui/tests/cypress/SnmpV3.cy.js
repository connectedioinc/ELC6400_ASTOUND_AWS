const route = '/snmp/snmpv3'
const endpoint = '/snmp/users/config'
const sectionName = 'users'
let hasPackage = false

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
      hasPackage = body.data.includes('/usr/lib/opkg/info/snmp.control')
    })
  })
})

beforeEach(function () {
  if (!hasPackage) this.skip()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const newConfName = 'test' + Math.floor(Math.random() * 100) + 1

const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const username = { type: 'input', inputName: 'username', value: 'user' }
const rights = { type: 'select', inputName: 'rights', options: 'rw', value: 'Read-Write' }
const mibaccess = { type: 'input', inputName: 'mibaccess', value: '.21' }
const seclevel = {
  noAuth: { type: 'select', inputName: 'seclevel', options: 'noauth', value: 'No authentication, no privacy' },
  auth: { type: 'select', inputName: 'seclevel', options: 'auth', value: 'Authentication, no privacy' },
  priv: { type: 'select', inputName: 'seclevel', options: 'priv', value: 'Authentication and privacy' }
}
const authtype = { type: 'select', inputName: 'authtype', options: 'MD5', value: 'MD5' }
const authpass = { type: 'input', inputName: 'authpass', value: 'passphrase' }
const privtype = { type: 'select', inputName: 'privtype', options: 'AES', value: 'AES128' }
const privpass = { type: 'input', inputName: 'privpass', value: 'passphrase' }

describe('SnmpV3 configuration', () => {
  it.each([
    ['noAuth', [enabled, username, rights, mibaccess, seclevel.noAuth]],
    ['auth', [enabled, username, rights, mibaccess, seclevel.auth, authtype, authpass]],
    ['priv', [enabled, username, rights, mibaccess, seclevel.priv, authtype, authpass, privtype, privpass]]
  ])('Configuration when security levels is %s', (_, schema) => {
    cy.get('input[id=username]').type(newConfName)
    cy.testConfigurationEdit(endpoint, schema, sectionName)
  })
})
