const endpoint = '/api/login'

describe('Login tests', () => {
  it.each([
    ['', '', 'Login failed'],
    [[], {}, 'Username and/or password must be a string']
  ])('tests failing login requests', (username, password, response) => {
    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}${endpoint}`,
      failOnStatusCode: false,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        username: username,
        password: password
      }
    }).then(({ body }) => {
      expect(body.errors[0].error).eql(response)
    })
  })
})
