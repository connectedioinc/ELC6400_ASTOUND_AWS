import path from 'path'

// Login to WebUI using API request
// username - WebUI user username
// password - WebUI user password
// ***********************************************
Cypress.Commands.add('login', (username = Cypress.env('login_name'), password = Cypress.env('login_pass')) => {
  window.sessionStorage.clear()
  cy.request({
    method: 'POST',
    url: `${Cypress.config('baseUrl')}/api/login`,
    body: {
      username,
      password
    }
  }).then(({ body }) => {
    // window.sessionStorage.setItem('jwt_token', body.data.jwt_token)
    window.sessionStorage.setItem('sid', body.data.token)
  })
})

const headersBase = () => ({
  Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
  'Content-type': 'application/json'
})

Cypress.Commands.add('postRequest', (endpoint, body) => {
  const url = Cypress.config('baseUrl')
  return cy.request({
    method: 'POST',
    url: `${url}${endpoint}`,
    headers: headersBase(),
    ...(body ? { body } : {})
  })
})

Cypress.Commands.add('deleteRequest', (endpoint, body) => {
  const url = Cypress.config('baseUrl')
  return cy.request({
    method: 'DELETE',
    url: `${url}${endpoint}`,
    ...(body ? { body } : {}),
    headers: headersBase()
  })
})

Cypress.Commands.add('putRequest', (endpoint, body) => {
  const url = Cypress.config('baseUrl')
  return cy.request({
    method: 'PUT',
    url: `${url}${endpoint}`,
    headers: headersBase(),
    ...(body ? { body } : {})
  })
})

Cypress.Commands.add('getRequest', endpoint => {
  const url = Cypress.config('baseUrl')
  return cy.request({
    method: 'GET',
    url: `${url}${endpoint}`,
    headers: headersBase()
  })
})
Cypress.Commands.add('getPackages', () => {
  return cy.getRequest('/api/system/device/packages/status').then(({ body }) => body)
})

// Logout from WebUI
// ***********************************************
Cypress.Commands.add('logout', () => {
  window.sessionStorage.clear()
})

// Visit WebUI route and also check if Advanced mode is required
// route - WebUI url route to visit page
// ***********************************************
Cypress.Commands.add('hitPage', route => {
  cy.visit(route)
  cy.waitForContentLoad()
})

// Wait and check if WebUI content is visible
// ***********************************************
Cypress.Commands.add('waitForContentLoad', () => {
  cy.get('.main-content').should('be.visible')
  cy.document().its('body').find("[test-id='global-spinner']").should('not.exist')
})

Cypress.Commands.add('getModal', () => {
  // this style of getter ignores within because modals are no longer deep in dom but dirrect body child
  cy.document().its('body').find('.modal-container', { timeout: 20000 })
})

// Wait and check if WebUI edit modal content is visible
// ***********************************************
Cypress.Commands.add('waitForEditModalOpen', () => {
  cy.getModal().should('be.visible')
})

// Check Advanced/Basic mode require for route visit
// ***********************************************
Cypress.Commands.add('checkMode', () => {
  cy.get('body').then($body => {
    if ($body.find('.modal-container').length > 0) {
      cy.get('.modal-container > .title').invoke('text').should('eq', ' Switch to advanced mode? ')
      cy.get('.modal-container > .modal-content > .content-wrapper > button:contains("Switch to advanced")').click()
    }
  })
})

// Check if Firstlogin password change prompt appears and handle it
// ***********************************************
Cypress.Commands.add('checkFirstlogin', () => {
  cy.get('body').then($body => {
    if ($body.find('.overlay-container').length > 0) {
      cy.get('.overlay-container > h4').invoke('text').should('eq', 'Set new password')
      cy.request({
        method: 'PUT',
        url: `${Cypress.config('baseUrl')}/api/system/vuci/config`,
        body: {
          data: [{ firstlogin: '0' }]
        },
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      })
      cy.reload()
    }
  })
})

// Edit section using API PUT request
// endpoint - API configuration endpoint
// sectionId - section .name or custom key
// data - editable data passed with request
// ***********************************************
Cypress.Commands.add('editSection', (endpoint, sectionId, data) => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.config('baseUrl')}/api${endpoint}/${sectionId}`,
    body: {
      data
    },
    headers: {
      Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
      'Content-type': 'application/json'
    }
  })
})

// Delete section using API DELETE request
// endpoint - API configuration endpoint
// sectionId - section .name or custom key
// ***********************************************
Cypress.Commands.add('deleteSection', (endpoint, sectionId) => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.config('baseUrl')}/api${endpoint}`,
    headers: {
      Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
      'Content-type': 'application/json'
    },
    body: {
      data: [sectionId]
    }
  })
})

