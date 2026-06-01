const route = '/system/maintenance/eventlog/all'

const eventsSelect = {
  option1: { type: 'select', inputName: '_events_page_select', options: '5' },
  option2: { type: 'select', inputName: '_events_page_select', options: '10' },
  option3: { type: 'select', inputName: '_events_page_select', options: '15' },
  option4: { type: 'select', inputName: '_events_page_select', options: '20' },
  option5: { type: 'select', inputName: '_events_page_select', options: '25' }
}

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

describe('Events log', () => {
  it('Navigates through event tabs', () => {
    cy.get('.side-messages .error').should('not.exist')
    cy.get('.table-row').should('have.length.of.at.least', 1)
    cy.get('.tab-item')
      .not('.active')
      .each(el => {
        cy.wrap(el).click()
        cy.document().its('body').find('.spin-content')
        cy.document().its('body').find('.spin-content').should('not.exist')
        cy.get('.table-row').should('have.length.of.at.least', 1)
      })
    cy.hitPage(route)
  })
  it('Checks events filtering', () => {
    cy.fillValues(eventsSelect.option5)
    cy.get('.table-row').should('have.length.of.at.most', 25)
    cy.fillValues(eventsSelect.option4)
    cy.get('.table-row').should('have.length.of.at.most', 20)
    cy.fillValues(eventsSelect.option3)
    cy.get('.table-row').should('have.length.of.at.most', 15)
    cy.fillValues(eventsSelect.option2)
    cy.get('.table-row').should('have.length.of.at.most', 10)
    cy.fillValues(eventsSelect.option1)
    cy.get('.table-row').should('have.length.of.at.most', 5)
  })
  it('Searches events', () => {
    cy.fillInput('_events_search_input', 'testestest')
    cy.get('.table-row').should('not.exist')
  })
  it('Refreshes events', () => {
    cy.clickButton('refresh')
    cy.document().its('body').find('.spin-content')
    cy.document().its('body').find('.spin-content').should('not.exist')
  })
})
