export interface DnsConfig {
  server: string[]
  logqueries: '0' | '1'
  address: string[]
  rebind_protection: '0' | '1'
  localservice: '0' | '1'
  interface: string[]
  notinterface: string[]
  boguspriv: '0' | '1'
  localise_queries: '0' | '1'
  cachesize: string
}