// Delete (clear) section using API DELETE request before test start
// endpoint - API configuration endpoint
// sectionId - section .name or custom key
// ***********************************************
Cypress.Commands.add('clearSection', (_endpoint, sectionId, message = 'Configuration has been removed') => {
  cy.checkIfReady(message)
  cy.get(`[test-id="tablerow-${sectionId}"]`).within(() => {
    cy.clickButton('delete')
  })
  cy.clickButton('ok', true)
  cy.checkMessage(message)
})

Cypress.Commands.add('clearCardSection', (_endpoint, sectionId, message = 'Configuration has been removed') => {
  cy.checkIfReady(message)
  cy.get(`[test-id="rowCard-${sectionId}"]`).within(() => {
    cy.clickButton('delete')
  })
  cy.clickButton('ok', true)
  cy.checkMessage(message)
})

// Top message check
// message - expected save message popup text output
// ***********************************************
Cypress.Commands.add('checkMessage', message => {
  cy.document().its('body').find('[test-id="toast-message-wrapper"]').contains(message)
})
Cypress.Commands.add('checkIfReady', message => {
  cy.document().its('body').find('[test-id="toast-message-wrapper"]').contains(message).should('not.exist')
})
// Edit modal Save & Apply button find and click
// message - expected save message popup text output
// ***********************************************
// TODO: chnage to test-id
Cypress.Commands.add('clickEditSave', (message = ' Configuration has been applied ') => {
  cy.checkIfReady(message)
  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.getModal()
    .scrollTo('bottom', { ensureScrollable: false })
    .within(() => {
      cy.clickButton('saveandapply')
    })
  cy.checkMessage(message)
})

// Overview form Save & Apply button find and click
// message - expected save message popup text output
// ***********************************************
Cypress.Commands.add('overviewSave', (message = ' Configuration has been applied ') => {
  cy.checkIfReady(message)
  cy.clickButton('saveandapply')
  cy.checkMessage(message)
})

Cypress.Commands.add('openLastCreatedEdit', () => {
  cy.get('.edit').last().click()
})

Cypress.Commands.add('deleteLastCreated', (message = 'Configuration has been removed') => {
  cy.checkIfReady(message)
  cy.get('.delete').last().click()
  cy.clickButton('ok', true)
  cy.checkMessage(message)
})

Cypress.Commands.add('setValues', (_endpoint, schema) => {
  if (schema.some(entrie => entrie.tab)) {
    cy.wrap(schema).each(entrie => {
      cy.changeInnerTab(entrie.tab)
      cy.wrap(entrie.inputs).each(element => cy.fillValues(element))
    })
  } else {
    cy.wrap(schema).each(element => cy.fillValues(element))
  }
})

Cypress.Commands.add('fillValues', element => {
  if (element.depend === false) return
  if (element.type === 'switch') {
    cy.clickSwitch(element.inputName, element.value)
  } else if (element.type === 'input') {
    cy.fillInput(element.inputName, element.value)
  } else if (element.type === 'textarea') {
    cy.fillTextarea(element.inputName, element.value)
  } else if (element.type === 'zoneSelect') {
    cy.selectValue(element.inputName, element.options, element.value)
  } else if (element.type === 'select') {
    cy.selectValue(element.inputName, element.options, element.value, element.custom)
  } else if (element.type === 'multiselect') {
    cy.selectMultiSelectValue(element.inputName, element.value)
  } else if (element.type === 'list') {
    cy.fillList(element.inputName, element.value, element.clearBeforeInput)
  } else if (element.type === 'uploadFile') {
    cy.uploadFile(element.inputName, element.value, false, element.options)
  } else if (element.type === 'uploadText') {
    cy.uploadText(element.inputName, element.value, false, element.options)
  } else if (element.type === 'customTest') {
    cy.callCustomTest(element.beforeSave, element.executeOutsideBefore || element.executeOutsideBoth)
  }
})

