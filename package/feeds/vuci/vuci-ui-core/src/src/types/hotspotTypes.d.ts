export interface HotspotInstance {
  protocol: 'http' | 'https'
  mode: 'local' | 'radius' | 'mac_auth' | 'sso' | 'sms_otp'
  '.type': 'chilli'
  enabled: '0' | '1'
  uamport: string
  uamlisten: string
  uamlogoutip: string
  uamblocklist: '0' | '1'
  uamdomainfile?: string
  withchallenge: '0' | '1'
  network: string
  net: string
  dns1: string
  dns2: string
  noc2c: string
  mac_blocking: '0' | '1'
  moreif: string[]
  radiusauthport: string
  radiusacctport: string
  radiusrequiremessageauth: '0' | '1'
  landingpage: 'int' | 'ext'
  domain?: string
  subdomain?: string
  https_redirect: '0' | '1'
  registerusers: '0' | '1'
  trialusers: '0' | '1'
  usersignup?: string
  tos: '0' | '1'
  conup?: string
  condown?: string
  success: 'uam'
  oidcdiscoveryurl?: string
  oidcclientid?: string
  oidcclientsecret?: string
  id: string
  profile: string
  macauth: '0' | '1'
  duplicateusers: '0' | '1'
  enable_macpass: '0' | '1'
  macpass: string
  dynexpirationtime: string
  dyn_users_group: string
  uamserver: string
  uamsecret: string
  successOptions: string
  success_url: string
  trial_users_group: string
  device_files?: string
  sslcafile?: string
  device_sslcafile?: string
  sslkeyfile?: string
  device_sslkeyfile?: string
  sslcertfile?: string
  device_sslcertfile?: string
  radiusserver1?: string
  radiusserver2?: string
  radiusnasid?: string
  radiussecret?: string
  swapoctets?: '0' | '1'
  locationname?: string
  radiuslocationid?: string
  paramuamip?: string
  paramuamport?: string
  paramcalled?: string
  parammac?: string
  paramip?: string
  paramnasid?: string
  paramsessionid?: string
  paramuserurl?: string
  paramchallenge?: string
  param1?: string
  param1value?: string
  param2?: string
  param2value?: string
}
