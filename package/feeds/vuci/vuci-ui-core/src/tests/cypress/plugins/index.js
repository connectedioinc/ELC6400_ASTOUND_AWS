/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

function deleteFile(fileName) {
  console.log('deleting file %s', fileName)
  return new Promise(resolve => {
    fs.unlink(fileName, () => {
      resolve(true)
    })
  })
}

/**
 * @type {Cypress.PluginConfig}
 */
export default (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  let baseUrl = 'http://192.168.1.1'
  if (config.env.ENV === 'production') {
    // eslint-disable-next-line no-undef
    baseUrl = process.env.CYPRESS_SERVER
  } else if (config.env.ENV === 'development') {
    // eslint-disable-next-line no-undef
    baseUrl = process.env.CYPRESS_DEV_SERVER
  }
  config.baseUrl = baseUrl

  // Deletes video when all tests in spec passes
  // https://docs.cypress.io/api/plugins/after-spec-api#Delete-the-recorded-video-if-no-tests-retried
  on('after:spec', (spec, results) => {
    if (results && results.video) {
      // Do we have failures for any retry attempts?
      const failures = results.tests.some(test => {
        return test.attempts.some(attempt => attempt.state === 'failed')
      })
      // delete the video if the spec passed and no tests retried
      if (!failures) {
        return deleteFile(results.video)
      }
    }
  })

  on('task', {
    deleteFile
  })

  return config
}
