import { i18n } from '@ui-core/plugins/i18n'
import type { MwanPolicy, MwanStatusInterface, MwanMember } from '@/types/mwanTypes'

export const mwan = {
  staticPolicyOpts() {
    return [
      ['unreachable', i18n.t('Unreachable (Reject)')],
      ['blackhole', i18n.t('Blackhole (Drop)')],
      ['default', i18n.t('Default (Use main routing table)')]
    ]
  },

  getPrettyMode(mode?: string) {
    const modes: Record<string, string> = {
      mwan: i18n.t('Failover'),
      balance: i18n.t('Load Balancing')
    }
    return mode ? modes[mode] || mode : ''
  },

  /**
   * parses mwan status
   * code - mwan status code
   */
  parseStatus(code: string): { info: string; style: string } {
    const statusMessages: Record<string, { info: string; style: string }> = {
      online: {
        // interface has internet
        info: i18n.t('Online'),
        style: 'success'
      },
      standby: {
        // interface has internet but there is other online interface
        info: i18n.t('Standby'),
        style: 'text-theme-text-warning'
      },
      offline: {
        // interface has no internet
        info: i18n.t('Offline'),
        style: 'error'
      },
      disconnecting: {
        // mwan interface is disconnecting
        info: i18n.t('Offline'),
        style: 'error'
      },
      connecting: {
        // mwan interface is connecting
        info: i18n.t('Offline'),
        style: 'error'
      },
      disabled: {
        // network interface is disabled
        info: i18n.t('Offline'),
        style: 'error'
      },
      notracking: {
        // mwan interface is disabled
        info: i18n.t('Disabled'),
        style: ''
      },
      starting: {
        info: i18n.t('Starting'),
        style: 'text-theme-text-warning'
      },
      default: {
        info: '-',
        style: ''
      }
    }
    return statusMessages[code] ?? statusMessages.default
  },

  statusComparator(a: Partial<MwanStatusInterface & MwanMember>, b: Partial<MwanStatusInterface & MwanMember>) {
    if (a.metric !== b.metric) return parseInt(a.metric || '1') - parseInt(b.metric || '1')
    else if ((a.load_balance || b.load_balance) && a.load_balance !== b.load_balance) return (b.load_balance ?? 0) - (a.load_balance ?? 0)
    const order = { online: 1, standby: 2, starting: 3, offline: 4, disabled: 5, notracking: 6 }
    const aOrder = a.status ? order[a.status] : 0
    const bOrder = b.status ? order[b.status] : 0
    return aOrder - bOrder
  }
}
