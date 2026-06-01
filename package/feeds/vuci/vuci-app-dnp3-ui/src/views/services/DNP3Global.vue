<template>
  <vuci-form
    v-slot="{ uciData }"
    editing
    config="dnp3_client"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="globals"
      :title="$t('DNP3 global settings')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dnp3/global' }]"
      data-key="global"
      :after-save="afterSave"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="client_enabled"
        :label="$t('Enabled')"
        initial="0"
        :help="$t('Turn on/off DNP3 client service.')"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['form'],
  methods: {
    afterSave(_, form) {
      this.form().globalStatus = form.data.client_enabled === '1'
    }
  }
}
</script>
