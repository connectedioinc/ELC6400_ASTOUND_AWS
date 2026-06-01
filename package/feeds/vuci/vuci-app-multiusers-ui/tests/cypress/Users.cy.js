const route = '/system/admin/multiusers/users_configuration'
const userEndpoint = '/users/config'
const groupEndpoint = '/users/groups/config'
const userSectionName = 'users'
let restoreData = []

before(() => {
  cy.login()
  cy.then(() => {
    cy.request({
      method: 'GET',
      url: `${Cypress.config('baseUrl')}/api${groupEndpoint}`,
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
  cy.logout()
})

const username = { type: 'input', inputName: 'username', value: 'test' }
const password = { type: 'input', inputName: 'password', value: 'Admin012' }
const newPassword = { type: 'input', inputName: 'password', value: 'Admin011' }
const confirmPassword = { type: 'input', inputName: 'password_confirm', value: 'Admin011' }
const group = { type: 'select', inputName: 'group', options: 'admin', value: 'admin' }
const newGroup = { type: 'select', inputName: 'group', options: 'user', value: 'user' }
const optionNetwork = 'network'
const optionServices = 'services'

const writeAccessNetworkOption = { type: 'select', inputName: 'write_1', options: optionNetwork, value: optionNetwork }
const services = { type: 'select', inputName: 'read_7', options: optionServices, value: optionServices }
const lastInputToRemove = { typoe: 'input', inputName: 'read_10' }

describe('User group management configuration', () => {
  it('Edits user group settings in users management configuration', () => {
    const schema = [writeAccessNetworkOption, services, lastInputToRemove]
    cy.get('.edit')
      .eq(restoreData.length - 1)
      .click()
    cy.waitForEditModalOpen()
    cy.get('[test-id="listadd-write_0"]').click()

    cy.setValues(userEndpoint, schema, 'groups')
    cy.overviewSave('Configuration has been applied')
  })
  it('Reverts user group settings in users management configuration to default settings', () => {
    cy.get('.edit')
      .eq(restoreData.length - 1)
      .click()
    cy.waitForEditModalOpen()
    cy.get('[test-id="listremove-write_1"]').click()
    cy.get('[test-id="selectwrapper-read_7"]').type(optionNetwork)
    cy.get('[test-id="selectoption-network"]').click()
    cy.clickEditSave()
    cy.get('.edit')
      .eq(restoreData.length - 1)
      .click()
    cy.waitForEditModalOpen()
    cy.get('[test-id="selectwrapper-read_7"]').contains(optionNetwork)
    cy.clickEditClose()
  })
})

describe('User management configuration', () => {
  it('Fails to create new user with dot as first character`', () => {
    const userName = { type: 'input', inputName: 'username', value: '.test' }
    const schema = [userName, password, group]
    cy.get(`[test-id="tablerow-${userSectionName}"]`).within(() => {
      cy.setValues(userEndpoint, schema, userSectionName)
    })
    cy.clickSectionAdd()
    cy.checkMessage(' Some fields are invalid ')
  })
  it('Fails to create new user with hyphen as first character`', () => {
    const userName = { type: 'input', inputName: 'username', value: '-test' }
    const schema = [userName, password, group]
    cy.get(`[test-id="tablerow-${userSectionName}"]`).within(() => {
      cy.setValues(userEndpoint, schema, userSectionName)
    })
    cy.clickSectionAdd()
    cy.checkMessage(' Some fields are invalid ')
  })
  it('Fails to create new user with colon in name`', () => {
    const userName = { type: 'input', inputName: 'username', value: 'te:st' }
    const schema = [userName, password, group]
    cy.get(`[test-id="tablerow-${userSectionName}"]`).within(() => {
      cy.setValues(userEndpoint, schema, userSectionName)
    })
    cy.clickSectionAdd()
    cy.checkMessage(' Some fields are invalid ')
  })
  it('Fails to create new user with slash in name`', () => {
    const userName = { type: 'input', inputName: 'username', value: 'te/st' }
    const schema = [userName, password, group]
    cy.get(`[test-id="tablerow-${userSectionName}"]`).within(() => {
      cy.setValues(userEndpoint, schema, userSectionName)
    })
    cy.clickSectionAdd()
    cy.checkMessage(' Some fields are invalid ')
  })
  it('Fails to create new user with colon in name`', () => {
    const userName = { type: 'input', inputName: 'username', value: 'te:st' }
    const schema = [userName, password, group]
    cy.get(`[test-id="tablerow-${userSectionName}"]`).within(() => {
      cy.setValues(userEndpoint, schema, userSectionName)
    })
    cy.clickSectionAdd()
    cy.checkMessage(' Some fields are invalid ')
  })
  it('Fails to create new user with long name`', () => {
    const userName = {
      type: 'input',
      inputName: 'username',
      value: 'JDNJDSDSJSDHUDSSJOHASIJADHJHSJHDSAAKJASHJDHJASHDJSAHJDHASJHDHWEUYHEUHSJIDBUBSEDUHJWQIUJDSBDHJBAJUHDSJHDJABJHDBJHAKJJDJAJADJSJABBBBB'
    }
    const schema = [userName, password, group]
    cy.get(`[test-id="tablerow-${userSectionName}"]`).within(() => {
      cy.setValues(userEndpoint, schema, userSectionName)
    })
    cy.clickSectionAdd()
    cy.checkMessage(' Some fields are invalid ')
  })
  it('Fails to create new user with reserved name`', () => {
    const userName = {
      type: 'input',
      inputName: 'username',
      value: 'network'
    }
    const schema = [userName, password, group]
    cy.get(`[test-id="tablerow-${userSectionName}"]`).within(() => {
      cy.setValues(userEndpoint, schema, userSectionName)
    })
    cy.clickSectionAdd()
    cy.checkMessage(' This username is reserved for system ')
  })
  it('Creates new user in users management configuration`', () => {
    const schema = [username, password, group]
    cy.get(`[test-id="tablerow-${userSectionName}"]`).within(() => {
      cy.setValues(userEndpoint, schema, userSectionName)
    })
    cy.get(`[test-id="tablerow-${userSectionName}"]`).within(() => {
      cy.checkValues(userEndpoint, schema, userSectionName)
    })
    cy.clickSectionAdd()
    cy.checkMessage(`User '${username.value}' created`)
  })
  it('Edits user in users management configuration`', () => {
    const schema = [newPassword, confirmPassword, newGroup]
    cy.hitPage(route)
    cy.openLastCreatedEdit()
    cy.getModal().within(() => {
      cy.setValues(userEndpoint, schema, userSectionName)
    })
    cy.getModal().within(() => {
      cy.checkValues(userEndpoint, schema, userSectionName)
    })
    cy.clickEditSave()
    cy.logout()
  })
  it('Checks if newly created user can access allowed routes', () => {
    cy.login(username.value, newPassword.value)
    cy.hitPage('/status/overview')
  })
  it('Checks if newly created user can not access denied routes', () => {
    cy.hitPage('/network/wan')
  })
  it('Deletes newly created user in users management configuration', () => {
    cy.login()
    cy.hitPage(route)
    cy.get('.delete').last().click()
    cy.clickButton('ok')
  })
})
