import { useMainStore } from '@/stores/main'
import type { NatOffloadingConfig } from '@/types/natOffloadingTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useNotifications } from '@/stores/messages'
import { watchEffect, type Ref } from 'vue'

export function useNatOffloadingAlert(config: Ref<Partial<NatOffloadingConfig>>, currentPage: 'SQM' | 'QoS') {
  const $t = useTranslate()
  const store = useMainStore()
  const notification = useNotifications()

  watchEffect(() => {
    if (config.value.flow_offloading !== '1' || !store.board!.hwinfo.nat_offloading) return
    notification.error({
      id: 'nat_offloading',
      title: $t('%s will not work properly').format(currentPage),
      text: $t(`Disable 'NAT Offloading' on this device for %s to work properly.`).format(currentPage),
      action: { text: $t('Go to NAT offloading settings'), to: '/network/firewall/settings' }
    })
  })
}
