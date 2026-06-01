<template>
  <div class="flex flex-col gap-2 items-start">
    <drag-hint
      v-if="dragAndDrop"
      :element-name="$t('rules')"
    />
    <div class="font-sans text-caption">
      <div>{{ $t('Only the first packet of connection is usually counted due to stateful packet inspection (SPI). This also affects connectionless protocols.') }}</div>
      <string-with-links
        class="whitespace-pre-wrap"
        :text="
          $t('For active connections check %s page%s.').format(
            formatLink('/status/realtime/connections', $t('Connection Status')),
            $store.hasPackages('vuci-app-network-usage-ui.control') ? ` ${$t('and for history — %s page').format(formatLink('/status/network/network_usage'))}` : ''
          )
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DragHint from '@/components/shared/DragHint.vue'
import StringWithLinks, { formatLink } from '@/components/shared/StringWithLinks.vue'

defineProps<{ dragAndDrop?: boolean }>()
</script>
