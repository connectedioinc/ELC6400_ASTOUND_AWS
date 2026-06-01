import type { RuleConfig } from '@/types/routeTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { FwRuleValue, HintValue } from '@/components/network/firewall/FwRuleValue.vue'
import { type Props as FwRuleProps } from '@/components/network/firewall/FwRule.vue'
import { ipv4Utils as ipUtils } from '@/utils/ipUtils'
import { utils } from '@/plugins/utils'

export function useRouteRuleParser() {
  const $t = useTranslate()
  const tosOptions: Record<string, string> = {
    '2': $t('Minimize-Cost'),
    '4': $t('Maximize-Reliability'),
    '8': $t('Maximize-Troughput'),
    '16': $t('Minimize-Delay')
  }
  function parseMatch(config: RuleConfig) {
    const rows: FwRuleProps[] = []
    const scrCdir = config.src
    const srcNetwork = config.src ? { reverse: true, name: $t('network'), values: [{ value: ipUtils.getSubnet(scrCdir), hint: ipUtils.cidrToRange(scrCdir).join(' - ') }] } : undefined
    const srcNetworkAll = !config.src ? { reverse: true, name: $t('networks'), values: [{ value: $t('all') }] } : undefined
    const srcIface = config.in && config.in !== 'any' ? { andSeperator: $t('in'), reverse: true, name: $t('interface'), values: [{ value: config.in }] } : undefined

    const dstCdir = config.dest
    const dstNetwork = config.dest ? { reverse: true, name: $t('network'), values: [{ value: ipUtils.getSubnet(dstCdir), hint: ipUtils.cidrToRange(dstCdir).join(' - ') }] } : undefined
    const dstIface = config.out && config.out !== 'none' ? { andSeperator: $t('in'), reverse: true, name: $t('interface'), values: [{ value: config.out }] } : undefined

    const tos = config.tos && config.tos !== '0' ? { name: 'TOS', values: [{ value: config.tos, hint: tosOptions[config.tos] }] } : undefined
    const fwmark = config.mark ? { andSeperator: true, name: 'fwmark', values: [{ value: config.mark }] } : undefined

    rows.push({ where: $t('From'), values: [srcNetwork, srcNetworkAll, srcIface].filter(utils.notEmpty) })
    rows.push({ where: $t('to'), values: [dstNetwork, dstIface].filter(utils.notEmpty) })
    rows.push({ where: $t('match'), values: [tos, fwmark].filter(utils.notEmpty) })
    if (config.invert === '1') rows.push({ where: '', values: [{ values: [{ value: $t('(Inverted match)') }] }] })

    return rows
  }

  const actionsTypes: Record<string, HintValue> = {
    prohibit: {
      hint: $t('Respond with ICMP prohibited messages and abort route lookup.'),
      value: $t('Prohibit')
    },
    unreachable: {
      hint: $t('Respond with ICMP unreachable messages and abort route lookup.'),
      value: $t('Unreachable')
    },
    blackhole: { hint: $t('Drop packet and abort route lookup.'), value: $t('Blackhole') },
    throw: {
      value: $t('Throw'),
      hint: $t('Stop lookup in the current routing table even if a default route exists.')
    }
  }
  function parseAction(config: RuleConfig): FwRuleValue {
    if (config.action && actionsTypes[config.action]) return { values: [actionsTypes[config.action] ?? { value: config.action }] }
    if (config.goto) return { name: $t('Go to rule'), values: [{ value: config.goto.toString() }] }
    if (config.lookup && config.lookup !== 'nil') {
      return { name: $t('Lookup table'), values: [{ value: config.lookup }] }
    }
    return { name: '-', values: [] }
  }
  return {
    parseMatch,
    parseAction
  }
}
