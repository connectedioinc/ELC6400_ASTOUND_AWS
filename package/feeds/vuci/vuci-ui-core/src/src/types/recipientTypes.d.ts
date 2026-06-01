export interface PhoneGroup {
  name: string
  id: string
  tel: string[]
}

export interface EmailGroup {
  name: string
  id: string
  credentials?: '0' | '1'
  secure_conn?: '0' | '1'
  do_not_verify?: '0' | '1'
  smtp_ip?: string
  smtp_port?: string
  senderemail?: string
  username?: string
  password?: string
}
