<template>
  <basic-status :status="dhcpStatuses[statusCode ?? 'default']" />
</template>

<script lang="ts" setup>
import BasicStatus, { type Status } from '@/components/shared/BasicStatus.vue'
import { useTranslate } from '@ui-core/composables/useI18n'

defineProps<{ statusCode: string | number }>()

const $t = useTranslate()

const dhcpStatuses = {
  running: {
    status: $t('Running'),
    type: 'success'
  },
  1: {
    status: $t('Error'),
    type: 'error',
    help: $t('Unexpected error: check system logs.')
  },
  2: {
    status: $t('Disabled')
  },
  // In theory it could also mean unexpected error
  3: {
    status: $t('Interface offline'),
    type: 'warning'
  },
  4: {
    status: $t('Interface offline'),
    type: 'warning'
  },
  5: {
    status: $t('Error'),
    type: 'error',
    help: $t("Another DHCP server was detected on the same network. To prevent IP collisions this server was disabled. Enable the 'Force' option to override this behavior.")
  },
  default: undefined
} as Record<string | number, Status>
</script>