Cypress.Commands.add('checkValues', (_endpoint, schema) => {
  if (schema.some(entrie => entrie.tab)) {
    cy.wrap(schema).each(entrie => {
      cy.changeInnerTab(entrie.tab)
      cy.wrap(entrie.inputs).each(element => cy.getValues(element))
    })
  } else {
    cy.wrap(schema).each(element => cy.getValues(element))
  }
})

Cypress.Commands.add('getValues', element => {
  if (element.depend === false) return
  if (element.type === 'switch') {
    cy.getSwitchValue(element.inputName, element.value)
  } else if (element.type === 'input') {
    cy.getInputValue(element.inputName, element.value)
  } else if (element.type === 'select') {
    cy.getSelectValue(element.inputName, element.options, element.value)
  } else if (element.type === 'textarea') {
    cy.getTextareaValue(element.inputName, element.value)
  } else if (element.type === 'multiselect') {
    cy.getMultiSelectValue(element.inputName, element.value)
  } else if (element.type === 'zoneSelect') {
    cy.getZoneSelectValue(element.inputName, element.options, element.value)
  } else if (element.type === 'list') {
    cy.getListValues(element.inputName, element.value)
  } else if (element.type === 'uploadDrag') {
    cy.getUploadValue(element.inputName, element.value)
  } else if (element.type === 'uploadText') {
    cy.getTextUploadValue(element.inputName, element.value, element.options)
  } else if (element.type === 'uploadFile') {
    cy.getFileUploadValue(element.inputName, element.value)
  } else if (element.type === 'customTest') {
    cy.callCustomTest(element.afterSave, element.executeOutsideAfter || element.executeOutsideBoth)
  }
})

Cypress.Commands.add('testConfigurationEdit', (endpoint, schema, section, additionalTest) => {
  cy.editConfiguration(endpoint, schema, section, cy.clearSection, additionalTest)
})

Cypress.Commands.add('testCardConfigurationEdit', (endpoint, schema, section, additionalTest) => {
  cy.editConfiguration(endpoint, schema, section, cy.clearCardSection, additionalTest)
})

Cypress.Commands.add('editConfiguration', (endpoint, schema, section, sectionRemove, additionalTest) => {
  cy.intercept('POST', `/api${endpoint}`).as('postSection')
  let sectionName = ''
  cy.clickSectionAdd(section)
  cy.wait('@postSection').then(res => {
    try {
      sectionName = res.response.body.data.id
    } catch {
      throw new Error(`Bad API response\nAPI request:\n${JSON.stringify(res, null, 2)}`)
    }
    cy.waitForEditModalOpen()
    cy.getModal().within(() => {
      if (section) {
        cy.get(`[test-id="tablerow-${section}"]`).within(() => {
          cy.setValues(endpoint, schema, sectionName)
        })
      } else {
        cy.setValues(endpoint, schema)
      }
    })
    cy.clickEditSave()
    cy.openLastCreatedEdit()
    cy.getModal().within(() => {
      if (section) {
        cy.get(`[test-id="tablerow-${section}"]`).within(() => {
          cy.checkValues(endpoint, schema, sectionName)
        })
      } else {
        cy.checkValues(endpoint, schema)
      }
    })
    cy.clickEditClose()
    if (additionalTest instanceof Function) additionalTest(sectionName)
    sectionRemove(endpoint, sectionName)
  })
})

Cypress.Commands.add('testConfigurationEditNoCreate', (schema, section, sectionName) => {
  cy.openEdit(section, sectionName)
  cy.getModal().within(() => {
    cy.setValues('', schema, sectionName)
  })
  cy.clickEditSave()
  cy.openEdit(section, sectionName)
  cy.getModal().within(() => {
    cy.checkValues('', schema, sectionName)
  })
  cy.clickEditClose()
})

Cypress.Commands.add('openEdit', (section, sectionName) => {
  cy.get(`[test-id="tablerow-${section}"] [test-id="tablerow-${sectionName}"]`).within(() => {
    cy.get('[test-id="button-edit"]').click()
  })
})
Cypress.Commands.add('clickCloseModal', () => {
  cy.getModal().within(() => {
    cy.get('.nav-bar').within(() => {
      cy.get('.close-btn-wrapper').click()
    })
  })
})
Cypress.Commands.add('clickEditClose', () => {
  cy.clickCloseModal()
  cy.clickButton('ok', true)
})
Cypress.Commands.add('testNamedConfiguration', (endpoint, schema, sectionName, message = ' Configuration has been applied ') => {
  cy.get(`[test-id="tablerow-${sectionName}"]`).within(() => {
    cy.setValues(endpoint, schema, sectionName)
  })
  cy.overviewSave(message)
  cy.get(`[test-id="tablerow-${sectionName}"]`).within(() => {
    cy.checkValues(endpoint, schema, sectionName)
  })
})

