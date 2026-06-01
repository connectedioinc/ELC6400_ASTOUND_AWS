export interface DohGlobal {
  enabled: '1' | '0'
}

export interface DohProxy {
  resolver_url: string
  bootstrap_dns: string[]
  listen_port: string
}

export interface DohFrontProxy extends DohProxy {
  preset: string
}

export type DohProxyPresets = Omit<DohProxy, 'listen_port'>
