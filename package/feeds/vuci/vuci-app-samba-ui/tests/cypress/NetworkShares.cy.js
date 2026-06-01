const route = '/services/sd_usb_tools/samba/general'
const mountedDeviceEnpoint = '/usb_tools/mount/options'
const usersEndpoint = '/samba/users/config'
const sambaSection = 'samba'
const sharesSection = 'shares'

let hasUSB

before(function () {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api/system/device/status`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${mountedDeviceEnpoint}`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    }).then(({ body }) => {
      hasUSB = body.data
    })
  })

  cy.hitPage(route)
})
after(() => {
  cy.logout()
})
const sharedNameValue = 'test' + Math.floor(Math.random() * 100) + 1

function fillSambaSection(schema, section) {
  cy.get(`[test-id="tablerow-${section}"]`).within(() => {
    cy.setValues('', schema, section)
  })
  cy.clickButton('saveandapply')
  cy.checkMessage('Configuration has been applied')
  cy.get(`[test-id="tablerow-${section}"]`).within(() => {
    cy.checkValues('', schema, section)
  })
}
function fillSharedDirectoriesSection(schema, section) {
  cy.get(`[test-id="tablerow-${section}"]`).within(() => {
    cy.clickButton('add')
    cy.setValues('', schema, section)
  })
  cy.clickButton('saveandapply')
  cy.checkMessage('Configuration has been applied')
  cy.get(`[test-id="tablerow-${section}"]`).within(() => {
    cy.checkValues('', schema, section)
  })
  cy.clearSection(null, section)
}
const enabled = {
  true: { type: 'switch', inputName: 'enabled', value: 'true' },
  false: { type: 'switch', inputName: 'enabled', value: 'false' }
}
const sambaName = { type: 'input', inputName: 'name', value: 'Router_share' }
const description = { type: 'input', inputName: 'description', value: 'Router share' }
const workgroup = { type: 'input', inputName: 'workgroup', value: 'WORKGROUP' }
const homes = {
  true: { type: 'switch', inputName: 'homes', value: 'true' },
  false: { type: 'switch', inputName: 'homes', value: 'false' }
}
const areaValue = {
  type: 'textarea',
  inputName: 'areaValue',
  value: `
  [global]
          netbios name = |NAME| 
          display charset = |CHARSET|
          interfaces = |INTERFACES|
          server string = |DESCRIPTION|
          unix charset = |CHARSET|
          workgroup = |WORKGROUP|
          bind interfaces only = yes
          deadtime = 30
          enable core files = no
          invalid users = root
          local master = no
          map to guest = Bad User
          max protocol = SMB2
          min receivefile size = 16384
          null passwords = yes
          passdb backend = smbpasswd
          security = user
          smb passwd file = /etc/samba/smbpasswd
          use sendfile = yes
          force user = root
`
}

const sharedName = { type: 'input', inputName: 'name', value: sharedNameValue }
const sharedPath = { type: 'select', inputName: 'path', value: '/mnt/', custom: true }
const readOnly = {
  true: { type: 'switch', inputName: 'read_only', value: 'true' },
  false: { type: 'switch', inputName: 'read_only', value: 'false' }
}
const browseable = {
  true: { type: 'switch', inputName: 'browseable', value: 'true' },
  false: { type: 'switch', inputName: 'browseable', value: 'false' }
}
const guestOk = {
  true: { type: 'switch', inputName: 'guest_ok', value: 'true' },
  false: { type: 'switch', inputName: 'guest_ok', value: 'false' }
}

const sambaUsername = { type: 'input', inputName: 'username', value: 'test' }
const sambaPassword = { type: 'input', inputName: 'password', value: 'Admin123' }
const sambaUserSchema = [sambaUsername, sambaPassword]
const sambaUserEditSchema = [
  { type: 'input', inputName: 'password', value: 'Admin123' },
  { type: 'input', inputName: 'passwordConfirm', value: 'Admin123' }
]

