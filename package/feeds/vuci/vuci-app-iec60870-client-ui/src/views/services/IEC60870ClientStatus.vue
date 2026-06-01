<template>
  <card-cell>
    <cell-row :label="$t('Status')">
      <template #value>
        <basic-status
          :status="{
            status: running ? $t('Running') : $t('Stopped'),
            type: running ? 'success' : 'error'
          }"
        />
      </template>
    </cell-row>

    <cell-row
      v-if="status?.state"
      :label="$t('State')"
      :value="stateTranslationTable[status?.state] || $t('Unknown')"
    />
  </card-cell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { type InstanceStatus } from './IEC60870ClientCommon'
import BasicStatus from '@/components/shared/BasicStatus'

const $t = useTranslate()
const props = defineProps<{ status?: InstanceStatus }>()

const running = computed(() => props.status !== undefined)

const stateTranslationTable = {
  Connected: $t('Connected'),
  Disconnected: $t('Disconnected'),
  'Connected, STARTDT CON received': $t('Connected'),
  'Connected, STOPDT CON received': $t('Connected'),
  Failed: $t('Failed')
}
</script>
