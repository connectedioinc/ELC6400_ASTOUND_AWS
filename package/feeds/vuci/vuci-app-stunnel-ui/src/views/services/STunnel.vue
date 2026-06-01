<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="loadData"
    config="stunnel"
  >
    <vuci-typed-section
      type="service"
      :title="$t('Stunnel configuration')"
      :table-actions="['search', 'column-list']"
      :help="$t('This section displays Stunnel instances currently existing on the router.')"
      :columns="deviceColumns"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'stunnel/config' }]"
      data-key="stunnels"
      :uci-data="uciData"
      :add-validate="onAdd"
      :global-settings-form="globalModal"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #accept_host="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="accept_host"
          :display-value="displayHost"
        />
      </template>
      <template #client="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="client"
          :display-value="displayClient"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :readonly="getEnabledHint(s).length > 0"
          :hints="getEnabledHint(s)"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('New configuration name')"
          prop="id"
          required
          :help="$t('Name of the new Stunnel configuration. Used for easier configurations management purpose only.')"
          rules="uciname"
          maxlength="8"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './STunnelEdit'
import GlobalForm from './STunnelGlobal'

export default {
  provide() {
    return {
      form: () => this.formData,
      warningMessages: () => this.warningMessages,
      setWarningMessages: messages => (this.warningMessages = messages)
    }
  },
  data() {
    return {
      formData: {},
      editModal: markRaw(EditForm),
      globalModal: markRaw(GlobalForm),
      deviceColumns: [
        {
          name: 'name',
          label: this.$t('Tunnel name'),
          help: this.$t('Name of the tunnel. Used for easier tunnels management purpose only.')
        },
        {
          name: 'accept_host',
          label: this.$t('Listening on'),
          help: this.$t('IP and port which server will be listening to.')
        },
        {
          name: 'client',
          label: this.$t('Operation mode'),
          help: `${this.$t('Stunnel operation mode.')} <br> * ${this.$t('Server - Only listening on specified IP and Port.')} <br> * ${this.$t(
            'Client - Both listening and connecting to specified IPs.'
          )}`,
          rawhtml: true
        },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      warningMessages: []
    }
  },
  methods: {
    loadData(_, responses) {
      if (responses[0]?.messages) this.warningMessages = responses[0].messages
    },
    onAdd(addForm, dataSource) {
      if (dataSource.filter(source => source['.type'] === 'service').length > 4) {
        return { valid: false, message: this.$t("Can't create more instances. Only 5 Stunnel instances are allowed") }
      }
      return { valid: true }
    },
    displayHost(value, self) {
      return self.uciSection.accept_host && self.uciSection.accept_port ? `${self.uciSection.accept_host}:${self.uciSection.accept_port}` : this.$t('Not set')
    },
    displayClient(value) {
      if (value === '1') return this.$t('Client')
      if (value === '0') return this.$t('Server')
      return this.$t('Not set')
    },
    getEnabledHint(section) {
      const hint = [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }]
      // section.client can be '' in that case return false
      if (!section.client) return hint
      const isClient = section.client === '1'
      const clientRequired = !section.accept_host || !section.accept_port || !section.connect
      const serverRequired = clientRequired || !section.cert || !section.key
      const hasMissingValues = isClient ? clientRequired : serverRequired
      return hasMissingValues ? hint : []
    }
  }
}
</script>
