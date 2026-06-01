<template>
  <vuci-form-item-input
    :uci-section="uciSection"
    name="retry_count"
    :label="$t('Action retry count')"
    :help="$t('Retry sending the same data the configured number of times upon failure.')"
    rules="irange(0, 16)"
    placeholder="16"
    initial="0"
    :depend="isTypeSelected"
  />
  <vuci-form-item-input
    :uci-section="uciSection"
    name="retry_timeout"
    :label="$t('Action retry timeout')"
    :help="$t('Timeout in seconds between action retry attempts.')"
    rules="irange(0, 60)"
    initial="0"
    placeholder="60"
    :depend="isTypeSelected"
  />
</template>
<script setup lang="ts">
import type { UCISection } from '@ui-core/types'
defineProps<{ uciSection: UCISection; isTypeSelected: boolean }>()
</script>
