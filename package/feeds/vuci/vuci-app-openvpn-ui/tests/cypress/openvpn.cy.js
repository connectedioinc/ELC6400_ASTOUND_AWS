const route = '/services/vpn/openvpn'
const endpoint = '/openvpn/config'
function deleteCertificates() {
  cy.then(() => {
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
      url: `${Cypress.config('baseUrl')}/api/certificates/config/server.cert.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/client.key.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    cy.request({
      method: 'DELETE',
      url: `${Cypress.config('baseUrl')}/api/certificates/config/client.cert.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
    // TODO
    // cy.request({
    //   method: 'DELETE',
    //   url: `${Cypress.config('baseUrl')}/api/certificates/config/dh.pem`,
    //   headers: {
    //     Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
    //     'Content-type': 'application/json'
    //   }
    // })
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
      url: `${Cypress.config('baseUrl')}/api/certificates/config/ca.cert.pem`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      }
    })
  })
}
before(() => {
  cy.login()
  cy.then(() => {
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
          delete: '1',
          sign: '1',
          key_size: '512',
          name: 'ca',
          subject: '',
          type: 'ca'
        }
      }
    })
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000)
    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/api/certificates/actions/generate`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          ca: 'ca.cert.pem',
          ca_key: 'ca.key.pem',
          days: '3560',
          delete: '1',
          key_size: '512',
          name: 'server',
          sign: '1',
          subject: '',
          type: 'server'
        }
      }
    })
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000)
    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/api/certificates/actions/generate`,
      headers: {
        Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
        'Content-type': 'application/json'
      },
      body: {
        data: {
          ca: 'ca.cert.pem',
          ca_key: 'ca.key.pem',
          days: '3560',
          delete: '1',
          key_size: '512',
          name: 'client',
          sign: '1',
          subject: '',
          type: 'client'
        }
      }
    })
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000)
    // TODO
    // cy.request({
    //   method: 'POST',
    //   url: `${Cypress.config('baseUrl')}/api/certificates/actions/generate`,
    //   headers: {
    //     Authorization: `Bearer ${window.sessionStorage.getItem('sid')}`,
    //     'Content-type': 'application/json'
    //   },
    //   body: {
    //     data: {
    //       days: '3560',
    //       delete: '0',
    //       key_size: '512',
    //       name: 'dh',
    //       sign: '0',
    //       subject: '',
    //       type: 'dh'
    //     }
    //   }
    // })
    // cy.wait(10000)
  })
  cy.hitPage(route)
})

after(() => {
  deleteCertificates()
  cy.logout()
})

