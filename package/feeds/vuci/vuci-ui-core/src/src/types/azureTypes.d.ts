export interface AzureConfig {
  enabled: '0' | '1'
  id: string
  name: string
  connection_type?: 'iothub' | 'provisioning'
  connection_string?: string
  registration_id?: string
  id_scope?: string
  global_prov_uri?: string
  direct_methods_enabled: '0' | '1'
  attestation_mechanism: 'x509_certificate' | 'symmetric_key'
  x509certificate: string
  x509privatekey: string
}

export interface AzureStatus {
  id: string
  name: string
  connection_status: string
  connection_status_reason: string
}

export interface AzureFormData {
  azure_iothub: AzureConfig[]
}
