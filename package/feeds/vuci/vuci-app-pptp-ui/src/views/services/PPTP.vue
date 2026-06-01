<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="pptpd;network"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      ref="pptpSection"
      :title="$t('PPTP configuration')"
      :help="$t('This section displays PPTP instances currently existing on the router.')"
      :columns="vpnColumns"
      :edit-form="editModal"
      :uci-data="uciData"
      :endpoints="[
        { endpoint: 'pptp/server/config', sectionFilter: sections => sections['.type'] === 'service' },
        { endpoint: 'pptp/client/config', sectionFilter: section => section['.type'] === 'interface' },
        { endpoint: clientLimitReached ? 'pptp/server/config' : 'pptp/client/config' }
      ]"
      data-key="pptp"
      :table-actions="['column-list']"
      :after-delete="removeServerUsers"
    >
      <template #description="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="description"
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name=".type"
          :display-value="displayType"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>

      <template #action-design="{ actions }">
        <tlt-hint :hints="instanceLimitReached ? [{ info: $t('Maximum number of PPTP instances reached.') }] : []">
          <tlt-button
            :readonly="instanceLimitReached"
            button-id="add"
            @click="actions.create"
          >
            {{ $t('Add') }}
          </tlt-button>
        </tlt-hint>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './PPTPEdit'

export default {
  provide() {
    return {
      closeEdit: data => this.$refs.pptpSection._closeEdit(data),
      overviewUpdateUciData: (data, key) => this.$refs.vuciForm.updateUciData(data, key)
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      formData: [],
      networkNames: [],
      vpnColumns: [
        {
          name: 'description',
          label: this.$t('Tunnel name'),
          help: this.$t('Name of the tunnel. Used for easier tunnels management purpose only.')
        },
        { name: 'type', label: this.$t('Role'), help: this.$t('Type of tunnel instance.') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      typeOptions: [
        ['service', this.$t('Server')],
        ['interface', this.$t('Client')]
      ]
    }
  },
  computed: {
    serverLimitReached() {
      return this.formData.pptp?.filter(instance => instance['.type'] === 'service').length >= 1
    },
    clientLimitReached() {
      return this.formData.pptp?.filter(instance => instance['.type'] === 'interface').length >= 5
    },
    instanceLimitReached() {
      return this.serverLimitReached && this.clientLimitReached
    }
  },
  methods: {
    removeServerUsers(self) {
      if (self['.type'] === 'service') this.formData.pptp_server_users = []
    },
    displayType(value) {
      return value === 'service' ? this.$t('Server') : this.$t('Client')
    },
    afterLoad(form) {
      const endpoints = ['/api/interfaces/config']
      const server = form.pptp.find(instance => instance['.type'] === 'service')
      if (server) endpoints.push(`/api/pptp/server/${server.id}/users/config`)
      return this.$axios.bulkGet(endpoints).then(([networkRes, serverUsersRes]) => {
        if (networkRes.success) {
          this.networkNames = networkRes.data.map(network => network.id)
        } else {
          this.$message.error(this.$t('Failed to load network data'))
        }
        if (!serverUsersRes) {
          return { pptp_server_users: [] }
        }
        if (serverUsersRes.success) {
          return { pptp_server_users: serverUsersRes.data }
        } else {
          this.$message.error(this.$t('Failed to load PPTP server users data'))
        }
      })
    }
  }
}
</script>
