<template>
  <vuci-form-item-select
    v-if="isSmsView"
    :uci-section="s"
    name="authorization"
    :label="$t('Authorization method')"
    :help="
      $t(
        'When a message is received, its authenticity will be checked based on the selection in this field. \'SMS Rules\' can be authorized either by the device\'s password, custom password, serial number or no authentication at all.'
      )
    "
    :options="getAuthorizationOptions"
    :warnings="getAuthorizationWarning"
    initial="password"
  />
  <vuci-form-item-input
    v-if="isSmsView"
    :uci-section="s"
    name="password"
    :label="$t('Password')"
    rules="root_password"
    minlength="8"
    password
    sensitive
    :required="s.enabled === '1'"
    :depend="s.authorization === 'local'"
    maxlength="80"
    can-randomize
  />

  <vuci-form-item-select
    :uci-section="s"
    name="allowed_phone"
    :label="$t('Allowed number(s)')"
    :help="$t('Phone numbers which are allowed to trigger the rule.')"
    :options="phoneTypes"
  />
  <vuci-form-item-input
    :uci-section="s"
    :label="$t('Phone number')"
    :help="$t('A phone number that will be allowed to trigger the rule. The number must be specified in full format, country code included (e.g., +37000000000).')"
    name="tel"
    rules="phonedigit"
    placeholder="+37000000000"
    :depend="s.allowed_phone === 'single'"
    :required="s.enabled === '1'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="group"
    :label="$t('Phone group')"
    :options="userGroupOptions"
    :depend="s.allowed_phone === 'group'"
    :required="s.enabled === '1'"
  >
    <template #help>
      {{ $t("Recipient's phone number users group. Configure it") }}
      <router-link to="/system/admin/group/phone"> {{ $t('here') }} </router-link>.
    </template>
  </vuci-form-item-select>
</template>
<script setup lang="ts">
import { inject } from 'vue'
import { useMobileUtilitiesAuthorization } from '@/composables/useMobileUtilitiesAuthorization'
import type { SmsUtilitiesSection, CallUtilitiesSection } from '@/types/mobileUtilitiesTypes'

interface AuthorizationProps {
  s: SmsUtilitiesSection | CallUtilitiesSection
}

defineProps<AuthorizationProps>()
const isSmsView = inject<boolean>('isSmsView') || false

const { getAuthorizationOptions, getAuthorizationWarning, phoneTypes, userGroupOptions } = useMobileUtilitiesAuthorization()
</script>
