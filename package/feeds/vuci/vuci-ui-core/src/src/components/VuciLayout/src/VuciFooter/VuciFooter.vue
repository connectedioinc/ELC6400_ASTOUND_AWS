<template>
  <div class="border-t bg-theme-bg-surface w-full lg:px-10 px-4 py-2.5">
    <div class="w-full max-w-(--breakpoint-2xl) mx-auto flex justify-between items-center gap-3 flex-wrap leading-5">
      <FooterItems
        :items="footerItemsStart"
        @click="onItemClick"
      />
      <FooterItems
        :items="footerItemsEnd"
        @click="onItemClick"
      />
    </div>
  </div>
  <licenses-modal
    :open="showLicensesModal"
    @close="showLicensesModal = false"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { brand } from '@ui-core/plugins/brand'
import FooterItems, { type FooterItem } from './FooterItems.vue'

const LicensesModal = defineAsyncComponent(() => import('./LicensesModal.vue'))

const footerItemsStart: FooterItem[] = brand.text('footer')?.start || []
const footerItemsEnd: FooterItem[] = brand.text('footer')?.end || []

const showLicensesModal = ref(false)

function onItemClick(type: string) {
  if (type === 'licenses') {
    showLicensesModal.value = true
  }
}
</script>
