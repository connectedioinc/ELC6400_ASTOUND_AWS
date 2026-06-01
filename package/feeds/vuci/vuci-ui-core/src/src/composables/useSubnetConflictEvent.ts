import { useMessages, useNotifications } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { ipv4Utils } from '@/utils/ipUtils'
import type { InterfaceStatus } from '@/types/networkTypes'

export function useSubnetConflictEvent() {
  const $t = useTranslate()
  const message = useMessages()
  const notification = useNotifications()
  async function handleSubnetConflictEvent(event: any) {
    return axios
      .get<InterfaceStatus[]>('/api/interfaces/basic/status')
      .catch(() => {
        message.error($t('Failed to load interface status'))
      })
      .then(response => {
        if (!response?.data) return
        const hasConflict = response.data.some((a, _, arr) =>
          arr.some(b => a.area_type !== b.area_type && a.ipaddrs?.[0] && b.ipaddrs?.[0] && ipv4Utils.areSubnetsOverlapping(a.ipaddrs?.[0], b.ipaddrs?.[0]))
        )
        if (!hasConflict) return
        notification.info({
          id: 'subnet_conflict',
          text: $t('Some of the network subnets are conflicting.'),
          action: {
            text: $t('Open LAN page'),
            to: '/network/lan'
          }
        })
      })
  }
  return { handleSubnetConflictEvent }
}