const enable = {
  true: { type: 'switch', inputName: 'enable', value: 'true' },
  false: { type: 'switch', inputName: 'enable', value: 'false' }
}
const enable_custom = {
  true: { type: 'switch', inputName: 'enable_custom', value: 'true' },
  false: { type: 'switch', inputName: 'enable_custom', value: 'false' }
}
const config = { type: 'uploadFile', inputName: 'config', value: 'tests/cypress/fixtures/ovpn.ovpn' }
const upload_files = {
  true: { type: 'switch', inputName: 'upload_files', value: 'true' },
  false: { type: 'switch', inputName: 'upload_files', value: 'false' }
}
const dev = {
  tun: { type: 'select', inputName: 'dev', options: 'tun', value: 'TUN (tunnel)' },
  tap: { type: 'select', inputName: 'dev', options: 'tap', value: 'TAP (bridged)' }
}
const proto = {
  udp: { type: 'select', inputName: 'proto', options: 'udp', value: 'UDP' },
  tcp: {
    client: { type: 'select', inputName: 'proto', options: 'tcp-client', value: 'TCP' },
    server: { type: 'select', inputName: 'proto', options: 'tcp-server', value: 'TCP' }
  },
  udp6: { type: 'select', inputName: 'proto', options: 'udp6', value: 'UDP6' },
  tcp6: {
    client: { type: 'select', inputName: 'proto', options: 'tcp6-client', value: 'TCP6' },
    server: { type: 'select', inputName: 'proto', options: 'tcp6-server', value: 'TCP6' }
  }
}
const comp_lzo = {
  none: { type: 'select', inputName: 'comp_lzo', options: '', value: 'None' },
  yes: { type: 'select', inputName: 'comp_lzo', options: 'yes', value: 'Yes' },
  no: { type: 'select', inputName: 'comp_lzo', options: 'no', value: 'Yes' }
}
const auth_mode = {
  skey: { type: 'select', inputName: 'auth_mode', options: 'skey', value: 'Static key' },
  tls: { type: 'select', inputName: 'auth_mode', options: 'tls', value: 'TLS' },
  tlsPass: { type: 'select', inputName: 'auth_mode', options: 'tls/pass', value: 'TLS/Password' },
  pass: { type: 'select', inputName: 'auth_mode', options: 'pass', value: 'Password' }
}
const cipher = { type: 'select', inputName: 'cipher', options: 'DES-CBC', value: 'DES-CBC 64' }
const tls_cipher_list = {
  all: { type: 'select', inputName: 'tls_cipher_list', options: 'all', value: 'All' },
  dhe_rsa: { type: 'select', inputName: 'tls_cipher_list', options: 'dhe_rsa', value: 'DHE + RSA' },
  custom: { type: 'select', inputName: 'tls_cipher_list', options: 'custom', value: 'Custom' }
}
const tls_cipher = {
  type: 'multiselect',
  inputName: 'tls_cipher',
  value: [
    { options: 'TLS-DHE-RSA-WITH-AES-256-CBC-SHA', value: 'TLS-DHE-RSA-WITH-AES-256-CBC-SHA' },
    { options: 'TLS-DHE-RSA-WITH-AES-256-GCM-SHA384', value: 'TLS-DHE-RSA-WITH-AES-256-GCM-SHA384' }
  ]
}
const local_ip = { type: 'input', inputName: 'local_ip', value: '172.16.0.1' }
const remote_ip = { type: 'input', inputName: 'remote_ip', value: '172.16.0.2' }
const network_ip = { type: 'input', inputName: 'network_ip', value: '192.168.0.0' }
const network_mask = { type: 'select', inputName: 'network_mask', options: '255.255.255.0', value: '255.255.255.0' }
const auth = {
  none: { type: 'select', inputName: 'auth', options: 'none', value: 'None' },
  md5: { type: 'select', inputName: 'auth', options: 'md5', value: 'MD5' },
  sha1: { type: 'select', inputName: 'auth', options: 'sha1', value: 'SHA1 (default)' },
  sha256: { type: 'select', inputName: 'auth', options: 'sha256', value: 'SHA256' },
  sha384: { type: 'select', inputName: 'auth', options: 'sha384', value: 'SHA384' },
  sha512: { type: 'select', inputName: 'auth', options: 'sha512', value: 'SHA512' }
}
const tls_security = {
  none: { type: 'select', inputName: 'tls_security', options: 'none', value: 'None' },
  'tls-auth': { type: 'select', inputName: 'tls_security', options: 'tls-auth', value: 'Authentication only (tls-auth)' },
  'tls-crypt': { type: 'select', inputName: 'tls_security', options: 'tls-crypt', value: 'Authentication and encryption (tls-crypt)' }
}
const tls_auth = { type: 'uploadFile', inputName: 'tls_auth', value: 'tests/cypress/fixtures/ta.key' }
const tls_crypt = { type: 'uploadFile', inputName: 'tls_crypt', value: 'tests/cypress/fixtures/ta.key' }
const key_direction = { type: 'select', inputName: 'key_direction', options: '0', value: '0' }
const use_pkcs = {
  true: { type: 'switch', inputName: 'use_pkcs', value: 'true' },
  false: { type: 'switch', inputName: 'use_pkcs', value: 'false' }
}
const askpass = { type: 'inout', inputName: 'askpass', value: 'test' }
const pkcs12 = {
  client: { type: 'uploadFile', inputName: 'pkcs12', value: 'tests/cypress/fixtures/client.p12' },
  server: { type: 'uploadFile', inputName: 'pkcs12', value: 'tests/cypress/fixtures/server.p12' }
}
const device_files = {
  true: { type: 'switch', inputName: 'device_files', value: 'true' },
  false: { type: 'switch', inputName: 'device_files', value: 'false' }
}
const ca = { type: 'uploadFile', inputName: 'ca', value: 'tests/cypress/fixtures/ca.crt' }
const cert = {
  client: { type: 'uploadFile', inputName: 'cert', value: 'tests/cypress/fixtures/client.crt' },
  server: { type: 'uploadFile', inputName: 'cert', value: 'tests/cypress/fixtures/server.crt' }
}
const key = {
  client: { type: 'uploadFile', inputName: 'key', value: 'tests/cypress/fixtures/client.key' },
  server: { type: 'uploadFile', inputName: 'key', value: 'tests/cypress/fixtures/server.key' }
}
const _device_ca = { type: 'select', inputName: 'ca', value: 'ca.cert.pem' }
const _device_cert = {
  client: { type: 'select', inputName: 'cert', value: 'client.cert.pem' },
  server: { type: 'select', inputName: 'cert', value: 'server.cert.pem' }
}
const _device_key = {
  client: { type: 'select', inputName: 'key', value: 'client.key.pem' },
  server: { type: 'select', inputName: 'key', value: 'server.key.pem' }
}
const secret = { type: 'uploadFile', inputName: 'secret', value: 'tests/cypress/fixtures/ta.key' }

