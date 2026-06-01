// @vitest-environment node

import { getSentryConfig } from '../../../../vite.config.ts'

describe('getSentryConfig', () => {
  const testCases = [
    {
      name: 'development branch',
      env: {
        CI_COMMIT_SHA: '123456',
        CI_COMMIT_BRANCH: 'develop'
      },
      expected: {
        org: 'testOrg',
        project: 'testProject',
        authToken: 'testToken',
        releaseName: '123456',
        enabled: true,
        environment: 'development'
      }
    },
    {
      name: 'release branch',
      env: {
        CI_COMMIT_SHA: '123456',
        CI_COMMIT_BRANCH: 'release/1.0'
      },
      expected: {
        org: 'testOrg',
        project: 'testProject',
        authToken: 'testToken',
        releaseName: '123456',
        enabled: true,
        environment: 'release'
      }
    },
    {
      name: 'master branch',
      env: {
        CI_COMMIT_SHA: '123456',
        CI_COMMIT_TAG: 'v1.0.0'
      },
      expected: {
        org: 'testOrg',
        project: 'testProject',
        authToken: 'testToken',
        releaseName: 'v1.0.0',
        enabled: true,
        environment: 'production'
      }
    },
    {
      name: 'missing Sentry details',
      env: {
        CI_COMMIT_SHA: '123456'
      },
      expected: {
        org: 'testOrg',
        project: 'testProject',
        authToken: 'testToken',
        releaseName: '123456',
        enabled: false,
        environment: 'development'
      }
    }
  ]

  const defaultEnv = {
    SENTRY_ORG: 'testOrg',
    SENTRY_PROJECT: 'testProject',
    SENTRY_AUTH_TOKEN: 'testToken'
  }

  it.each(testCases)('should return correct config for $name', testCase => {
    expect(getSentryConfig({ ...defaultEnv, ...testCase.env })).toEqual(testCase.expected)
  })
})
