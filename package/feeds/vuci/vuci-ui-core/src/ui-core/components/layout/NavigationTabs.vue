<template>
  <TltTabs
    v-model:selected="selectedTab"
    :class="{ 'navigation-tabs': tabs?.length > 1 }"
    :tabs="tabs"
    :inner="false"
  >
    <template
      v-for="(_, name) of $slots"
      #[name]="slotProps"
      :key="name"
    >
      <slot
        :name="name"
        v-bind="slotProps"
      />
    </template>
  </TltTabs>
</template>

<script setup lang="ts">
import type { Tab } from '../tabs/TltTabs.vue'

export interface Props {
  tabs?: Tab[]
}

withDefaults(defineProps<Props>(), {
  tabs: undefined
})

const selectedTab = defineModel<string>('selected', { default: '' })
</script>

<style scoped>
@reference '@/theme.css';

@media not all and (min-width: theme(--breakpoint-md)) {
  .navigation-tabs {
    margin-inline: -1rem;
  }

  .navigation-tabs :deep([role='tablist']) {
    margin-left: 1rem;
  }
  .navigation-tabs :deep([role='tablist'] [role='tab'].active-tab::before) {
    display: block;
  }

  .navigation-tabs :deep([role='tabpanel']) {
    border-inline: unset;
    border-radius: 0;
  }
}
</style>
