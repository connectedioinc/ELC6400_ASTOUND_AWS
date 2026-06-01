const route = '/services/hotspot/general'
const endpoint = '/hotspot/config'

const LocalUsersRoute = '/services/hotspot/users'

const localUsersNamePsw = 'test' + Math.floor(Math.random() * 100) + 1

// data used to make interfaceList and additionalInterfacesList
let ifaceStatuses = []
let devices = []
let wifiDevices = []
let ifaceList = []

// lists
let interfaceList = []
let additionalInterfacesList = []
let paramOptions = []

// data for conditional skipping
let isLan = false
let modems = []

// input fields
const selectedInterface = { type: 'select' }
const additionalInterfaces = { type: 'multiselect', inputName: 'moreif', value: [{}] }
const param1value = { type: 'select', inputName: 'param1value' }
const param2value = { type: 'select', inputName: 'param2value' }

before(() => {
  cy.login()
  cy.then(() => {
    cy.then(() => {
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/hotspot/config`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        isLan = body.data?.[0]?.network === 'lan'
      })
      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/modems/status`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        modems = body.data
      })

      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/interfaces/basic/status`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        ifaceStatuses = body.data
      })

      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/basic/network/devices/status`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        devices = body.data
      })

      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/wireless/interfaces/status`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      }).then(({ body }) => {
        wifiDevices = body.data
      })

      cy.request({
        method: 'GET',
        url: `${Cypress.config('baseUrl')}/api/interfaces/config`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        }
      })
        .then(({ body }) => {
          ifaceList = body.data
        })
        .then(() => {
          for (const iface of ifaceList) {
            const filteredIfaces = ifaceStatuses.filter(
              element => element.interface === iface.id && iface.id !== 'loopback' && element.device && !['eth1', 'eth0.2', 'qmimux', 'rmnet', 'wwan'].includes(element.device)
            )
            const notVirtual = filteredIfaces.filter(fIface => devices.some(device => device.name === fIface.device && !device.virtual) || iface.bridge)
            if (notVirtual.length !== 0) {
              notVirtual.forEach(element => {
                interfaceList.push([iface.id, `${iface.id} (${element.device})`])
              })
            }
          }
          const wifiDevicesFiltered = wifiDevices.filter(dev => !dev.disabled).map(device => [device.wifi_id, `${device.ssid}${device.ifname ? ` (${device.ifname})` : ''}`])

          interfaceList = interfaceList.concat(wifiDevicesFiltered)
          selectedInterface.options = interfaceList[1][0]
          selectedInterface.value = interfaceList[1][1]

          additionalInterfacesList = interfaceList.filter(iface => iface[0] !== selectedInterface.options)
          additionalInterfaces.value[0].options = additionalInterfacesList[0][0]
          additionalInterfaces.value[0].value = additionalInterfacesList[0][1]

          paramOptions = wifiDevices.map(device => [device.ssid, `SSID: ${device.ssid}`])
          param1value.options = paramOptions[0][0]
          param1value.value = paramOptions[0][1]
          param2value.options = paramOptions[0][0]
          param2value.value = paramOptions[0][1]
        })
      cy.request({
        method: 'POST',
        url: `${Cypress.config('baseUrl')}/api/certificates/actions/generate`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        },
        body: {
          data: {
            days: '3560',
            delete: '0',
            sign: '0',
            key_size: '512',
            name: 'ca',
            subject: '',
            type: 'ca'
          }
        }
      })
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000)
      cy.request({
        method: 'POST',
        url: `${Cypress.config('baseUrl')}/api/certificates/actions/generate`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        },
        body: {
          data: {
            days: '3560',
            delete: '0',
            sign: '0',
            key_size: '512',
            name: 'server',
            subject: '',
            type: 'server'
          }
        }
      })
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000)
      cy.request({
        method: 'POST',
        url: `${Cypress.config('baseUrl')}/api/certificates/actions/sign`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        },
        body: {
          data: {
            ca_key: 'ca.key.pem',
            days: '3560',
            delete: '0',
            name: 'signedCA',
            req_file: 'ca.req.pem',
            type: 'ca'
          }
        }
      })
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000)
      cy.request({
        method: 'POST',
        url: `${Cypress.config('baseUrl')}/api/certificates/actions/sign`,
        headers: {
          Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
          'Content-type': 'application/json'
        },
        body: {
          data: {
            ca: 'signedCA.cert.pem',
            ca_key: 'ca.key.pem',
            days: '3560',
            delete: '0',
            name: 'signedServer',
            req_file: 'server.req.pem',
            type: 'server'
          }
        }
      })
    })
  })
  cy.hitPage(route)
})

after(() => {
  cy.then(() => {
    // server
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/server.key.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/signedServer.cert.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/server.req.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    // ca
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/ca.key.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/ca.req.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/signedCA.cert.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  })
  cy.logout()
})

const configurationProfile = {
  default: { type: 'select', inputName: 'profile', options: 'default', value: 'Default' },
  cloud4wi: { type: 'select', inputName: 'profile', options: 'cloud4wi', value: 'Cloud4wi' },
  hotspotSystems: { type: 'select', inputName: 'profile', options: 'hotspotsystems', value: 'Hotspot systems' }
}
const enabled = { type: 'switch', inputName: 'enabled', value: 'false' }
const hotspotNetwork = { type: 'input', inputName: 'net', value: '192.168.2.0/32' }
const ipAddress = { type: 'input', inputName: 'uamlisten', value: '192.168.2.255' }
const authenticationMode = {
  localUsers: { type: 'select', inputName: 'mode', options: 'local', value: 'Local users' },
  radius: { type: 'select', inputName: 'mode', options: 'radius', value: 'Radius' }
}
const allowSignup = {
  on: { type: 'switch', inputName: 'registerusers', value: 'true' },
  off: { type: 'switch', inputName: 'registerusers', value: 'false' }
}
const landingPage = {
  internal: { type: 'select', inputName: 'landingpage', options: 'int', value: 'Internal' },
  external: { type: 'select', inputName: 'landingpage', options: 'ext', value: 'External' }
}
const uamSecret = { type: 'input', inputName: 'uamsecret', value: '12345' }
const uamPort = { type: 'input', inputName: 'uamport', value: '4000' }
const successPage = {
  successPage: { type: 'select', inputName: 'success', options: 'uam', value: 'Success page' },
  originalURL: { type: 'select', inputName: 'success', options: 'original', value: 'Original URL' },
  custom: { type: 'select', inputName: 'success', options: 'custom', value: 'Custom' }
}
const customUrl = { type: 'input', inputName: 'success_url', value: 'https://example.com' }
const passwordEncoding = { type: 'switch', inputName: 'withchallenge', value: 'true' }
const landingPageAddress = { type: 'input', inputName: 'uamserver', value: 'https://example.com' }
const expirationTime = { type: 'input', inputName: 'dynexpirationtime', value: '10' }

// RADIUS tab
const radiusServerNo1 = { type: 'input', inputName: 'radiusserver1', value: '192.168.1.1' }
const radiusServerNo2 = { type: 'input', inputName: 'radiusserver2', value: '192.168.1.1' }
const authenticationPort = { type: 'input', inputName: 'radiusauthport', value: '1812' }
const accountintPort = { type: 'input', inputName: 'radiusacctport', value: '1813' }
const nasIdentifier = { type: 'input', inputName: 'radiusnasid', value: '12345' }
const radiusSecretKey = { type: 'input', inputName: 'radiussecret', value: '12345' }
const swapOctets = {
  on: { type: 'switch', inputName: 'swapoctets', value: 'true' },
  off: { type: 'switch', inputName: 'swapoctets', value: 'false' }
}
const locationName = { type: 'input', inputName: 'locationname', value: 'exampleLocationName' }
const locationId = { type: 'input', inputName: 'radiuslocationid', value: 'exampleLocationId' }

// URL PARAMETERS tab
const uamIp = { type: 'input', inputName: 'paramuamip', value: 'uampIp' }
const uamPortRadius = { type: 'input', inputName: 'paramuamport', value: 'uamPort' }
const called = { type: 'input', inputName: 'paramcalled', value: 'called' }
const mac = { type: 'input', inputName: 'parammac', value: 'mac' }
const ip = { type: 'input', inputName: 'paramip', value: 'ip' }
const nasId = { type: 'input', inputName: 'paramnasid', value: 'nasId' }
const sessionId = { type: 'input', inputName: 'paramsessionid', value: 'sessionId' }
const userUrl = { type: 'input', inputName: 'paramuserurl', value: 'userUrl' }
const challenge = { type: 'input', inputName: 'paramchallenge', value: 'challenge' }
const custom1 = { type: 'input', inputName: 'param1', value: 'custom1' }

// MAC auth
const requirePassword = {
  on: { type: 'switch', inputName: 'enable_macpass', value: 'true' },
  off: { type: 'switch', inputName: 'enable_macpass', value: 'false' }
}
const usersGroup = {
  default: { type: 'select', inputName: 'dyn_users_group', options: 'default', value: 'default' }
}
const macAuthPassword = { type: 'input', inputName: 'macpass', value: '12345' }

// SMS OTP
const allowPasswordDuplicates = { type: 'switch', inputName: 'duplicateusers', value: 'false' }

// ADVANCED tab
const logoutAddress = { type: 'input', inputName: 'uamlogoutip', value: '1.1.1.1' }
const protocol = {
  http: { type: 'select', inputName: 'protocol', options: 'http', value: 'HTTP' },
  https: { type: 'select', inputName: 'protocol', options: 'https', value: 'HTTPS' }
}
const enableTos = {
  off: { type: 'switch', inputName: 'tos', value: 'false' },
  on: { type: 'switch', inputName: 'tos', value: 'true' }
}
const trialAccess = {
  off: { type: 'switch', inputName: 'trialusers', value: 'false' },
  on: { type: 'switch', inputName: 'trialusers', value: 'true' }
}
const group = {
  default: { type: 'select', inputName: 'trial_users_group', options: 'default', value: 'default' }
}
const httpsToLandingPageRedirect = {
  off: { type: 'switch', inputName: 'https_redirect', value: 'false' },
  on: { type: 'switch', inputName: 'https_redirect', value: 'true' }
}
const cetificateFilesFromDevice = {
  off: { type: 'switch', inputName: 'device_files', value: 'false' },
  on: { type: 'switch', inputName: 'device_files', value: 'true' }
}
const sslKeyFileUpload = { type: 'uploadFile', inputName: 'sslkeyfile', value: 'tests/cypress/fixtures/ca.cert.pem' }
const sslCertificateFileUpload = { type: 'uploadFile', inputName: 'sslcertfile', value: 'tests/cypress/fixtures/ca.cert.pem' }

const sslKeyFileSelect = { type: 'select', inputName: 'device_sslkeyfile', value: 'ca.key.pem' }
const sslCertificateFileSelect = { type: 'select', inputName: 'device_sslcertfile', value: 'signedServer.cert.pem' }

const primaryDnsServer = { type: 'input', inputName: 'dns1', value: '8.8.8.4' }
const secondaryDnsServer = { type: 'input', inputName: 'dns2', value: '8.8.8.8' }

// WALLED GARDEN tab
const addressList = { type: 'textarea', inputName: 'uamdomainfile', value: 'example.com' }

// USER SCRIPTS tab
const sessionUp = { type: 'textarea', inputName: 'conup', value: '#!/bin/sh\n/usr/bin/logger -t "example" "Example user USER_NAME logged on."' }
const sessionDown = { type: 'textarea', inputName: 'condown', value: '#!/bin/sh\n/usr/bin/logger -t "example" "Example user USER_NAME logged out."' }
const userSignup = { type: 'textarea', inputName: 'usersignup', value: '#!/bin/sh\n/usr/bin/logger -t "example" "New user created USER_NAME."' }

describe('Hotspot General', () => {
  Object.keys(configurationProfile).forEach(configurationProfileKey => {
    describe(`"Configuration profile" = "${configurationProfileKey}"`, () => {
      describe('"Authentication mode" = "Local users"', () => {
        describe('"GENERAL" tab', () => {
          describe('"Allow signup" = "on"', () => {
            describe('"Landing page" = "Internal"', () => {
              it.each([
                [
                  ['"Success page" = "Success page"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.localUsers,
                    allowSignup.on,
                    expirationTime,
                    landingPage.internal,
                    uamPort,
                    successPage.successPage
                  ]
                ],
                [
                  ['"Success page" = "Custom"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.localUsers,
                    allowSignup.on,
                    expirationTime,
                    landingPage.internal,
                    uamPort,
                    successPage.successPage
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
            describe('"Landing page" = "External"', () => {
              it.each([
                [
                  ['"Success page" = "Success page"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.localUsers,
                    allowSignup.on,
                    landingPage.external,
                    passwordEncoding,
                    landingPageAddress,
                    uamPort,
                    uamSecret,
                    successPage.successPage
                  ]
                ],
                [
                  ['"Success page" = "Custom"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.localUsers,
                    allowSignup.on,
                    landingPage.external,
                    passwordEncoding,
                    landingPageAddress,
                    uamPort,
                    uamSecret,
                    successPage.custom,
                    customUrl
                  ]
                ],
                [
                  ['"URL PARAMETERS" tab"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.localUsers, landingPage.external] },
                    { tab: 'URL parameters', inputs: [uamIp, uamPortRadius, called, mac, ip, nasId, sessionId, userUrl, challenge, custom1, param1value, param2value] }
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
          })
          describe('"Allow signup" = "off"', () => {
            describe('"Landing page" = "Internal"', () => {
              it.each([
                [
                  ['"Success page" = "Success page"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.localUsers,
                    allowSignup.off,
                    landingPage.internal,
                    uamPort,
                    successPage.successPage
                  ]
                ],
                [
                  ['"Success page" = "Custom"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.localUsers,
                    allowSignup.off,
                    landingPage.internal,
                    uamPort,
                    successPage.custom,
                    customUrl
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
            describe('"Landing page" = "External"', () => {
              it.each([
                [
                  ['"Success page" = "Success page"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.localUsers,
                    allowSignup.off,
                    landingPage.external,
                    passwordEncoding,
                    landingPageAddress,
                    uamPort,
                    uamSecret,
                    successPage.successPage
                  ]
                ],
                [
                  ['"Success page" = "Custom"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.localUsers,
                    allowSignup.off,
                    landingPage.external,
                    passwordEncoding,
                    landingPageAddress,
                    uamPort,
                    successPage.custom,
                    customUrl
                  ]
                ],
                [
                  ['"URL PARAMETERS" tab'],
                  [
                    { tab: 'General', inputs: [authenticationMode.localUsers, landingPage.external] },
                    { tab: 'URL parameters', inputs: [uamIp, uamPortRadius, called, mac, ip, nasId, sessionId, userUrl, challenge, custom1, param1value, param2value] }
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
          })
        })
        describe('"ADVANCED" tab', () => {
          describe('"Trial access" = "off"', () => {
            it.each([
              [
                ['"HTTPS to landing page redirect" = "off"'],
                [
                  { tab: 'General', inputs: [authenticationMode.localUsers] },
                  {
                    tab: 'Advanced',
                    inputs: [additionalInterfaces, logoutAddress, protocol.http, enableTos.off, trialAccess.off, httpsToLandingPageRedirect.off, primaryDnsServer, secondaryDnsServer]
                  }
                ]
              ]
            ])('%s', (_, schema) => {
              cy.selectValue('network', selectedInterface.options, selectedInterface.value)
              cy.testConfigurationEdit(endpoint, schema, 'general')
            })
            describe('"HTTPS to landing page redirect" = "on"', () => {
              it.each([
                [
                  ['"Certificate files from device" = "off"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.localUsers] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.off,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.off,
                        sslKeyFileSelect,
                        sslCertificateFileSelect
                      ]
                    }
                  ]
                ],
                [
                  ['"Certificate files from device" = "on"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.localUsers] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.off,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.on,
                        sslKeyFileSelect,
                        sslCertificateFileSelect
                      ]
                    }
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
          })
          describe('"Trial access" = "on"', () => {
            describe('"HTTPS to landing page redirect" = "on"', () => {
              it.each([
                [
                  ['"Certificate files from device" = "off"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.localUsers] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.on,
                        group.default,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.off,
                        sslKeyFileSelect,
                        sslCertificateFileSelect
                      ]
                    }
                  ]
                ],
                [
                  ['"Certificate files from device" = "on"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.localUsers] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.on,
                        group.default,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.on,
                        sslKeyFileSelect,
                        sslCertificateFileSelect,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    }
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
          })
        })
        it.each([
          [
            ['"WALLED GARDEN" tab'],
            [
              { tab: 'General', inputs: [] },
              { tab: 'Walled garden', inputs: [addressList] }
            ]
          ],
          [
            ['"USER SCRIPTS" tab'],
            [
              { tab: 'General', inputs: [] },
              { tab: 'User scripts', inputs: [sessionUp, sessionDown, userSignup] }
            ]
          ]
        ])('%s', (_, schema) => {
          cy.selectValue('network', selectedInterface.options, selectedInterface.value)
          cy.testConfigurationEdit(endpoint, schema, 'general')
        })
      })

      describe('"Authentication mode" = "Radius"', () => {
        describe('"GENERAL" tab', () => {
          describe('"Landing page" = "Internal"', () => {
            it.each([
              [
                ['"Success page" = "Success page"'],
                [
                  {
                    tab: 'General',
                    inputs: [configurationProfile[configurationProfileKey], enabled, hotspotNetwork, ipAddress, authenticationMode.radius, landingPage.internal, uamPort, successPage.successPage]
                  },
                  { tab: 'Radius', inputs: [radiusServerNo1] }
                ]
              ],
              [
                ['"Success page" = "Custom"'],
                [
                  {
                    tab: 'General',
                    inputs: [configurationProfile[configurationProfileKey], enabled, hotspotNetwork, ipAddress, authenticationMode.radius, landingPage.internal, uamPort, successPage.custom, customUrl]
                  },
                  { tab: 'Radius', inputs: [radiusServerNo1] }
                ]
              ]
            ])('%s', (_, schema) => {
              cy.selectValue('network', selectedInterface.options, selectedInterface.value)
              cy.testConfigurationEdit(endpoint, schema, 'general')
            })
          })
          describe('"Landing page" = "External"', () => {
            it.each([
              [
                ['"URL PARAMETERS" tab'],
                [
                  { tab: 'General', inputs: [authenticationMode.radius, landingPage.external] },
                  { tab: 'URL parameters', inputs: [uamIp, uamPortRadius, called, mac, ip, nasId, sessionId, userUrl, challenge, custom1, param1value, param2value] },
                  { tab: 'Radius', inputs: [radiusServerNo1] }
                ]
              ],
              [
                ['"Success page" = "Success page"'],
                [
                  {
                    tab: 'General',
                    inputs: [
                      {
                        tab: 'General',
                        inputs: [
                          configurationProfile[configurationProfileKey],
                          enabled,
                          hotspotNetwork,
                          ipAddress,
                          authenticationMode.radius,
                          landingPage.external,
                          passwordEncoding,
                          landingPageAddress,
                          uamPort,
                          uamSecret,
                          successPage.successPage
                        ]
                      },
                      { tab: 'Radius', inputs: [radiusServerNo1] }
                    ]
                  }
                ]
              ],
              [
                ['"Success page" = "Custom"'],
                [
                  {
                    tab: 'General',
                    inputs: [
                      {
                        tab: 'General',
                        inputs: [
                          configurationProfile[configurationProfileKey],
                          enabled,
                          hotspotNetwork,
                          ipAddress,
                          authenticationMode.radius,
                          landingPage.external,
                          passwordEncoding,
                          landingPageAddress,
                          uamPort,
                          uamSecret,
                          successPage.custom,
                          customUrl
                        ]
                      },
                      { tab: 'Radius', inputs: [radiusServerNo1] }
                    ]
                  }
                ]
              ],
              [
                ['"URL PARAMETERS" tab'],
                [
                  { tab: 'General', inputs: [authenticationMode.radius, landingPage.external] },
                  { tab: 'URL parameters', inputs: [uamIp, uamPortRadius, called, mac, ip, nasId, sessionId, userUrl, challenge, custom1, param1value, param2value] },
                  { tab: 'Radius', inputs: [radiusServerNo1] }
                ]
              ]
            ])('%s', (_, schema) => {
              cy.selectValue('network', selectedInterface.options, selectedInterface.value)
              cy.testConfigurationEdit(endpoint, schema, 'general')
            })
          })
        })
        describe('"ADVANCED" tab', () => {
          describe('"Trial access" = "off"', () => {
            it.each([
              [
                ['"HTTPS to landing page redirect" = "off"'],
                [
                  { tab: 'General', inputs: [authenticationMode.radius] },
                  {
                    tab: 'Advanced',
                    inputs: [additionalInterfaces, logoutAddress, protocol.http, enableTos.off, trialAccess.off, httpsToLandingPageRedirect.off, primaryDnsServer, secondaryDnsServer]
                  },
                  { tab: 'Radius', inputs: [radiusServerNo1] }
                ]
              ]
            ])('%s', (_, schema) => {
              cy.selectValue('network', selectedInterface.options, selectedInterface.value)
              cy.testConfigurationEdit(endpoint, schema, 'general')
            })
            describe('"HTTPS to landing page redirect" = "on"', () => {
              it.each([
                [
                  ['"Certificate files from device" = "off"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.radius] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.off,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.off,
                        sslKeyFileSelect,
                        sslCertificateFileSelect,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    },
                    { tab: 'Radius', inputs: [radiusServerNo1] }
                  ]
                ],
                [
                  ['"Certificate files from device" = "on"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.radius] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.off,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.on,
                        sslKeyFileSelect,
                        sslCertificateFileSelect,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    },
                    { tab: 'Radius', inputs: [radiusServerNo1] }
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
          })
          describe('"Trial access" = "on"', () => {
            describe('"HTTPS to landing page redirect" = "on"', () => {
              it.each([
                [
                  ['"Certificate files from device" = "off"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.radius] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.on,
                        group.default,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.off,
                        sslKeyFileSelect,
                        sslCertificateFileSelect,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    },
                    { tab: 'Radius', inputs: [radiusServerNo1] }
                  ]
                ],
                [
                  ['"Certificate files from device" = "on"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.radius] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.on,
                        group.default,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.on,
                        sslKeyFileSelect,
                        sslCertificateFileSelect,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    },
                    { tab: 'Radius', inputs: [radiusServerNo1] }
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
          })
        })
        it.each([
          [
            ['"RADIUS" tab'],
            [
              { tab: 'General', inputs: [configurationProfile[configurationProfileKey], enabled, hotspotNetwork, ipAddress, authenticationMode.radius] },
              { tab: 'Radius', inputs: [radiusServerNo1, radiusServerNo2, authenticationPort, accountintPort, nasIdentifier, radiusSecretKey, swapOctets.off, locationName, locationId] }
            ]
          ]
        ])('%s', (_, schema) => {
          cy.selectValue('network', selectedInterface.options, selectedInterface.value)
          cy.testConfigurationEdit(endpoint, schema, 'general')
        })
      })

      describe('"Authentication mode" = "MAC auth"', () => {
        before(function () {
          if (isLan) {
            this.skip()
          }
        })
        authenticationMode.macAuth = { type: 'select', inputName: 'mode', options: 'mac_auth', value: 'MAC auth' }
        describe('"GENERAL" tab', () => {
          describe('"Require password" = "off"', () => {
            describe('"Landing page" = "Internal"', () => {
              authenticationMode.macAuth = { type: 'select', inputName: 'mode', options: 'mac_auth', value: 'MAC auth' }
              it.each([
                [
                  ['"Success page" = "Success page"'],
                  [
                    configurationProfile[configurationProfileKey],
                    configurationProfile.default,
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.macAuth,
                    requirePassword.off,
                    usersGroup.default,
                    landingPage.internal,
                    uamPort,
                    successPage.successPage
                  ]
                ],
                [
                  ['"Success page" = "Custom"'],
                  [
                    configurationProfile[configurationProfileKey],
                    configurationProfile.default,
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.macAuth,
                    requirePassword.off,
                    usersGroup.default,
                    landingPage.internal,
                    uamPort,
                    successPage.custom,
                    customUrl
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
            describe('"Landing page" = "External"', () => {
              it.each([
                [
                  ['"Success page" = "Success page"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.macAuth,
                    requirePassword.off,
                    usersGroup.default,
                    landingPage.external,
                    passwordEncoding,
                    landingPageAddress,
                    uamPort,
                    uamSecret,
                    successPage.successPage
                  ]
                ],
                [
                  ['"Success page" = "Custom"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.macAuth,
                    requirePassword.off,
                    usersGroup.default,
                    landingPage.external,
                    passwordEncoding,
                    landingPageAddress,
                    uamPort,
                    uamSecret,
                    successPage.custom,
                    customUrl
                  ]
                ],
                [
                  ['"URL PARAMETERS" tab'],
                  [
                    { tab: 'General', inputs: [authenticationMode.macAuth, landingPage.external] },
                    { tab: 'URL parameters', inputs: [uamIp, uamPortRadius, called, mac, ip, nasId, sessionId, userUrl, challenge, custom1, param1value, param2value] }
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
          })
          describe('"Require password" = "on"', () => {
            describe('"Landing page" = "Internal"', () => {
              it.each([
                [
                  ['"Success page" = "Success page"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.macAuth,
                    requirePassword.on,
                    macAuthPassword,
                    usersGroup.default,
                    landingPage.internal,
                    uamPort,
                    successPage.successPage
                  ]
                ],
                [
                  ['"Success page" = "Custom"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.macAuth,
                    requirePassword.on,
                    macAuthPassword,
                    usersGroup.default,
                    landingPage.internal,
                    uamPort,
                    successPage.custom,
                    customUrl
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
            describe('"Landing page" = "External"', () => {
              it.each([
                [
                  ['"Success page" = "Success page"'],
                  [
                    configurationProfile[configurationProfileKey],
                    enabled,
                    hotspotNetwork,
                    ipAddress,
                    authenticationMode.macAuth,
                    requirePassword.on,
                    macAuthPassword,
                    usersGroup.default,
                    landingPage.external,
                    passwordEncoding,
                    landingPageAddress,
                    uamPort,
                    uamSecret,
                    successPage.successPage
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
          })
        })
        describe('"ADVANCED" tab', () => {
          describe('"Trial access" = "off"', () => {
            it.each([
              [
                ['"HTTPS to landing page redirect" = "off"'],
                [
                  { tab: 'General', inputs: [authenticationMode.macAuth] },
                  {
                    tab: 'Advanced',
                    inputs: [additionalInterfaces, logoutAddress, protocol.http, enableTos.off, trialAccess.off, httpsToLandingPageRedirect.off, primaryDnsServer, secondaryDnsServer]
                  }
                ]
              ]
            ])('%s', (_, schema) => {
              cy.selectValue('network', selectedInterface.options, selectedInterface.value)
              cy.testConfigurationEdit(endpoint, schema, 'general')
            })
            describe('"HTTPS to landing page redirect" = "on"', () => {
              it.each([
                [
                  ['"Certificate files from device" = "off"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.macAuth] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.off,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.off,
                        sslKeyFileUpload,
                        sslCertificateFileUpload,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    }
                  ]
                ],
                [
                  ['"Certificate files from device" = "on"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.macAuth] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.off,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.on,
                        sslKeyFileSelect,
                        sslCertificateFileSelect,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    }
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
          })
          describe('"Trial access" = "on"', () => {
            describe('"HTTPS to landing page redirect" = "on"', () => {
              it.each([
                [
                  ['"Certificate files from device" = "off"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.macAuth] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.on,
                        group.default,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.off,
                        sslKeyFileUpload,
                        sslCertificateFileUpload,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    }
                  ]
                ],
                [
                  ['"Certificate files from device" = "on"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.macAuth] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.on,
                        group.default,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.on.sslKeyFileSelect,
                        sslCertificateFileSelect,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    }
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
          })
        })
      })

      describe('"Authentication mode" = "SMS OTP"', () => {
        before(function () {
          if (modems.length === 0) {
            this.skip()
          }
        })
        authenticationMode.smsOpt = { type: 'select', inputName: 'mode', options: 'sms_otp', value: 'SMS OTP' }
        describe('"GENERAL" tab', () => {
          describe('"Landing page" = "Internal"', () => {
            it.each([
              [
                ['"Success page" = "Success page"'],
                [
                  configurationProfile[configurationProfileKey],
                  enabled,
                  hotspotNetwork,
                  ipAddress,
                  authenticationMode.smsOpt,
                  allowPasswordDuplicates,
                  usersGroup.default,
                  landingPage.internal,
                  uamPort,
                  successPage.successPage
                ]
              ],
              [
                ['"Success page" = "Custom"'],
                [
                  configurationProfile[configurationProfileKey],
                  enabled,
                  hotspotNetwork,
                  ipAddress,
                  authenticationMode.smsOpt,
                  allowPasswordDuplicates,
                  usersGroup.default,
                  landingPage.internal,
                  uamPort,
                  successPage.custom,
                  customUrl
                ]
              ]
            ])('%s', (_, schema) => {
              cy.selectValue('network', selectedInterface.options, selectedInterface.value)
              cy.testConfigurationEdit(endpoint, schema, 'general')
            })
          })
          describe('"Landing page" = "External"', () => {
            it.each([
              [
                ['"Success page" = "Success page"'],
                [
                  configurationProfile[configurationProfileKey],
                  enabled,
                  hotspotNetwork,
                  ipAddress,
                  authenticationMode.smsOpt,
                  allowPasswordDuplicates,
                  expirationTime,
                  usersGroup.default,
                  landingPage.external,
                  passwordEncoding,
                  landingPageAddress,
                  uamPort,
                  uamSecret,
                  successPage.successPage
                ]
              ],
              [
                ['"Success page" = "Custom"'],
                [
                  configurationProfile[configurationProfileKey],
                  enabled,
                  hotspotNetwork,
                  ipAddress,
                  authenticationMode.smsOpt,
                  allowPasswordDuplicates,
                  expirationTime,
                  usersGroup,
                  landingPage.external,
                  passwordEncoding,
                  landingPageAddress,
                  uamPort,
                  uamSecret,
                  successPage.custom,
                  customUrl
                ]
              ]
            ])('%s', (_, schema) => {
              cy.selectValue('network', selectedInterface.options, selectedInterface.value)
              cy.testConfigurationEdit(endpoint, schema, 'general')
            })
          })
        })
        describe('"ADVANCED" tab', () => {
          describe('"Trial access" = "off"', () => {
            it.each([
              [
                ['"HTTPS to landing page redirect" = "off"'],
                [
                  { tab: 'General', inputs: [authenticationMode.smsOpt] },
                  {
                    tab: 'Advanced',
                    inputs: [additionalInterfaces, logoutAddress, protocol.http, enableTos.off, trialAccess.off, httpsToLandingPageRedirect.off, primaryDnsServer, secondaryDnsServer]
                  }
                ]
              ],
              [
                ['"Success page" = "Custom"'],
                [
                  configurationProfile[configurationProfileKey],
                  enabled,
                  hotspotNetwork,
                  ipAddress,
                  authenticationMode.smsOpt,
                  allowPasswordDuplicates,
                  expirationTime,
                  usersGroup,
                  landingPage.external,
                  passwordEncoding,
                  landingPageAddress,
                  uamPort,
                  uamSecret,
                  successPage.custom,
                  customUrl
                ]
              ]
            ])('%s', (_, schema) => {
              cy.selectValue('network', selectedInterface.options, selectedInterface.value)
              cy.testConfigurationEdit(endpoint, schema, 'general')
            })
            describe('"HTTPS to landing page redirect" = "on"', () => {
              it.each([
                [
                  ['Certificate files from device" = "off"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.smsOpt] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.off,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.off,
                        sslKeyFileUpload,
                        sslCertificateFileUpload,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    }
                  ]
                ],
                [
                  ['"Certificate files from device" = "on"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.smsOpt] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.off,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.on,
                        sslKeyFileSelect,
                        sslCertificateFileSelect,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    }
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
          })
          describe('"Trial access" = "on"', () => {
            describe('"HTTPS to landing page redirect" = "on"', () => {
              it.each([
                [
                  ['"Certificate files from device" = "off"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.smsOpt] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.on,
                        group.default,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.off,
                        sslKeyFileUpload,
                        sslCertificateFileUpload,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    }
                  ]
                ],
                [
                  ['"Certificate files from device" = "on"'],
                  [
                    { tab: 'General', inputs: [authenticationMode.smsOpt] },
                    {
                      tab: 'Advanced',
                      inputs: [
                        additionalInterfaces,
                        logoutAddress,
                        protocol.http,
                        enableTos.off,
                        trialAccess.on,
                        group.default,
                        httpsToLandingPageRedirect.on,
                        cetificateFilesFromDevice.on,
                        sslKeyFileSelect,
                        sslCertificateFileSelect,
                        primaryDnsServer,
                        secondaryDnsServer
                      ]
                    }
                  ]
                ],
                [
                  ['"URL PARAMETERS" tab'],
                  [
                    { tab: 'General', inputs: [authenticationMode.smsOpt, landingPage.external] },
                    { tab: 'URL parameters', inputs: [uamIp, uamPortRadius, called, mac, ip, nasId, sessionId, userUrl, challenge, custom1, param1value, param2value] }
                  ]
                ]
              ])('%s', (_, schema) => {
                cy.selectValue('network', selectedInterface.options, selectedInterface.value)
                cy.testConfigurationEdit(endpoint, schema, 'general')
              })
            })
          })
        })
      })
    })
  })
  it('Configures instance with enable = true, disables instance in overview and checks for changes in modal (creates and deletes "Local Users")', () => {
    cy.hitPage(LocalUsersRoute)
    cy.get('input[test-id="input-username"]').type(localUsersNamePsw)
    cy.get('input[test-id="input-password"]').type(localUsersNamePsw)
    cy.clickSectionAdd('users')
    enabled.value = 'true'
    const schema = [enabled]
    cy.hitPage(route)
    cy.selectValue('network', selectedInterface.options, selectedInterface.value)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    cy.clickSectionAdd('general')
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.getModal().within(() => {
        cy.get('[test-id="tablerow-general"]').within(() => {
          cy.setValues(endpoint, schema, sectionName)
        })
      })
      cy.clickEditSave()
      cy.get('div[test-id=switch-enabled]').click()
      cy.openLastCreatedEdit()

      cy.getModal().within(() => {
        enabled.value = 'false'
        cy.checkValues(null, schema)
      })
      cy.clickEditClose()
      cy.clickButton('delete')
      cy.clickButton('ok')
      cy.checkMessage('Configuration has been removed')
    })
    cy.hitPage(LocalUsersRoute)
    cy.clearSection(null, 'users')
  })
})
