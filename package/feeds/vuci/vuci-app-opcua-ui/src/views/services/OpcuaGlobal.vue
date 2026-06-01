<template>
  <vuci-form
    v-slot="{ uciData }"
    editing
    config="opcua_client"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="globals"
      :title="$t('OPC UA global settings')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'opcua/global' }]"
      data-key="global"
      :after-save="afterSave"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enabled')"
        initial="0"
        :help="$t('Turn on/off OPC UA service.')"
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
