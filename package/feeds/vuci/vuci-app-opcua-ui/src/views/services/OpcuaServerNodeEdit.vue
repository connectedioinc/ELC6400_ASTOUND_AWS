<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="opcua_client"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      :title="$utils.getModalTitle($t('OPC UA server node'), section.name)"
      data-key="serverNodes"
      :endpoints="[{ endpoint: `opcua/server/${section['.type'].split('_')[2]}/nodes/config` }]"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="name"
        :label="$t('Name')"
        :help="$t('Name of the server node.')"
        :rules="['uciname', v => nodeExistsInServer(v)]"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="ns"
        :label="$t('ID namespace')"
        :help="$t('Node ID namespace.')"
        rules="irange(0,65535)"
        placeholder="1"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="type"
        :label="$t('ID type')"
        :help="$t('Node ID type.')"
        required
        :options="idTypeOptions"
        @change="updateValidations"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="node_id"
        :label="$t('ID')"
        :help="$t('Node ID.')"
        :rules="getIDRule(s)"
        required
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      idTypeOptions: [
        ['0', this.$t('Numeric')],
        ['1', this.$t('String')],
        ['2', this.$t('GUID')],
        ['3', this.$t('Bytestring')]
      ]
    }
  },
  methods: {
    getIDRule(s) {
      const rules = {
        0: 'range(0,4294967295)',
        1: 'string',
        2: 'guid',
        3: 'base64'
      }
      return rules[parseInt(s.type, 10)]
    },
    nodeExistsInServer(val) {
      if (this.formData.serverNodes.filter(o => o['.type'] === this.section['.type'] && o.name === val).length > 1) {
        return { isValid: false, message: this.$t("Instance '%s' already exists").format(val) }
      }
      return { isValid: true }
    },
    updateValidations(self) {
      self.vuciSection.validate()
    }
  }
}
</script>
