import { useTranslate } from '@ui-core/composables/useI18n'

export type AttackSection = SshAttack | HttpAttack | HttpsAttack | IcmpAttack | SynAttack | PortAttack

export interface GenericAttack {
  id: string
  [key: `${GenericAttack['id']}_limit`]: '1' | '0'
  limit: string
  limit_burst: string
  period: 'second' | 'minute' | 'hour' | 'day'
  limit_log_overlimit: '1' | '0'
}

export function isGenericAttack(attack: AttackSection): attack is SshAttack | HttpAttack | HttpsAttack | IcmpAttack {
  return isGenericAttackId(attack.id)
}

export function isGenericAttackId(id: AttackSection['id']): id is (SshAttack | HttpAttack | HttpsAttack | IcmpAttack)['id'] {
  return ['http', 'https', 'ssh', 'icmp'].includes(id)
}

export interface SshAttack extends GenericAttack {
  id: 'ssh'
}

export interface HttpAttack extends GenericAttack {
  id: 'http'
}

export interface HttpsAttack extends GenericAttack {
  id: 'https'
}

export interface IcmpAttack extends GenericAttack {
  id: 'icmp'
  enabled: '1' | '0'
}

export interface SynAttack {
  id: 'syn_flood'
  syn_flood: '1' | '0'
  synflood_rate: string
  synflood_burst: string
  tcp_syncookies: '1' | '0'
}

export interface PortAttack {
  id: 'port_scan'
  port_scan: '1' | '0'
  hitcount: string
  seconds: string
  x_max: '1' | '0'
  nmap_fin: '1' | '0'
  null_flags: '1' | '0'
  syn_fin: '1' | '0'
  syn_rst: '1' | '0'
}

export interface FormModel {
  port_scan?: PortAttack
  http?: HttpAttack
  https?: HttpsAttack
  ssh?: SshAttack
  icmp?: IcmpAttack
  syn_flood?: SynAttack
}

export function useCommon() {
  const $t = useTranslate()
  const parsedNames: Record<string, string> = {
    port_scan: $t('Port scan'),
    http: $t('HTTP flood'),
    https: $t('HTTPS flood'),
    ssh: $t('SSH flood'),
    icmp: $t('Ping flood'),
    syn_flood: $t('SYN flood')
  } satisfies Record<AttackSection['id'], string>
  return { parsedNames }
}
