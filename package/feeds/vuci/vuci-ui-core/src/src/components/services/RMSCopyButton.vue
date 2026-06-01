<template>
  <td class="pr-0!">
    <div class="flex items-center gap-1 -my-2">
      {{ copyValue || '-' }}
      <tlt-icon
        v-if="copyValue"
        :id="buttonId"
        icon="copy"
        class="text-theme-text-primary size-5 cursor-pointer"
        @click="copyToClipboard(copyValue)"
      />
      <tlt-tooltip
        v-if="copyValue"
        :target="`#${buttonId}`"
        placement="left"
        triggers="click"
      >
        {{ $t('Copied!') }}
      </tlt-tooltip>
    </div>
  </td>
</template>

<script setup lang="ts">
import { copyToClipboard } from '@ui-core/plugins/helper'

defineProps<{
  copyValue: string
  buttonId: string
}>()
</script>
