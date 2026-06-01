const route = '/system/admin/memory_expansion/sshfs'
const endpoint = '/sshfs/config/'
let restoreData = {}

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
      restoreData = body.data
    })
  })
  cy.hitPage(route)
})

after(() => {
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
  cy.logout()
})
const enabled = { type: 'switch', inputName: 'enabled', value: 'true' }
const hostname = { type: 'input', inputName: 'hostname', value: 'example.com' }
const port = { type: 'input', inputName: 'port', value: '22' }
const username = { type: 'input', inputName: 'username', value: 'test' }
const password = { type: 'input', inputName: 'password', value: 'pass' }
const mountPoint = { type: 'input', inputName: 'mount_point', value: '/sshmount' }
const mountPath = { type: 'input', inputName: 'mount_path', value: '/home/' }

describe('SSHFS configuration', () => {
  it('Configuration with enabled service', () => {
    const schema = [enabled, hostname, port, username, password, mountPoint, mountPath]
    cy.testNamedConfiguration(endpoint, schema, 'sshfs')
  })
  it('Configuration with enabled service and reserved mount point', () => {
    const mountPointValue = '/tmp'
    const schema = [enabled, hostname, port, username, password, { ...mountPoint, value: mountPointValue }, mountPath]
    cy.testNamedConfiguration(endpoint, schema, 'sshfs', ` Provided mount point '${mountPointValue}' is used by system `)
  })
  it('Configuration with disabled service', () => {
    const schema = [{ ...enabled, value: 'false' }]
    cy.testNamedConfiguration(endpoint, schema, 'sshfs')
  })
})
