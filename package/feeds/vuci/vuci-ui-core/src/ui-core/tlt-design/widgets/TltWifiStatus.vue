<template>
  <div class="flex gap-1">
    <div
      class="text-theme-text-primary text-body-main"
      :test-id="up ? 'meter-container-on' : 'meter-container-off'"
    >
      {{ up ? $t('ON') : $t('OFF') }}
    </div>
    <tlt-icon
      icon="wifi"
      class="inline-block size-5"
      :class="up ? 'text-theme-text-primary' : 'text-theme-text-subtle'"
    />
  </div>
</template>

<script setup lang="ts">
export interface Props {
  up: boolean
}

defineProps<Props>()
</script>
