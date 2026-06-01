<template>
  <div class="flex gap-1 flex-wrap">
    <div>{{ option.value }}</div>
    <div
      v-if="!Number.isNaN(Number(option.key)) && $store.isSwitch"
      class="text-theme-text-subtle"
    >
      {{ '(ID: %s)'.format(option.key) }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ option: { value: string; key: string } }>()
</script>