Cypress.Commands.add('testTypedOverviewConfiguration', (endpoint, schema, sectionName, message = ' Configuration has been applied ') => {
  cy.intercept('POST', `/api${endpoint}`).as('postSection')
  let rowName = ''
  cy.clickSectionAdd(sectionName)
  cy.wait('@postSection').then(res => {
    try {
      rowName = res.response.body.data.id
    } catch {
      throw new Error(`Bad API response\nAPI request:\n${JSON.stringify(res, null, 2)}`)
    }
    cy.testNamedConfiguration(endpoint, schema, rowName, message)
    cy.clearSection(endpoint, rowName)
  })
})

Cypress.Commands.add('changeInnerTab', tabName => {
  cy.get('[test-id="inner-tab"]').within(() => {
    cy.contains(tabName).click({ scrollBehavior: 'center' })
  })
})

// Get and click form Add button
// ***********************************************
Cypress.Commands.add('clickSectionAdd', sectionName => {
  if (sectionName) {
    cy.get(`[test-id="tablerow-${sectionName}"]`).within(() => {
      cy.get('button:contains("Add")').click()
    })
  } else {
    cy.get('button:contains("Add")').click()
  }
})
// Gen 3

// Switch
Cypress.Commands.add('getSwitch', inputName => {
  // removed find('input') because class="invisible absolute"
  cy.get(`[test-id="switch-${inputName}"]`).filterVisible()
})

Cypress.Commands.add('clickSwitch', (inputName, value) => {
  cy.getSwitch(inputName)
    .invoke('attr', 'value')
    .then(attrValue => {
      const realAttrValue = attrValue === 'true' ? 'true' : 'false'
      if (realAttrValue !== value) cy.getSwitch(inputName).click()
    })
})
Cypress.Commands.add('getSwitchValue', (inputName, value) => {
  if (value === 'true') cy.getSwitch(inputName).should('have.attr', 'value', 'true')
  else cy.getSwitch(inputName).should('not.have.attr', 'value')
})

// Input

Cypress.Commands.add('filterVisible', { prevSubject: true }, subject => {
  cy.wrap(subject)
    .filter((_, $el) => $el.offsetHeight !== 0)
    .should('have.length', 1)
})

Cypress.Commands.add('getInput', inputName => {
  cy.get(`[test-id="input-${inputName}"]`).filterVisible()
})
Cypress.Commands.add('clickInput', inputName => {
  cy.getInput(inputName).click()
})
Cypress.Commands.add('fillInput', (inputName, value) => {
  // {selectall}{backspace} is usued because it does the same as .clear but works 100ms faster
  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.clickInput(inputName).type(`{selectall}{backspace}${value}`)
})
Cypress.Commands.add('getInputValue', (inputName, value) => {
  cy.getInput(inputName).should('have.value', value)
})

// TextArea

Cypress.Commands.add('getTextarea', inputName => {
  cy.get(`[test-id="textarea-${inputName}"]`).filterVisible()
})
Cypress.Commands.add('clickTextarea', inputName => {
  cy.getTextarea(inputName).click()
})
Cypress.Commands.add('fillTextarea', (inputName, value) => {
  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.clickTextarea(inputName).clear().type(value)
})
Cypress.Commands.add('getTextareaValue', (inputName, value) => {
  cy.getTextarea(inputName).should('have.value', value)
})

