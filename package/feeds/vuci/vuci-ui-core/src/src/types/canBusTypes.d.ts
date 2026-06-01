export type TcpTlsVersion = 'tlsv1.2' | 'tlsv1.3' | 'all'
export type UdpTlsVersion = 'dtlsv1.2'

export interface ProtocolType {
  TCP: 'tcp'
  UDP: 'udp'
}

export interface CanBusGatewayConfig {
  '.type': 'can_gw'
  id: string
  enabled?: '1' | '0'
  name?: string

  device: string
  bitrate?: string

  protocol?: ProtocolType[keyof ProtocolType]
  raw?: '1' | '0'
  mode?: 'server' | 'client' | 'client_server'
  remove_all_zeros?: '1' | '0'
  address_connect?: string[]
  timeout?: string
  max_clients?: string
  always_reconnect?: '1' | '0'
  keepalive_enabled?: '1' | '0'
  keepalive_time?: string
  keepalive_interval?: string
  keepalive_probes?: string
  port_listen?: string
  tcp_echo_enabled?: '1' | '0'
  predefined_address?: string[]

  use_tls?: '1' | '0'
  tls_version?: TcpTlsVersion | UdpTlsVersion
  tls_type?: 'cert' | 'psk'
  require_certificate?: '1' | '0'
  verify_host?: '1' | '0'
  identity?: string
  psk?: string
  device_sec_files?: '1' | '0'
  cert_file?: string
  key_file?: string
  ca_file?: string
}

export interface CanBusStatus {
  section: string
  uptime?: number
  connected_clients?: number
  connected_servers?: number
  rx?: number
  tx?: number
  last_time_data_sent?: string

  error_code?: number
}
