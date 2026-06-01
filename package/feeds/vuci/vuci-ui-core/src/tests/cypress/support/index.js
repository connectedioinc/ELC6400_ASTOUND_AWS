// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import addContext from 'mochawesome/addContext'
import path from 'path'
import './commands'
import 'cypress-each'

Cypress.on('uncaught:exception', () => {
  // returning false here prevents Cypress from failing the test
  return false
})

// Note: cy.request is not logged as they can't be intercepted
const logs = []

function startLogging() {
  cy.intercept('/api/**', req => {
    const interception = { request: { ...req, timestamp: Date.now() }, response: null }
    logs.push(interception)
    req.on('after:response', res => {
      interception.response = { ...res, timestamp: Date.now() }
    })
  })
}
function writelog(testTitle) {
  cy.writeFile(`${Cypress.config('screenshotsFolder')}/../apiLogs/${Cypress.spec.name}__${testTitle}.log`, logs, { log: true, flag: 'w' }).then(() => {
    logs.splice(0, logs.length)
  })
}

beforeEach(startLogging)
afterEach(() => {
  const testTitle = Cypress.currentTest.titlePath.join('_').replace('/', '|').substring(0, 20)
  writelog(testTitle)
})

// embeds screenshots and videos in failed test reports
let screenshot = ''
Cypress.Screenshot.defaults({
  onAfterScreenshot(_, props) {
    screenshot = props.path
  }
})

Cypress.on('test:after:run', test => {
  if (test.state === 'failed') {
    let rootPath
    let reportRelative

    const generatedReportDir = Cypress.env('generatedReportDir')
    // Running in ATT
    if (generatedReportDir) {
      rootPath = generatedReportDir
      reportRelative = '.'
      // Running in manual
    } else {
      rootPath = path.dirname(Cypress.config('configFile'))
      const reportPath = Cypress.config('reporterOptions').reportDir
      reportRelative = path.relative(reportPath, '')
    }
    // Screenshot
    const screenshotRelative = path.relative(rootPath, screenshot)
    const reportToScreenshotRelative = `${reportRelative}/${screenshotRelative}`
    addContext({ test }, reportToScreenshotRelative)

    // Video
    if (Cypress.config('video')) {
      const video = `${Cypress.config('videosFolder')}/${Cypress.spec.name}.mp4`
      const videoRelative = path.relative(rootPath, video)
      const reportToVideoRelative = `${reportRelative}/${videoRelative}`
      addContext({ test }, reportToVideoRelative)
    }
  }
})

// Alternatively you can use CommonJS syntax:
// require('./commands')