// Select
Cypress.Commands.add('getSelect', inputName => {
  cy.get(`[test-id="selectwrapper-${inputName}"]`).filterVisible()
})
Cypress.Commands.add('clickSelect', inputName => {
  cy.getSelect(inputName).click()
})
Cypress.Commands.add('selectValue', (inputName, option, value, custom) => {
  cy.clickSelect(inputName)
  cy.getSelect(inputName).within(() => {
    if (custom) {
      cy.get(`[test-id="selectoptioncustom-${inputName}"]`).type(`{selectall}{backspace}${value}{enter}`)
    } else if (option !== undefined) {
      cy.get(`[test-id="selectoption-${option}"]`).click({ scrollBehavior: 'center' })
    } else {
      cy.contains('li', value).click({ scrollBehavior: 'center' })
    }
  })
})
Cypress.Commands.add('getSelectValue', (inputName, option, value) => {
  cy.getSelect(inputName).within(() => {
    if (option !== undefined) {
      cy.get(`[test-id="selectstate-${inputName} selectedid-${option}"]`).should('exist')
    } else {
      cy.getInput(inputName).contains(value)
    }
  })
})
// Multiselect
Cypress.Commands.add('getMultiSelect', inputName => {
  cy.get(`[test-id="multiselect-${inputName}"]`).filterVisible()
})
Cypress.Commands.add('clickMultiSelect', inputName => {
  cy.getMultiSelect(inputName).click('right')
})
Cypress.Commands.add('selectMultiSelectValue', (inputName, value) => {
  cy.unselectAllMultiSelectValues(inputName)
  cy.clickMultiSelect(inputName)
  cy.wrap(value).each(val => {
    cy.getMultiSelect(inputName).within(() => {
      cy.get('[test-id="options-wrapper"]').within(() => {
        if (val.custom) {
          // eslint-disable-next-line cypress/unsafe-to-chain-command
          cy.get(`[test-id="selectoptioncustom-${inputName}"]`).click().type(val.value)
          cy.get('[test-id="button-add-custom"]').click()
        } else if (val.options !== undefined) {
          cy.get(`[test-id="selectoption-${val.options}"]`).click()
        } else {
          cy.contains('div', val.value)
        }
      })
    })
  })
  cy.clickMultiSelect(inputName)
})
Cypress.Commands.add('getMultiSelectValue', (inputName, value) => {
  cy.getMultiSelect(inputName).within(() => {
    cy.wrap(value).each(val => {
      if (val.options !== undefined) {
        cy.get(`[test-id="tag-${val.options}"]`).should('exist')
      } else {
        cy.get('[test-id="tags-wrapper"]').contains(val.value)
      }
    })
  })
})
Cypress.Commands.add('unselectAllMultiSelectValues', inputName => {
  cy.getMultiSelect(inputName).within($input => {
    if (!$input.find('[test-id="remove-tag"]').length) return
    cy.get('[test-id="remove-tag"]').each(() => {
      cy.get('[test-id="remove-tag"]').first().click()
    })
  })
  cy.getMultiSelect(inputName).within($input => {
    if ($input.find('[test-id="options-wrapper"]:visible').length) cy.wrap($input).click()
  })
})
// Zone select

Cypress.Commands.add('getZoneSelectValue', (inputName, option, value) => {
  cy.getSelect(inputName).within(() => {
    if (option !== undefined) {
      cy.get(`[test-id="selectstate-${inputName} selectedid-${option}"]`).should('exist')
    } else {
      cy.getInput(inputName).should($input => {
        expect($input).to.contain(value)
      })
    }
  })
})

// List
Cypress.Commands.add('fillList', (inputName, values, clearBeforeInput = false) => {
  if (clearBeforeInput) cy.removeAllListValues(inputName)
  let filledCount = 0
  cy.wrap(values).each(value => {
    const listInputName = inputName + '_' + filledCount
    cy.fillInput(listInputName, value)
    if (filledCount + 1 < values.length) {
      cy.get(`[test-id="listadd-${listInputName}"]`).click()
    }
    filledCount++
  })
})
Cypress.Commands.add('getListValues', (inputName, values) => {
  let filledCount = 0
  cy.wrap(values).each(value => {
    const listInputName = inputName + '_' + filledCount
    cy.getInputValue(listInputName, value)
    filledCount++
  })
})
Cypress.Commands.add('removeAllListValues', inputName => {
  cy.get(`[test-id="list-wrapper-${inputName}"]`).within(() => {
    cy.get('.input-remove').each($element => $element.click())
  })
})
// Button
Cypress.Commands.add('clickButton', (inputName, global = false) => {
  if (global) cy.document().its('body').find(`[test-id="button-${inputName}"]`).filterVisible().click()
  else cy.get(`[test-id="button-${inputName}"]`).filterVisible().click()
})