// Client
const enable_external = {
  true: { type: 'switch', inputName: 'enable_external', value: 'true' },
  false: { type: 'switch', inputName: 'enable_external', value: 'false' }
}
const external_service = {
  nord: { type: 'select', inputName: 'external_service', options: 'nord', value: 'Nord VPN' },
  express: { type: 'select', inputName: 'external_service', options: 'express', value: 'Express VPN' }
}
const server_list = {
  uk: { type: 'select', inputName: 'server_list', options: 'uk', value: 'United Kingdom' },
  usa: { type: 'select', inputName: 'server_list', options: 'usa', value: 'USA' },
  aus: { type: 'select', inputName: 'server_list', options: 'aus', value: 'Australia' },
  sa: { type: 'select', inputName: 'server_list', options: 'sa', value: 'South Africa' },
  custom: { type: 'select', inputName: 'server_list', options: 'custom', value: 'Custom' }
}
const remote = { type: 'input', inputName: 'remote', value: '0.0.0.0' }
const resolv_retry = { type: 'input', inputName: 'resolv_retry', value: '1000' }
const route_ipv6 = { type: 'input', inputName: 'route_ipv6', value: '2022:db1:3333:4444:5555:6666:7777:8888' }
const user = { type: 'input', inputName: 'user', value: 'User' }
const pass = { type: 'input', inputName: 'pass', value: 'Password' }
const extra = { type: 'list', inputName: 'extra', value: ['test', 'test2'] }
const decrypt = { type: 'input', inputName: 'decrypt', value: 'Password' }

// Server
const client_to_client = { type: 'switch', inputName: 'client_to_client', value: 'true' }
const server_ip = { type: 'input', inputName: 'server_ip', value: '172.16.1.0' }
const server_netmask = { type: 'select', inputName: 'server_netmask', options: '255.255.255.0', value: '255.255.255.0' }
const server_ipv6 = { type: 'input', inputName: 'server_ipv6', value: '2022:db1:3333:4444:5555:6666:7777:8888' }
const push = { type: 'list', inputName: 'push', value: ['route 192.168.1.0 255.255.255.0', 'route 10.0.0.0 255.255.255.252'] }
const duplicate_cn = {
  true: { type: 'switch', inputName: 'duplicate_cn', value: 'true' },
  false: { type: 'switch', inputName: 'duplicate_cn', value: 'false' }
}
const userpass = { type: 'uploadFile', inputName: 'userpass', value: 'tests/cypress/fixtures/pass_vpn' }
const dh = { type: 'uploadFile', inputName: 'dh', value: 'tests/cypress/fixtures/dh.pem' }
const _device_dh = { type: 'select', inputName: 'dh', value: 'dh.pem' }
const crl_verify = { type: 'uploadFile', inputName: 'crl_verify', value: 'tests/cypress/fixtures/crl.pem' }

const sname = { type: 'input', inputName: 'sname', value: 'test' }

const instanceName = 'test' + Math.floor(Math.random() * 100) + 1

