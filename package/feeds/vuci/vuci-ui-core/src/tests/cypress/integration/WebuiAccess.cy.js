const username = Cypress.env('login_name')
const password = Cypress.env('login_pass')

describe('Test Login/Logout', () => {
  it('Login API', () => {
    cy.login()
  })

  it('Login WebUI form', () => {
    window.sessionStorage.clear()
    cy.visit('/')
    cy.get('input[id=username]').type(username)
    cy.get('input[id=password]').type(password, { sensitive: true })
    cy.get('button').click()
    cy.url().should('include', '/status/overview')
  })

  it('Login with incorrect data', () => {
    window.sessionStorage.clear()
    cy.visit('/')
    cy.get('input[id=username]').type('admin')
    cy.get('input[id=password]').type('testas15', { sensitive: true })
    cy.get('button').click()
    cy.get('[test-id="login-error"]').contains('Invalid username and/or password! Please try again.')
  })

  it('Logout WebUI form', () => {
    cy.login()
    cy.get('.header-info').within(() => {
      cy.contains('Logout').should('have.class', 'logout-btn')
      cy.get('.logout-btn').click()
    })
    cy.get('.login-container').should('be.visible')
    cy.url().should('include', '/login')
  })

  it('Logout WebUI form Mobile', () => {
    cy.viewport('iphone-x')
    cy.login()
    cy.get('.nav-top').within(() => {
      cy.get('.extra-button').click()
    })
    cy.get('.menu-overlay').should('have.class', 'visible')
    cy.get('.links').within(() => {
      cy.contains('Logout').should('have.class', 'logout-btn')
      cy.get('.logout-btn').click()
    })
    cy.get('.login-container').should('be.visible')
    cy.url().should('include', '/login')
  })
})
