<template>
  <vuci-form
    v-slot="{ uciData }"
    editing
    config="dlms_client"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="globals"
      :title="$t('DLMS global settings')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dlms/global' }]"
      data-key="global"
      :after-save="afterSave"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enabled')"
        initial="0"
        :help="$t('Turn on/off DLMS service.')"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['form'],
  methods: {
    afterSave(_, form) {
      this.form().globalStatus = form.data.enabled === '1'
    }
  }
}
</script>
