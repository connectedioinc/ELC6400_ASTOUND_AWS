<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="opcua_client"
    :after-load="loadData"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      :title="$utils.getModalTitle($t('OPC UA group value'), section.name)"
      data-key="groupValue"
      :endpoints="[{ endpoint: `opcua/group/${section['.type'].split('_')[1]}/values/config` }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enabled')"
        :help="$t('Whether the value is enabled.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="name"
        :label="$t('Name')"
        :help="$t('Name of the value (no functional use).')"
        :rules="['uciname', v => valueExistsInGroup(v)]"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="prefix"
        :label="$t('Prefix')"
        :help="$t('String before the value.')"
        rules="string"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="postfix"
        :label="$t('Postfix')"
        :help="$t('String after the value.')"
        rules="string"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="replacement"
        :label="$t('Replacement')"
        :help="$t('String to replace everything in case of failure.')"
        rules="string"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="server"
        :label="$t('Server')"
        :help="$t('Server to retrieve data from.')"
        required
        :options="getServerOptions"
        no-write
      />
      <vuci-form-item-select
        :uci-section="s"
        name="server_node"
        :label="$t('Server node')"
        :help="$t('Server node to retrieve data from.')"
        required
        :options="getServerNodeOptions"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  inject: {
    setSection: {
      default: () => {}
    }
  },
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {}
    }
  },
  computed: {
    getServerOptions() {
      return this.formData.server.map(node => [node.id, node.name])
    },
    getServerNodeOptions() {
      return this.formData.serverNodes.filter(node => node['.type'] === `server_node_${this.section.server}`).map(node => [node.id, node.name])
    }
  },
  methods: {
    valueExistsInGroup(val) {
      if (this.formData.groupValue.filter(o => o['.type'] === this.section['.type'] && o.name === val).length > 1) {
        return { isValid: false, message: this.$t("Instance '%s' already exists").format(val) }
      }
      return { isValid: true }
    },
    loadData() {
      const serverNode = this.formData.serverNodes.find(node => node.id === this.section.server_node)
      if (!serverNode) return Promise.resolve()
      const serverId = serverNode['.type'].split('_')[2]
      this.setSection(section => (section.server = serverId))
      return Promise.resolve()
    }
  }
}
</script>
