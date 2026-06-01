import type { DhcpV4Config, DhcpStatus, DhcpV6Config } from '@/types/dhcpTypes'

export function getDhcpStatus(dhcpData: DhcpV4Config | DhcpV6Config, dhcpStatus: DhcpStatus[]): '' | 'running' | number {
  const status = dhcpStatus.find(status => status.id === dhcpData.id)
  if (!status) return ''
  if (status.running) return 'running'
  if (status.errors && status.errors.length > 0) {
    return status.errors.sort((a, b) => a.error - b.error)[0].error
  }
  return ''
}