describe('SD & USB tools: Network shares configuration', () => {
  describe('Samba general settings', () => {
    it.each([
      [
        `Enabled is ${enabled.false.value}, Hostname is ${sambaName.value}, Description is ${description.value}`,
        [{ tab: 'General Settings', inputs: [enabled.false, sambaName, description, workgroup, homes.false] }]
      ],
      [`Enabled is ${enabled.true.value}, `, [{ tab: 'General Settings', inputs: [enabled.true] }]],
      [`Share home-directories is ${homes.true.value}`, [{ tab: 'General Settings', inputs: [enabled.false, homes.true] }]]
    ])('save Samba with this parameters: %s', (_, schema) => {
      fillSambaSection(schema, sambaSection)
    })
  })
  describe('Samba format usb settings', () => {
    it('check message when click format usb button', () => {
      cy.get(`[test-id="tablerow-${sambaSection}"]`).within(() => {
        cy.changeInnerTab('Format USB')
        cy.clickButton('format')
      })
      if (hasUSB.length > 0) {
        cy.checkMessage('Successfully formatted')
      } else {
        cy.checkMessage('Formatting unsuccessful or no MSD detected')
      }
    })
  })
  describe('Samba edit template settings', () => {
    it('Save with new edit template options', () => {
      const editTemplateSchema = [
        {
          tab: 'Edit Template',
          inputs: [areaValue]
        }
      ]
      fillSambaSection(editTemplateSchema, sambaSection)
    })
  })
  describe('Shared directories', () => {
    it.each([
      [
        `Read-only is ${readOnly.false.value}, Path is ${sharedPath.value}, Browseable is ${browseable.false.value}, Allow guests is ${guestOk.false.value}`,
        [sharedName, sharedPath, readOnly.false, browseable.false, guestOk.false]
      ],
      [
        `Read-only is ${readOnly.true.value}, Path is ${sharedPath.value}, Browseable is ${browseable.true.value}, Allow guests is ${guestOk.true.value}`,
        [sharedName, sharedPath, readOnly.true, browseable.true, guestOk.true]
      ],
      [
        `Read-only is ${readOnly.true.value}, Path is ${sharedPath.value}, Browseable is ${browseable.false.value}, Allow guests is ${guestOk.false.value}`,
        [sharedName, sharedPath, readOnly.true, browseable.false, guestOk.false]
      ],
      [
        `Read-only is ${readOnly.false.value}, Path is ${sharedPath.value}, Browseable is ${browseable.true.value}, Allow guests is ${guestOk.false.value}`,
        [sharedName, sharedPath, readOnly.false, browseable.true, guestOk.false]
      ],
      [
        `Read-only is ${readOnly.false.value}, Path is ${sharedPath.value}, Browseable is ${browseable.false.value}, Allow guests is ${guestOk.true.value}`,
        [sharedName, sharedPath, readOnly.false, browseable.false, guestOk.true]
      ]
    ])('save shares directories with this parameters: %s', (_, schema) => {
      fillSharedDirectoriesSection(schema, sharesSection)
    })
    it('save shares directories when usb exists', () => {
      if (hasUSB.length > 0) {
        const sharedPathFromUsb = { type: 'select', inputName: 'path', value: hasUSB[0].mountpoint }
        fillSharedDirectoriesSection([sharedName, sharedPathFromUsb], sharesSection)
      }
    })
    it('save shares directories when samba user exists', () => {
      cy.get('.vuci-main-content .vuci-tabs .tab-navigation .tab-item').last().click()
      cy.get('[test-id="tablerow-users"]').within(() => {
        cy.setValues('', sambaUserSchema, 'add-new-user')
      })
      cy.intercept('POST', 'api/samba/users/config').as('postSection')
      cy.clickButton('add')
      cy.wait('@postSection').then(res => {
        const sectionId = res.response.body.data.id
        cy.get('.vuci-main-content .vuci-tabs .tab-navigation .tab-item').first().click()
        const sharedUser = { type: 'multiselect', inputName: 'users', value: [{ options: sambaUsername.value, value: sambaUsername.value }] }
        const sharedDirectoriesSchema = [sharedName, sharedPath, sharedUser]
        fillSharedDirectoriesSection(sharedDirectoriesSchema, sharesSection)
        cy.get('.vuci-main-content .vuci-tabs .tab-navigation .tab-item').last().click()
        cy.checkIfReady('Configuration has been removed')
        cy.get(`[test-id="tablerow-${sectionId}"]`).within(() => {
          cy.clickButton('delete')
        })
        cy.clickButton('ok', true)
        cy.checkMessage('Configuration has been removed')
      })
    })
  })
  describe('Samba Users', () => {
    it('add new user', () => {
      cy.get('[test-id="tablerow-users"]').within(() => {
        cy.setValues('', sambaUserSchema, 'add-new-user')
      })
      cy.intercept('POST', 'api/samba/users/config').as('postSection')
      cy.clickButton('add')
      cy.wait('@postSection').then(res => {
        const sectionId = res.response.body.data.id
        cy.get(`[test-id="tablerow-${sectionId}"]`).within(() => {
          cy.get('[test-id="tablecolumns-username"]').within(() => {
            cy.get('[test-id="text-username"]').should('have.text', ` ${sambaUsername.value} `)
          })
        })
        cy.get(`[test-id="tablerow-${sectionId}"]`).within(() => {
          cy.clickButton('edit')
        })
        cy.waitForEditModalOpen()
        cy.getModal().within(() => {
          cy.get('[test-id="tablerow-users"]').within(() => {
            cy.setValues(usersEndpoint, sambaUserEditSchema, 'change-password')
          })
        })
        cy.clickEditSave()
        cy.checkIfReady('Configuration has been removed')
        cy.get(`[test-id="tablerow-${sectionId}"]`).within(() => {
          cy.clickButton('delete')
        })
        cy.clickButton('ok', true)
        cy.checkMessage('Configuration has been removed')
      })
    })
  })
})
