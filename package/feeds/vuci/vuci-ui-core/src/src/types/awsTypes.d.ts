export interface AwsJobConfig {
  id: string
  enabled: string
  thing_name: string
  endpoint: string
  cafile: string
  'cafile:file_size'?: number
  aws_provisioning_id: string
  certfile: string
  'certfile:file_size'?: number
  keyfile: string
  'keyfile:file_size'?: number
  mqtt_port: string
  mqtt_qos: string
  mqtt_keepalive: string
  mqtt_max_loops: string
  status: string
}

export interface AwsJobStatus {
  id: string
  state: string
  state_id: number
}

export interface AwsProvisioningConfig {
  id: string
  template: string
  type: string
  creation_type: string
  certfile: string
  keyfile: string
  access_key: string
  secret_key: string
  param: string[][]
}
