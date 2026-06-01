export const fields = {
  // GENERAL
  enabled: {
    on: { type: 'switch', inputName: 'enabled', value: 'true' },
    off: { type: 'switch', inputName: 'enabled', value: 'false' }
  },
  mode: {
    ap: { type: 'select', inputName: 'mode', options: 'ap' },
    sta: { type: 'select', inputName: 'mode', options: 'sta' },
    mesh: { type: 'select', inputName: 'mode', options: 'mesh' },
    multi_ap: { type: 'select', inputName: 'mode', options: 'multi_ap' }
  },
  meshId: { type: 'input', inputName: 'mesh_id' }, // depend
  ssid: { type: 'input', inputName: 'ssid' }, // depend
  bssid: { type: 'input', inputName: 'bssid' }, // depend
  network: { type: 'select', inputName: 'network' },
  hidden: {
    on: { type: 'switch', inputName: 'hidden', value: 'true' },
    off: { type: 'switch', inputName: 'hidden', value: 'false' }
  }, // depend
  wmm: {
    on: { type: 'switch', inputName: 'wmm', value: 'true' },
    off: { type: 'switch', inputName: 'wmm', value: 'false' }
  }, // depend

  // ADVANCED
  meshFwding: {
    on: { type: 'switch', inputName: 'mesh_fwding', value: 'true' },
    off: { type: 'switch', inputName: 'mesh_fwding', value: 'false' }
  }, // depend

  meshRssiThreshold: { type: 'input', inputName: 'mesh_rssi_threshold' }, // depend
  isolate: {
    on: { type: 'switch', inputName: 'isolate', value: 'true' },
    off: { type: 'switch', inputName: 'isolate', value: 'false' }
  }, // depend
  shortPreamble: {
    on: { type: 'switch', inputName: 'short_preamble', value: 'true' },
    off: { type: 'switch', inputName: 'short_preamble', value: 'false' }
  },
  dtimPeriod: { type: 'input', inputName: 'dtim_period' },
  wpaGroupRekey: { type: 'input', inputName: 'wpa_group_rekey' },
  skipInactivityPoll: {
    on: { type: 'switch', inputName: 'skip_inactivity_poll', value: 'true' },
    off: { type: 'switch', inputName: 'skip_inactivity_poll', value: 'false' }
  },
  maxInactivity: { type: 'input', inputName: 'max_inactivity' },
  maxListenInterval: { type: 'input', inputName: 'max_listen_interval' },
  disassocLowAck: {
    on: { type: 'switch', inputName: 'disassoc_low_ack', value: 'true' },
    off: { type: 'switch', inputName: 'disassoc_low_ack', value: 'false' }
  },
  wds: {
    on: { type: 'switch', inputName: 'wds', value: 'true' },
    off: { type: 'switch', inputName: 'wds', value: 'false' }
  },
  trm_enabled: {
    on: { type: 'switch', inputName: 'trm_enabled', value: 'true' },
    off: { type: 'switch', inputName: 'trm_enabled', value: 'false' }
  },

  //  ENCRIPTION
  // Every field has depends

  encryption: {
    none: { type: 'select', inputName: 'encryption', options: 'none' },
    psk: { type: 'select', inputName: 'encryption', options: 'psk' },
    psk2: { type: 'select', inputName: 'encryption', options: 'psk2' },
    pskMixed: { type: 'select', inputName: 'encryption', options: 'psk-mixed' },
    sae: { type: 'select', inputName: 'encryption', options: 'sae' },
    saeMixed: { type: 'select', inputName: 'encryption', options: 'sae-mixed' },
    wpa: { type: 'select', inputName: 'encryption', options: 'wpa' },
    wpa2: { type: 'select', inputName: 'encryption', options: 'wpa2' },
    owe: { type: 'select', inputName: 'encryption', options: 'owe' },
    wpa3Mixed: { type: 'select', inputName: 'encryption', options: 'wpa3-mixed' }
  }, // option depends (by default all deveces has all options so could not test exclusion by device)
  cipher: {
    auto: { type: 'select', inputName: 'cipher', options: 'auto' },
    ccmp: { type: 'select', inputName: 'cipher', options: 'ccmp' },
    tkip: { type: 'select', inputName: 'cipher', options: 'tkip' },
    tkipCcmp: { type: 'select', inputName: 'cipher', options: 'tkip+ccmp' }
  },

  authServer: { type: 'input', inputName: 'auth_server' },
  authPort: { type: 'input', inputName: 'auth_port' },
  authSecret: { type: 'input', inputName: 'auth_secret' },
  acctServer: { type: 'input', inputName: 'acct_server' },
  acctPort: { type: 'input', inputName: 'acct_port' },
  acctSecret: { type: 'input', inputName: 'acct_secret' },
  key: { type: 'input', inputName: 'key' },

  // ieee80211r start
  ieee80211r: {
    on: { type: 'switch', inputName: 'ieee80211r', value: 'true' },
    off: { type: 'switch', inputName: 'ieee80211r', value: 'false' }
  },
  nasid: { type: 'input', inputName: 'nasid' },
  mobilityDomain: { type: 'input', inputName: 'mobility_domain' },
  reassociationDeadline: { type: 'input', inputName: 'reassociation_deadline' },
  ftOverDs: {
    overDS: { type: 'select', inputName: 'ft_over_ds', options: '1' },
    overAir: { type: 'select', inputName: 'ft_over_ds', options: '0' }
  },
  ftPskGenerateLocal: {
    on: { type: 'switch', inputName: 'ft_psk_generate_local', value: 'true' },
    off: { type: 'switch', inputName: 'ft_psk_generate_local', value: 'false' }
  },
  r0KeyLifetime: { type: 'input', inputName: 'r0_key_lifetime' },
  r1KeyHolder: { type: 'input', inputName: 'r1_key_holder' },
  pmkR1Push: {
    on: { type: 'switch', inputName: 'pmk_r1_push', value: 'true' },
    off: { type: 'switch', inputName: 'pmk_r1_push', value: 'false' }
  },
  r0kh: { type: 'list', inputName: 'r0kh' },
  r1kh: { type: 'list', inputName: 'r1kh' },
  // ieee80211r end

  eapType: {
    tls: { type: 'select', inputName: 'eap_type', options: 'tls' },
    ttls: { type: 'select', inputName: 'eap_type', options: 'ttls' },
    peap: { type: 'select', inputName: 'eap_type', options: 'peap' },
    fast: { type: 'select', inputName: 'eap_type', options: 'fast' }
  },

  // Certs start
  devFiles: {
    on: { type: 'switch', inputName: 'device_files', value: 'true' },
    off: { type: 'switch', inputName: 'device_files', value: 'false' }
  },
  caCertFile: { type: 'uploadFile', inputName: 'ca_cert', value: 'tests/cypress/fixtures/ca.cert.pem' },
  caCertSelect: { type: 'select', inputName: 'ca_cert', options: '/etc/certificates/signedCA.cert.pem' },
  clientCertFile: { type: 'uploadFile', inputName: 'client_cert', value: 'tests/cypress/fixtures/client.cert.pem' },
  clientCertSelect: { type: 'select', inputName: 'client_cert', options: '/etc/certificates/signedServer.cert.pem' },
  privKeyFile: { type: 'uploadFile', inputName: 'priv_key', value: 'tests/cypress/fixtures/ca.key.pem' },
  privKeySelect: { type: 'select', inputName: 'priv_key', options: '/etc/certificates/ca.key.pem' },
  privKeyPwd: { type: 'input', inputName: 'priv_key_pwd', value: 'password' },
  // Certs end

  auth: {
    eapGtc: { type: 'select', inputName: 'auth', options: 'EAP-GTC' },
    eapMd5: { type: 'select', inputName: 'auth', options: 'EAP-MD5' },
    eapMschapv2: { type: 'select', inputName: 'auth', options: 'EAP-MSCHAPV2' },
    eapTls: { type: 'select', inputName: 'auth', options: 'EAP-TLS' },
    pap: { type: 'select', inputName: 'auth', options: 'PAP' },
    chap: { type: 'select', inputName: 'auth', options: 'CHAP' },
    mschap: { type: 'select', inputName: 'auth', options: 'MSCHAP' },
    mschapv2: { type: 'select', inputName: 'auth', options: 'MSCHAPV2' }
  }, // option depends

  // Inner certs start
  devInFiles: {
    on: { type: 'switch', inputName: 'device_files2', value: 'true' },
    off: { type: 'switch', inputName: 'device_files2', value: 'false' }
  },
  caCert2File: { type: 'uploadFile', inputName: 'ca_cert2', value: 'tests/cypress/fixtures/ca.cert.pem' },
  caCert2Select: { type: 'select', inputName: 'ca_cert2', options: '/etc/certificates/signedCA.cert.pem' },
  clientCert2File: { type: 'uploadFile', inputName: 'client_cert2', value: 'tests/cypress/fixtures/client.cert.pem' },
  clientCert2Select: { type: 'select', inputName: 'client_cert2', options: '/etc/certificates/signedServer.cert.pem' },
  privKey2File: { type: 'uploadFile', inputName: 'priv_key2', value: 'tests/cypress/fixtures/ca.key.pem' },
  privKey2Select: { type: 'select', inputName: 'priv_key2', options: '/etc/certificates/ca.key.pem' },
  privKey2Pwd: { type: 'input', inputName: 'priv_key2_pwd', value: 'password' },
  // Inner certs stop

  identity: { type: 'input', inputName: 'identity' },
  anonymousIdentity: { type: 'input', inputName: 'anonymous_identity' },

  // MAC FILTER
  macfilter: {
    disabled: { type: 'select', inputName: 'macfilter', options: '' },
    allow: { type: 'select', inputName: 'macfilter', options: 'allow' },
    deny: { type: 'select', inputName: 'macfilter', options: 'deny' }
  },
  maclist: { type: 'multiselect', inputName: 'maclist' },
  // Looks like no devices has it with default firmware so can not test
  // macfilter2: {
  //   on: { type: 'switch', inputName: 'macfilter2', value: 'true' },
  //   off: { type: 'switch', inputName: 'macfilter2', value: 'false' },
  // },

  // BG scan
  // Advanced
  bgscanEnabled: {
    on: { type: 'switch', inputName: 'bgscan_enabled', value: 'true' },
    off: { type: 'switch', inputName: 'bgscan_enabled', value: 'false' }
  },
  // BG scan tab
  bgscanMode: {
    simple: { type: 'select', inputName: 'bgscan_mode', options: 'simple' },
    learn: { type: 'select', inputName: 'bgscan_mode', options: 'learn' }
  },
  shortInterval: { type: 'input', inputName: 'short_interval' },
  longInterval: { type: 'input', inputName: 'long_interval' },
  signalThresh: { type: 'input', inputName: 'signal_thresh' },

  // Multi AP
  multiple: {
    on: { type: 'switch', inputName: 'multiple', value: 'true' },
    off: { type: 'switch', inputName: 'multiple', value: 'false' }
  },
  scanTime: { type: 'input', inputName: 'scan_time' },

  multiAP: {
    ssid: { type: 'input', inputName: 'ssid' },
    key: { type: 'input', inputName: 'key' }
  }
}
