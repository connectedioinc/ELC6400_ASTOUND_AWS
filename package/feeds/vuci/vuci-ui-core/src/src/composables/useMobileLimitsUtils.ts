import { useTranslate } from '@ui-core/composables/useI18n'
import { localDate } from '@ui-core/plugins/date'
import type { Interface } from '@/types/networkTypes'

export interface SimSwitch {
  id: string
  modem: string
  enabled: '0' | '1'
  data_limit: '0' | '1'
  sms_limit: '0' | '1'
  no_network: '0' | '1'
  on_signal: '0' | '1'
  position: string
  roaming: '0' | '1'
  denied: '0' | '1'
  fail_flag: '0' | '1'
  interval?: string
  retry_count?: string
  switch_back?: string
  enable_back?: '0' | '1'
  weak_signal?: string
  data_fail?: '1' | '2'
  data_fail_host?: string
  data_fail_timeout?: '1' | '2' | '3' | '4' | '5' | '10'
  esim_profile?: string
}
export interface SmsLimit {
  id: string
  modem: string
  enable_sms_limit: '0' | '1'
  sms_limit_num: string
  sms_limit: 'day' | 'week' | 'month'
  period: string
  position: string
  esim_profile?: string
}

export const useMobileLimitsUtils = () => {
  const $t = useTranslate()
  const resetPeriodOptions = [
    ['day', $t('Day')],
    ['week', $t('Week')],
    ['month', $t('Month')]
  ]
  const dayOptions = [
    ['1', $t('Monday')],
    ['2', $t('Tuesday')],
    ['3', $t('Wednesday')],
    ['4', $t('Thursday')],
    ['5', $t('Friday')],
    ['6', $t('Saturday')],
    ['0', $t('Sunday')]
  ]

  function numberOptions(start: number, end: number, showMinutes: boolean) {
    const options = []
    for (let i = start; i <= end; i++) showMinutes ? options.push([i.toString(), '%s:00'.format(i < 10 ? 0 + i.toString() : i.toString())]) : options.push(i.toString())
    return options
  }

  function nextClearDue(period: string, reset: number, timestamp: number) {
    const current = localDate(timestamp, { format: 'YYYY MM DD HH' })
    if (current === '-') return current

    const [year, month, day, hour] = current.split(' ').map(Number)

    if (period === 'day') {
      const newDate = new Date(Date.UTC(year, month - 1, hour >= reset ? day + 1 : day, reset))
      return newDate.toLocaleString('lt-LT', { timeZone: 'UTC' })
    }
    if (period === 'week') {
      const date = new Date(Date.UTC(year, month - 1, day))
      const newDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + ((7 + reset - date.getDay()) % 7)))
      if (newDate <= date) newDate.setDate(newDate.getDate() + 7)
      return newDate.toLocaleString('lt-LT', { timeZone: 'UTC' })
    }
    const newMonth = day < reset && day !== new Date(Date.UTC(year, month, 0)).getDate() ? month - 1 : month
    const daysInMonth = new Date(Date.UTC(year, newMonth + 1, 0)).getDate()
    return new Date(Date.UTC(year, newMonth, reset > daysInMonth ? daysInMonth : reset)).toLocaleString('lt-LT', { timeZone: 'UTC' })
  }

  function checkSimSwitchSmsRule(section: SmsLimit, simSwitch: SimSwitch[]) {
    const sim = simSwitch.find(sim => sim.modem === section.modem && sim.position === section.position && sim.esim_profile === section.esim_profile)
    if (sim && sim.enabled === '1' && sim.sms_limit === '1') return { isValid: false, message: $t('Cannot disable because SIM switch rule enabled') }
    return { isValid: true }
  }

  function checkSimSwitchDataRule(section: Interface, simSwitch: SimSwitch[]) {
    const sim = simSwitch.find(sim => sim.modem === section.modem && sim.position === section.sim && sim.esim_profile === section.esim_profile)
    if (sim && sim.enabled === '1' && sim.data_limit === '1') return { isValid: false, message: $t('Cannot disable because SIM switch rule enabled') }
    return { isValid: true }
  }

  return {
    resetPeriodOptions,
    dayOptions,
    numberOptions,
    nextClearDue,
    checkSimSwitchSmsRule,
    checkSimSwitchDataRule
  }
}
