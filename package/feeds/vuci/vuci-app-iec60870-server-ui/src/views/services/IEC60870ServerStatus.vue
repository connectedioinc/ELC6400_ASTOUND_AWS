<template>
  <card-cell>
    <cell-row :label="$t('Status')">
      <template #value>
        <basic-status
          :status="{
            status: running ? $t('Running') : $t('Stopped'),
            type: running ? 'success' : 'error',
            help: errorString
          }"
        />
      </template>
    </cell-row>

    <cell-row
      v-if="status?.connected_clients"
      :label="$t('Connected clients')"
      :value="status?.connected_clients"
    />

    <cell-row
      v-if="linkLayerStateString"
      :label="$t('Link layer state')"
      :value="linkLayerStateString"
    />
  </card-cell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { instanceErrorLookup, linkLayerStateLookup, type InstanceStatus } from './IEC60870ServerCommon'
import BasicStatus from '@/components/shared/BasicStatus.vue'

const $t = useTranslate()

const props = defineProps<{ status?: InstanceStatus }>()

const errorString = computed(() => instanceErrorLookup[props.status?.error])
const linkLayerStateString = computed(() => linkLayerStateLookup[props.status?.link_layer_state])

const running = computed(() => {
  return props.status !== undefined && props.status.error === undefined
})
</script>