// Upload Drag and drop
Cypress.Commands.add('getUpload', inputName => {
  cy.get(`[test-id="button-${inputName}"]`).filterVisible()
})

Cypress.Commands.add('getUploadRemove', () => {
  cy.get('.delete')
})

Cypress.Commands.add('getUploadValue', (inputName, value) => {
  cy.get(`[for^="file_input_${inputName}_"]`).then(() => {
    if (value === '') {
      return cy.get(`button[test-id="button-${inputName}"]`).should($div => {
        expect($div).to.have.text(' Browse ')
      })
    }
    cy.get('span[class="file-name"]').should($div => {
      expect($div).to.contain(value)
    })
  })
})

// Calls custom function
// fn - funtion to call
// executeOutside - when tests are happening you are within tested section. When this var is true then you will excecute from outside
// ***********************************************
Cypress.Commands.add('callCustomTest', (fn, executeOutside) => {
  if (executeOutside) {
    cy.getOutside().within(fn)
  } else fn()
})

// Upload
// when no value or text supplied or they are empty string then upload is kept empty
Cypress.Commands.add('getUploadInput', inputName => {
  cy.get(`[test-id="upload-input-${inputName}"]`)
})
Cypress.Commands.add('uploadFile', (inputName, filePath, isInstant) => {
  if (!isInstant) cy.uploadDelete(inputName)
  if (filePath) cy.getUploadInput(inputName).selectFile(filePath, { force: true })
})
Cypress.Commands.add('uploadText', (inputName, text, isInstant, options = { fileName: 'file.txt', mimeType: 'text/plain' }) => {
  if (!isInstant) cy.uploadDelete(inputName)
  if (!text) return
  cy.getUploadInput(inputName).selectFile(
    {
      contents: Cypress.Buffer.from(text),
      ...options
    },
    {
      force: true
    }
  )
})
Cypress.Commands.add('getUploadFile', inputName => {
  return cy.get(`[test-id="upload-file-${inputName}"]`).filterVisible()
})
Cypress.Commands.add('getFileUploadValue', (inputName, filePath) => {
  const fileName = path.basename(filePath)
  if (filePath) cy.getUploadFile(inputName).should('contain', fileName)
  else cy.getUploadFile(inputName).should('contain', 'or drag and drop your file here')
})
Cypress.Commands.add('getTextUploadValue', (inputName, text, options = { fileName: 'file.txt' }) => {
  if (text) cy.getUploadFile(inputName).should('contain', options.fileName)
  else cy.getUploadFile(inputName).should('contain', 'or drag and drop your file here')
})
Cypress.Commands.add('uploadDelete', inputName => {
  // In theory can be unstable
  cy.get(`[test-id="upload-delete-${inputName}"]`).then($btn => {
    if ($btn.is(':visible')) {
      $btn.trigger('click')
    }
  })
})

Cypress.Commands.add('getText', inputName => {
  cy.get(`[test-id="text-${inputName}"]`).filterVisible()
})
Cypress.Commands.add('getTextValue', (inputName, value) => {
  cy.getText(inputName).should('contain', value)
})

Cypress.Commands.add('packageCondition', function (controlFile) {
  cy.hasPackage(controlFile).then(result => {
    if (!result) this.skip()
  })
})

Cypress.Commands.add('getTablerow', rowName => {
  cy.get(`[test-id="tablerow-${rowName}"]`).filterVisible()
})

Cypress.Commands.add('hasPackage', function (controlFile) {
  cy.request({
    method: 'GET',
    url: `${Cypress.config('baseUrl')}/api/system/device/packages/status`,
    headers: {
      Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
      'Content-type': 'application/json'
    }
  }).then(({ body }) => {
    return body.data.some(file => file.includes(controlFile))
  })
})

Cypress.Commands.add('boardCondition', function (boardAccessor) {
  cy.hasBoard(boardAccessor).then(result => {
    if (!result) this.skip()
  })
})
Cypress.Commands.add('hasBoard', function (boardAccessor) {
  cy.request({
    method: 'GET',
    url: `${Cypress.config('baseUrl')}/api/system/device/status`,
    headers: {
      Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
      'Content-type': 'application/json'
    }
  }).then(({ body }) => {
    return boardAccessor(body.data)
  })
})

Cypress.Commands.add('getOutside', function () {
  cy.document().its('body')
})
