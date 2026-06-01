import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { reconnect } from '@ui-core/plugins/helper'
import type { PackageActions, PackageActionOptions, PromptContext } from '@/types/packageTypes'

export function usePackageFollowUpActions() {
  const $t = useTranslate()
  const store = useMainStore()
  const message = useMessages()

  const followUpActions: PackageActions = {
    reboot: () => {
      const options = {
        spinMessage: $t('Rebooting'),
        endpoint: '/api/system/actions/reboot',
        errorMessage: $t('Failed to start device reboot')
      }
      return {
        options,
        prompt: {
          title: $t('Device reboot'),
          subtitle: $t('This package requires a device reboot. Reboot now?'),
          submitText: $t('Reboot'),
          submitAction: () => handleFollowUpAction(options),
          icon: 'warning'
        }
      }
    },
    network_restart: () => {
      const options = {
        spinMessage: $t('Network is restarting'),
        endpoint: '/api/system/actions/network_restart',
        errorMessage: $t('Failed to start network restart')
      }
      return {
        options,
        prompt: {
          title: $t('Network restart'),
          subtitle: $t('This package requires a network restart. Restart now?'),
          submitText: $t('Restart'),
          submitAction: () => handleFollowUpAction(options),
          icon: 'warning'
        }
      }
    }
  }

  const followUpActionList = Object.keys(followUpActions)

  function getFollowUpAction(promptContext: PromptContext) {
    const promptContextKeys = Object.keys(promptContext)
    return followUpActionList.find(action => promptContextKeys.includes(action) && promptContext[action as keyof PromptContext])
  }

  function handleFollowUpAction(actionOptions: PackageActionOptions) {
    const { spinMessage = $t('Reconnecting...'), errorMessage, endpoint } = actionOptions
    store.spin(spinMessage)
    return axios
      .post(endpoint)
      .then(() => reconnect(spinMessage, { logout: false }))
      .catch(() => {
        store.spin(false)
        message.error(errorMessage)
      })
  }

  return {
    followUpActions,
    followUpActionList,
    getFollowUpAction,
    handleFollowUpAction
  }
}
