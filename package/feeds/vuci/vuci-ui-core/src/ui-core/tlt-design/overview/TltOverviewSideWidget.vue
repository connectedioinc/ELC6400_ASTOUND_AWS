<template>
  <div class="px-4 h-full! overflow-y-auto overflow-x-hidden">
    <div class="min-h-0 bg-theme-bg-surface border border-theme-border-base rounded-lg my-4 px-4 py-2">
      <h3 class="text-fish font-semibold mt-2 mb-4 border-b pb-1">
        <span class="font-sans">{{ $t('Overview Settings') }}</span>
      </h3>
      <tlt-check-box
        v-for="item in cards"
        :key="item.id + '_' + item.sectionName"
        :model-value="item.enabled === '1'"
        class="mb-1 hover:bg-theme-bg-hover"
        :custom-id="item.id + '_' + item.sectionName"
        :disabled="!hasAccess"
        @update:model-value="v => _checkCheckBox(v, item)"
      >
        <div class="uppercase ml-2 text-body-secondary break-all">
          {{ item.content.title }}
        </div>
      </tlt-check-box>
    </div>
  </div>
</template>
<script>
import { formBus } from '@ui-core/vuci-form'

export default {
  data() {
    return {
      opened: false
    }
  },
  computed: {
    cards() {
      return this.$store.overviewCards
    },
    hasAccess() {
      return this.$session.hasAccess('status/overview', 'write')
    }
  },
  methods: {
    _checkCheckBox(value, item) {
      item.enabled = value ? '1' : '0'
      formBus.emit('update-overview', this.cards)
    }
  }
}
</script>
