import { computed, inject } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { type Ref, ref } from 'vue'
import type { MobileUtilitiesOptions, AuthorizationOptions } from '@/types/mobileUtilitiesTypes'

export function useMobileUtilitiesAuthorization() {
  const mobileUtilitiesOptions = inject<Ref<MobileUtilitiesOptions>>('mobileUtilitiesOptions') || ref({ userGroups: [] })

  const $t = useTranslate()

  const authorizationMethods = {
    no: $t('No authorization'),
    serial: $t('By device serial number'),
    password: $t('By device admin password'),
    local: $t('By password')
  }

  const phoneTypes = [
    ['all', $t('From all numbers')],
    ['group', $t('From group')],
    ['single', $t('From single number')]
  ]

  const userGroupOptions = computed(() => {
    return mobileUtilitiesOptions.value.userGroups?.map(group => group.name) || []
  })

  function getAuthorizationOptions() {
    return Object.entries(authorizationMethods).map(([key, value]) => [key, value])
  }

  function getAuthorizationWarning(value: AuthorizationOptions) {
    if (value === 'no') return $t('No authentication is insecure and may put your device at risk!')
    if (value === 'serial') return $t('Serial number is not considered a secure authentication method. Your device may be at risk!')
  }

  return {
    authorizationMethods,
    phoneTypes,
    userGroupOptions,
    getAuthorizationOptions,
    getAuthorizationWarning
  }
}
