export type GeneratingCerts = {
  id: string
  fullname: string
  type?: string
  datetime?: string
  name?: string
  cert_type?: string
  key_size?: string
}

export type GeneratedCertAddons = {
  type: 'cert' | 'key' | 'dh'
  name: string
  cert_type: 'client' | 'server' | 'ca' | 'import' | 'letsencrypt' | 'scep' | 'root_ca'
  key_size: string
  fullname: string
  pass_required?: boolean
  path: string
  encryption?: string
  tpm2?: boolean
  services?: string[]
}

export type GeneratedCert = GeneratingCerts & GeneratedCertAddons

export interface CertConfig {
  generated: GeneratedCert[]
  generating: GeneratingCerts[]
}
