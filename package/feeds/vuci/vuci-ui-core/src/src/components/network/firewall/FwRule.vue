<template>
  <div
    v-if="zone || values.length > 0"
    class="flex gap-1 items-center flex-wrap leading-5"
  >
    {{ where }}
    <template v-if="zone">
      <zone-badge
        :name="zone"
        :zone-networks="findZoneNetworks(zone)"
      />
    </template>
    <div
      v-for="(value, i) in values"
      :key="value.name"
      class="flex gap-1"
    >
      <template v-if="i + 1 === values.length && values.length > 1 && value.andSeperator">{{ value.andSeperator === true ? $t('and') : value.andSeperator }}</template>
      <fw-rule-value :property="value" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Zone } from '@/types/firewallTypes'
import FwRuleValue, { type FwRuleValue as FwRuleValueProp } from './FwRuleValue.vue'

export interface Props {
  values?: FwRuleValueProp[]
  zone?: string
  zones?: Zone[]
  where: string
}

const props = withDefaults(defineProps<Props>(), {
  values: () => [],
  zone: undefined,
  zones: () => []
})

function findZoneNetworks(zoneName: string): string[] {
  return props.zones.find(zone => zone.name === zoneName)?.network ?? []
}
</script>
