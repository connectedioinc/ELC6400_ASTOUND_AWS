<template>
  <span class="flex flex-row items-center gap-2">
    <slot></slot>
    <tlt-hint
      v-if="hintMessage"
      :hints="[{ info: hintMessage }]"
      rawhtml
    >
      <tlt-icon
        icon="warning"
        class="text-theme-text-warning size-5"
      />
    </tlt-hint>
  </span>
</template>

<script lang="ts" setup>
import { useUniversalGatewayUtils } from '@/composables/useUniversalGatewayUtils'
import type { TagConsumer } from '@/types/tagTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import { computed } from 'vue'

const $t = useTranslate()
const { serverServiceInfo } = useUniversalGatewayUtils()

export interface DataSourceHintProps {
  tagConsumingServices: TagConsumer[] | undefined
  isOverlapping?: boolean
}

const props = defineProps<DataSourceHintProps>()

const messageTemplates = {
  usedDataSource: $t('Request is used as a data source in %s service(s). Updating or deleting it may invalidate configurations in data sources.'),
  overlap: $t("Request can't be tested as its address range overlap with the one used in protocol's counterpart server data sources.")
}

const displayedServices = computed(() => [...new Set(props.tagConsumingServices)])
const hintMessage = computed(() => {
  let message = ''

  if (displayedServices.value.length > 0) {
    message = messageTemplates.usedDataSource.format(displayedServices.value.map(service => `<a href='${serverServiceInfo[service].route}'>${serverServiceInfo[service].translation}</a>`).join(', '))
  }

  if (props.isOverlapping) message = addAdditionalMessage(message, messageTemplates.overlap)

  return message
})

function addAdditionalMessage(message: string, additionalMessage: string) {
  if (message) message += '<br/><br/>'

  return message + additionalMessage
}
</script>