describe('Openvpn instance', () => {
  it.each([
    [
      `LZO is ${comp_lzo.yes.value}, Authentication is ${auth_mode.skey.value}, Local tunnel endpoint IP is ${local_ip.value}, Remote tunnel endpoint IP is ${remote_ip.value}, Remote network IP address is ${network_ip.value}, Remote network netmask ${network_mask.value}, Static pre-shared key is ${secret.value}`,
      [comp_lzo.yes, auth_mode.skey, cipher, local_ip, remote_ip, network_ip, network_mask, secret]
    ],
    [
      `Virtual network IP address is ${server_ip.value} , Virtual network netmask is ${server_netmask.value}, Push option is ${push.value}`,
      [server_ip, server_netmask, push, ca, cert.server, key.server, dh, crl_verify]
    ],
    [
      `Allow duplicate certificates is ${duplicate_cn.true.value}, Authentication algorithm is ${auth.md5.value}, Certificate files from device is ${device_files.true.value}, Certificate authority filepath ${_device_ca.value}, Server certificate filepath ${_device_cert.server.value}, Server key filepath ${_device_key.server.value}, Diffie Hellman parameters filepath ${_device_dh.value}`,
      [duplicate_cn.true, auth.md5, device_files.true, _device_ca, _device_cert.server, _device_key.server]
    ],
    [`Use PKCS #12 format is ${use_pkcs.true.value}, PKCS #12 passphrase is ${askpass.value}, PKCS #12 certificate chain file ${pkcs12.server.value}`, [use_pkcs.true, askpass, pkcs12.server]],
    [
      `Additional HMAC authentication is ${tls_security['tls-auth'].value}, HMAC authentication key filepath ${tls_auth.value}, HMAC key direction is ${key_direction.value}`,
      [tls_security['tls-auth'], tls_auth, key_direction, ca, cert.server, key.server]
    ],
    [`Additional HMAC authentication is ${tls_security['tls-crypt'].value}, HMAC key filepath ${tls_crypt.value}`, [tls_security['tls-crypt'], tls_crypt, ca, cert.server, key.server]],
    [`TLS cipher is ${tls_cipher_list.dhe_rsa.value}, Allowed TLS ciphers is ${tls_cipher.value}`, [tls_cipher_list.dhe_rsa, tls_cipher, ca, cert.server, key.server]],
    // [`TLS cipher is ${tls_cipher_list.custom.value}, Allowed TLS ciphers is ${cipher_custom.value}`, [tls_cipher_list.custom, cipher_custom]], //BUG Allowed tls ciphers disappear after save (issue #9230)
    [`Authentication is ${auth_mode.tlsPass.value}, Usernames & Passwords is ${userpass.value}`, [auth_mode.tlsPass, userpass, ca, cert.server, key.server]],
    [
      `Authentication is ${auth_mode.pass.value}, Certificate authority filepath ${ca.value}, Server certificate filepath ${cert.server.value}, Server key filepath ${key.server.value}, Diffie Hellman parameters filepath ${dh.value}`,
      [auth_mode.pass, userpass, ca, cert.server, key.server, dh]
    ],
    [
      `Protocol is ${proto.udp6.value}, Virtual network IP address is ${server_ip.value} , Virtual network netmask is ${server_netmask.value}, Virtual network IPv6 address is ${server_ipv6.value}`,
      [proto.udp6, server_ip, server_netmask, server_ipv6, push, ca, cert.server, key.server, dh]
    ],
    [
      `Protocol is ${proto.tcp6.server.value}, Virtual network IP address is ${server_ip.value} , Virtual network netmask is ${server_netmask.value}, Virtual network IPv6 address is ${server_ipv6.value},  Certificate files from device is ${device_files.true.value},  Certificate authority filepath ${_device_ca.value}, Server certificate filepath ${_device_cert.server.value}, Server key filepath ${_device_key.server.value}, Diffie Hellman parameters filepath ${_device_dh.value}`,
      [proto.tcp6.server, server_ip, server_netmask, server_ipv6, device_files.true, _device_ca, _device_cert.server, _device_key.server]
    ],
    [
      `TUN/TAP is ${dev.tap.value}, Client to client is ${client_to_client.value}, Push option is ${push.value}, Certificate authority filepath ${ca.value}, Server certificate filepath ${cert.server.value}, Server key filepath ${key.server.value}, Diffie Hellman parameters filepath ${dh.value}`,
      [dev.tap, client_to_client, push, ca, cert.server, key.server, dh]
    ],
    [`TUN/TAP is ${dev.tap.value}, Protocol is ${proto.tcp.server.value}, Authentication is ${auth_mode.skey.value}`, [dev.tap, proto.tcp.server, auth_mode.skey, secret]],
    [
      `TUN/TAP is ${dev.tap.value}, Protocol is ${proto.udp6.value}, Authentication is ${auth_mode.tlsPass.value}, Usernames & Passwords is ${userpass.value}`,
      [dev.tap, proto.udp6, auth_mode.tlsPass, userpass, ca, cert.server, key.server]
    ],
    [
      `TUN/TAP is ${dev.tap.value}, Protocol is ${proto.tcp6.server.value}, Authentication is ${auth_mode.tlsPass.value}, Usernames & Passwords is ${userpass.value}, Certificate authority filepath ${ca.value}, Server certificate filepath ${cert.server.value}, Server key filepath ${key.server.value}, Diffie Hellman parameters filepath ${dh.value}`,
      [dev.tap, proto.tcp6.server, auth_mode.pass, userpass, ca, cert.server, key.server, dh]
    ],
    [`Enable is ${enable.true.value}, Enable OpenVPN config from file is ${enable_custom.true.value}, OpenVPN configuration filepath ${config.value}`, [enable.true, enable_custom.true, config]],
    [
      `Enable OpenVPN config from file is ${enable_custom.true.value}, Upload OpenVPN authentication files is ${upload_files.true.value}`,
      [enable_custom.true, config, upload_files.true, ca, cert.server, key.server]
    ],
    [
      `Enable OpenVPN config from file is ${enable_custom.true.value}, Upload OpenVPN authentication files is ${upload_files.true.value}, Authentication is ${auth_mode.skey.value}, Static pre-shared key filepath ${secret.value}`,
      [enable_custom.true, config, upload_files.true, auth_mode.skey, secret]
    ], // static key
    [
      `Enable OpenVPN config from file is ${enable_custom.true.value}, Upload OpenVPN authentication files is ${upload_files.true.value}, Authentication is ${auth_mode.tlsPass.value}, Additional HMAC authentication is ${tls_security['tls-auth'].value}, HMAC authentication key filepath ${tls_auth.value}, Usernames & Passwords is ${userpass.value}, Certificate authority filepath ${ca.value}, Server certificate filepath ${cert.server.value}, Server key filepath ${key.server.value}, Diffie Hellman parameters filepath ${dh.value}`,
      [enable_custom.true, config, upload_files.true, auth_mode.tlsPass, tls_security['tls-auth'], tls_auth, userpass, ca, cert.server, key.server, dh]
    ]
    // [`Enable OpenVPN config from file is ${enable_custom.true.value}, Upload OpenVPN authentication files is ${upload_files.true.value}, Authentication is ${auth_mode.pass.value}, Additional HMAC authentication is ${tls_security['tls-crypt'].value}, HMAC key filepath ${tls_crypt.value}, Use PKCS #12 format is ${use_pkcs.true.value}, PKCS #12 passphrase is ${askpass.value}, PKCS #12 certificate chain file ${pkcs12.server.value}, Usernames & Passwords is ${userpass.value}`, [enable_custom.true, upload_files.true, auth_mode.pass, tls_security['tls-crypt'], tls_crypt, use_pkcs.true, askpass, pkcs12.server, userpass, dh, crl_verify] //BUG not allowed to save with the following configuration  (issue #9298)
  ])('creates server configuration with the following parameters: %s', (_, schema) => {
    cy.get('input[id=id]').type(instanceName)
    cy.selectValue('type', 'server')
    cy.testCardConfigurationEdit(endpoint, schema, 'openVpn')
  })
  it.each([
    [
      `Authentication is ${auth_mode.skey.value}, Remote host/IP address is ${remote.value}, Local tunnel endpoint IP is ${local_ip.value}, Remote tunnel endpoint IP is ${remote_ip.value}, Remote network IP address is ${network_ip.value}, Remote network netmask ${network_mask.value}, Extra options is ${extra.value}, Static pre-shared key is ${secret.value}`,
      [auth_mode.skey, remote, local_ip, remote_ip, network_ip, network_mask, extra, secret]
    ],
    [
      `Certificate authority filepath ${ca.value}, Client certificate filepath ${cert.client.value}, Client key filepath ${key.client.value}, Private key decryption password (optional) is ${decrypt.value}`,
      [remote, ca, cert.client, key.client, decrypt]
    ],
    [`Use PKCS #12 format is ${use_pkcs.true.value}, PKCS #12 certificate chain ${pkcs12.client.value}`, [remote, use_pkcs.true, pkcs12.client]],
    [
      `Additional HMAC authentication is ${tls_security['tls-auth'].value}, HMAC authentication key filepath ${tls_auth.value}, Certificate authority filepath ${ca.value}, Client certificate filepath ${cert.client.value}, Client key filepath ${key.client.value}`,
      [tls_security['tls-auth'], remote, tls_auth, ca, cert.client, key.client]
    ],
    [
      `Additional HMAC authentication is ${tls_security['tls-crypt'].value}, HMAC key filepath ${tls_crypt.value}, Certificate files from device is ${device_files.true.value}, Certificate authority filepath ${_device_ca.value}, Server certificate filepath ${_device_cert.client.value}, Server key filepath ${_device_key.client.value},`,
      [tls_security['tls-crypt'], remote, tls_crypt, device_files.true, _device_ca, _device_cert.client, _device_key.client]
    ],
    [
      `TLS cipher is ${tls_cipher_list.dhe_rsa.value}, Allowed TLS ciphers is ${(tls_cipher.value[0], tls_cipher.value[1])}`,
      [remote, tls_cipher_list.dhe_rsa, tls_cipher, ca, cert.client, key.client]
    ],
    [
      `Authentication is ${auth_mode.tlsPass.value}, Resolve retry is ${resolv_retry.value}, User name is ${user.value}, Password is ${pass.value}`,
      [remote, auth_mode.tlsPass, resolv_retry, user, pass, ca, cert.client, key.client]
    ],
    [
      `Authentication is ${auth_mode.pass.value}, User name is ${user.value}, Password is ${pass.value}, Certificate authority filepath ${ca.value}`,
      [remote, auth_mode.tlsPass, user, pass, ca, cert.client, key.client]
    ],
    [`Protocol is ${proto.udp6.value}, Remote network IPv6 address is ${route_ipv6.value}`, [remote, proto.udp6, route_ipv6, ca, cert.client, key.client]],
    [`Protocol is ${proto.tcp6.client.value}`, [remote, proto.tcp6.client, ca, cert.client, key.client]],
    [`TUN/TAP is ${dev.tap.value}`, [remote, dev.tap, ca, cert.client, key.client]],
    [`TUN/TAP is ${dev.tap.value}, Protocol is ${proto.tcp.client.value}, Authentication is ${auth_mode.skey.value}`, [remote, dev.tap, proto.tcp.client, ca, cert.client, key.client]],
    [
      `TUN/TAP is ${dev.tap.value}, Protocol is ${proto.udp6.value}, Authentication is ${auth_mode.tlsPass.value}, User name is ${user.value}, Password is ${pass.value}`,
      [remote, dev.tap, proto.udp6, auth_mode.tlsPass, user, pass, ca, cert.client, key.client]
    ],
    [
      `TUN/TAP is ${dev.tap.value}, Protocol is ${proto.tcp6.client.value}, Authentication is ${auth_mode.pass.value}, User name is ${user.value}, Password is ${pass.value}, Certificate authority filepath ${ca.value}`,
      [remote, dev.tap, proto.tcp6.client, auth_mode.pass, user, pass, ca]
    ],
    [`Enable is ${enable.true.value}, Enable OpenVPN config from file is ${enable_custom.true.value}, OpenVPN configuration filepath ${config.value}`, [enable.true, enable_custom.true, config]],
    [
      `Enable OpenVPN config from file is ${enable_custom.true.value}, Upload OpenVPN authentication files is ${upload_files.true.value}`,
      [enable_custom.true, config, upload_files.true, ca, cert.client, key.client]
    ],
    [
      `Enable OpenVPN config from file is ${enable_custom.true.value}, Upload OpenVPN authentication files is ${upload_files.true.value}, Authentication is ${auth_mode.skey.value}, Static pre-shared key filepath ${secret.value}`,
      [enable_custom.true, upload_files.true, config, auth_mode.skey, secret]
    ],
    [
      `Enable OpenVPN config from file is ${enable_custom.true.value}, Upload OpenVPN authentication files is ${upload_files.true.value}, Authentication is ${auth_mode.tlsPass.value}, User name is ${user.value}, Password is ${pass.value}, Certificate authority filepath ${ca.value}, Server certificate filepath ${cert.client.value}, Server key filepath ${key.client.value}`,
      [enable_custom.true, config, upload_files.true, auth_mode.tlsPass, user, pass, ca, cert.client, key.client]
    ],
    [
      `Enable OpenVPN config from file is ${enable_custom.true.value}, Upload OpenVPN authentication files is ${upload_files.true.value}, Authentication is ${auth_mode.tlsPass.value}, Use PKCS #12 format is ${use_pkcs.true.value}, PKCS #12 passphrase is ${askpass.value}, PKCS #12 certificate chain filepath ${pkcs12.client.value}, User name is ${user.value}, Password is ${pass.value}`,
      [enable_custom.true, config, upload_files.true, auth_mode.tlsPass, use_pkcs.true, askpass, pkcs12.client, user, pass]
    ],
    [
      `Enable OpenVPN config from file is ${enable_custom.true.value}, Upload OpenVPN authentication files is ${upload_files.true.value}, Authentication is ${auth_mode.pass.value}, User name is ${user.value}, Password is ${pass.value}, Certificate authority filepath ${ca.value}`,
      [enable_custom.true, config, upload_files.true, auth_mode.pass, user, pass, ca]
    ],
    [
      `Enable is ${enable.true.value}, Enable external services is ${enable_external.true.value}, VPN providers is ${external_service.express.value}, VPN servers is ${server_list.usa.value}, User name is ${user.value}, Password is ${pass.value}`,
      [enable.true, enable_external.true, external_service.express, server_list.usa, user, pass]
    ]
  ])('creates client configuration with the following parametrs: %s', (_, schema) => {
    cy.get('input[id=id]').type(instanceName)
    cy.selectValue('type', 'client')
    cy.testCardConfigurationEdit(endpoint, schema, 'openVpn')
  })
  it('add new instance for TLS CLIENTS section', () => {
    const schema = [ca, cert.client, key.client]
    const tltClientsSchema = [
      { type: 'input', inputName: 'cn', value: 'name.surname@domain.com' },
      { type: 'input', inputName: 'lip', value: '172.16.1.6' },
      { type: 'input', inputName: 'rip', value: '172.16.1.5' },
      { type: 'input', inputName: 'pip', value: '192.168.10.1' },
      { type: 'input', inputName: 'pnm', value: '255.255.255.0' },
      {
        type: 'multiselect',
        inputName: 'cntw',
        value: [
          { options: 'lan', value: 'lan' },
          { options: 'wan', value: 'wan' }
        ]
      }
    ]
    cy.get('input[id=id]').type(instanceName)
    cy.intercept('POST', `/api${endpoint}`).as('postSection')
    let sectionName = ''
    cy.clickSectionAdd()
    cy.wait('@postSection').then(res => {
      sectionName = res.response.body.data.id
      cy.waitForEditModalOpen()
      cy.setValues(null, schema, 'openVpn')
      cy.getModal().within(() => {
        cy.setValues(null, [sname])
      })
      cy.clickSectionAdd('tlsClients')
      cy.getModal().within(() => {
        cy.setValues(null, tltClientsSchema, 'tlsClients')
      })
      cy.clickEditSave()
      cy.openLastCreatedEdit()
      cy.getModal().within(() => {
        cy.checkValues(null, tltClientsSchema, 'tlsClients')
      })
      cy.getModal().within(() => {
        cy.clickButton('delete')
      })
      cy.get('[test-id="button-ok"]').click()
      cy.checkMessage('Configuration has been removed')
      cy.clickEditClose()
      cy.clearCardSection(endpoint, sectionName)
    })
  })
})
