export interface WifiDevice {
  id: string
  enabled: string
  hwmode: string
  channel: string
  htmode: string
  tx_power: string
  legacy_rates: string
  distance: string
  frag: string
  rts: string
  noscan: string
  beacon_int: string
  acs_exclude_dfs: string
}

export interface WifiDeviceGlobal {
  country: string
  location: 'any' | 'outdoor'
}

export interface WifiDeviceStatus {
  id: string
  disabled: boolean
  standard: string
  pending: boolean
  channel: number
  up: boolean
  frequency: number
  band: string
  macaddr: string
  type: 'ralink' | 'qcawifi' | 'nl80211'
  txpower: number
}

export interface WifiInterface {
  id: string
  wifi_id: string
  enabled: string
  device: string[]
  /** @default AP - if device has only one mode */
  mode?: 'mesh' | 'ap' | 'multi_ap' | 'sta'
  mesh_id: string
  ssid: string
  bssid: string
  network: string
  hidden: string
  wmm: string
  encryption: string
  cipher: string
  key: string
  'key:set'?: '1' | '0'
  auth_server: string
  auth_port: string
  auth_secret: string
  'auth_secret:set'?: '1' | '0'
  acct_server: string
  acct_port: string
  acct_secret: string
  'acct_secret:set'?: '1' | '0'
  ieee80211r: string
  nasid: string
  mobility_domain: string
  reassociation_deadline: string
  ft_over_ds: string
  eap_type: string
  devFiles: string
  ca_cert: string
  client_cert: string
  priv_key: string
  priv_key_pwd: string
  'priv_key_pwd:set'?: '1' | '0'
  ca_cert2: string
  client_cert2: string
  priv_key2: string
  priv_key2_pwd: string
  'priv_key2_pwd:set'?: '1' | '0'
  auth: string
  identity: string
  anonymous_identity: string
  password: string
  'password:set'?: '1' | '0'
  pkcs_passwd: string
  'pkcs_passwd:set'?: '1' | '0'
  macfilter: string
  maclist: string[]
  delete_from_whitelist: string
  mesh_fwding: string
  mesh_rssi_threshold: string
  isolate: string
  short_preamble: string
  dtim_period: string
  wpa_group_rekey: string
  skip_inactivity_poll: string
  max_inactivity: string
  max_listen_interval: string
  disassoc_low_ack: string
  device_files: string
  device_files2: string
  wds: string
  trm_enabled: string
  bgscan_enabled: string
  bgscan_mode: string
  short_interval: string
  long_interval: string
  signal_thresh: string
  scan_time: string
  auto_reconnect: string

  '.type': 'wifi-iface'
  radius_ppsk?: '1' | '0'
  vlan_tagged_interface?: string
  dynamic_vlan?: 'disabled' | 'optional' | 'required'
  radius_ppsk_mode?: 'mac_auth' | 'freeradius' | 'teltonika'
}

export interface WifiVlan {
  id: string
  '.type': 'wifi-vlan'
  description: string
  network: string
  vid: string
  iface: string
}

export interface WifiPpskGroup {
  id: string
  '.type': 'psk-group'
  description: string
}

export interface WifiStation {
  id: string
  '.type': 'wifi-station'
  username: string
  mac?: string
  key: string
  vid?: string
  psk_group?: string
}

export interface WifiAp {
  id: string
  enabled: string
  ssid: string
  priority: string
  key: string
  'key:set'?: '1' | '0'
}

export interface WifiInterfaceStatus {
  encryption: string
  status: '1' | '0'
  mode: string
  ssid?: string
  id: string
  wifi_id: string
  num_assoc: number
  name: string
  mesh_id?: string
  up: boolean
  // There is rare error that client array could have null value (#21295). Root cause was not found so it is required to filter this array before using.
  clients?: Array<WifiInterfaceStatusClients | null>
  assoclist?: Record<string, WifiInterfaceStatusAssoc>
  devices: WifiInterfaceStatusDevices[]
  wpa_state?: string
  disconnect_reason?: number
  auth_status?: number
}

export interface WifiInterfaceStatusDevices {
  up: boolean
  signal: number
  quality: number
  noise: number
  bssid?: string
  ifname: string
  name: string
  band: string
  channel?: number
  dfs?: WifiInterfaceStatusDfs
}

export interface WifiInterfaceStatusAssoc {
  rx_vht: boolean
  rx_mhz: number
  tx_short_gi: boolean
  tx_packets: number
  rx_he: boolean
  rx_packets: number
  tx_he: boolean
  rx_ht: boolean
  tx_mcs: number
  noise: number
  tx_rate: number
  inactive: boolean
  tx_40mhz: boolean
  tx_mhz: number
  tx_vht: boolean
  tx_ht: boolean
  rx_rate: number
  signal: number
  device: string
}

export interface WifiInterfaceStatusClients {
  expires?: number
  ipaddr?: string
  hostname?: string
  tx_rate: number
  band: string
  macaddr: string
  rx_rate: number
  signal: string
  device: string
  vlan?: string
  vid?: string
  network?: string
  username?: string
}

export interface WifiInterfaceStatusDfs {
  cac_active: boolean
  cac_seconds: number
  /** Undefined on CAP700 due driver limitations */
  cac_seconds_left?: number
}

export interface WifiDeviceOptions {
  id: string
  features: {
    hostapd: boolean
    supplicant: boolean
    encryption: {
      sta_80211r: boolean
      sta_sae: boolean
      sta_owe: boolean
      ap_owe: boolean
      sta_eap192: boolean
      ap_sae: boolean
      ap_eap192: boolean
      '80211r': boolean
      sta_eap: boolean
      ap_eap: boolean
    }
  }
  options: {
    countrylist: {
      alpha2: string
      ccode: string
      name: string
    }[]
    freqlist: {
      channel: number
      mhz: number
      restricted: boolean
      indoor_only: boolean
    }[]
    htmodelist: Record<string, boolean>
    hwmodelist: Record<string, boolean>
    txpwrlist: {
      dbm: number
      mw: number
    }[]
  }
}

export interface ScanResult {
  quality_max: number
  ssid: string
  encryption: {
    enabled: boolean
    wpa: number[]
    ciphers: string[]
    authentication: string[]
    wep: string[]
  }
  bssid: string
  encryption_description: string
  channel: number
  /** ht_operation becomes undefined when AP using legacy mode.  */
  ht_operation?: {
    secondary_channel_offset: 'below' | 'above' | 'no secondary'
    channel_width: number
    primary_channel: number
  }
  vht_operation?: {
    center_freq_1: number
    center_freq_2: number
    channel_width: number
  }
  mode: 'Unknown' | 'Access Point' | 'Ad-Hoc' | 'Client' | 'Access Point (VLAN)' | 'WDS' | 'Mesh Point' | 'P2P Client' | 'P2P Go'
  quality: number
  signal: number
}

export interface PreparsedScanResults extends ScanResult {
  band: string
}

export interface ParsedScanResults extends PreparsedScanResults {
  channel_width: number
  channel_center: number
}
