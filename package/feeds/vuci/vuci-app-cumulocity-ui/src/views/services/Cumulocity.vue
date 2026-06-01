<template>
  <base-cumulocity
    v-slot="{ s }"
    data-key="cumulocity"
    title="Cumulocity"
    name="cumulocity"
  >
    <vuci-form-item-switch
      :uci-section="s"
      :label="$t('Use SSL/TLS')"
      :help="$t('Use SSL/TLS protocol.')"
      name="ssl"
    />
  </base-cumulocity>
</template>

<script setup lang="ts">
import BaseCumulocity from '../../components/services/BaseCumulocity.vue'
</script>
