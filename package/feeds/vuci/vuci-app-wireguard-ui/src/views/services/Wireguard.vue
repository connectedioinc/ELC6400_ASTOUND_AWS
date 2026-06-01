<template>
  <vuci-form
    v-slot="{ uciData }"
    config="network"
    :after-load="loadData"
  >
    <!--TODO: Remove exception-options when full api is released-->
    <vuci-typed-section
      :title="$t('WireGuard configuration')"
      :columns="deviceColumns"
      type="interface"
      :uci-data="uciData"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'wireguard/config' }]"
      data-key="wireguard"
      :after-delete="deletePeers"
      :table-actions="['search', 'column-list']"
      :exception-options="['private_key']"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          name="id"
          :uci-section="s"
        />
      </template>
      <template #public_key="{ s }">
        <vuci-form-item-dummy
          name="public_key"
          :uci-section="s"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          name="enabled"
          :uci-section="s"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('New configuration name')"
          prop="id"
          required
          maxlength="8"
          rules="uciname"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './WireguardEdit'

export default {
  provide() {
    return {
      formOptions: () => this.formOptions
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      deviceColumns: [
        {
          name: 'name',
          label: this.$t('Tunnel name'),
          help: this.$t('Name of the tunnel. Used for easier tunnels management purpose only.')
        },
        { name: 'public_key', label: this.$t('Public key') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      formOptions: {
        interfaces: [],
        interfaceStatus: []
      }
    }
  },
  methods: {
    loadData(form) {
      const requests = ['/api/interfaces/config', '/api/interfaces/status']
      form.wireguard.forEach(section => {
        requests.push(`/api/wireguard/${section.id}/peers/config`)
      })
      return this.$axios
        .bulkGet(requests)
        .then(([interfaces, interfaceStatus, ...peerResponses]) => {
          if (peerResponses.some(peer => !peer.success)) this.$message.error(this.$t('Failed to load Peers data'))
          const sections = peerResponses.reduce((data, response) => {
            return data.concat(response.success ? response.data : [])
          }, [])
          if (!interfaces.success) this.$message.error(this.$t('Failed to load interface data'))
          else this.formOptions.interfaces = interfaces.data
          if (!interfaceStatus.success) this.$message.error(this.$t('Failed to load interface status'))
          else this.formOptions.interfaceStatus = interfaceStatus.data
          return { wireguard_peers: sections }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    deletePeers(deletedSection, uciData) {
      this.formOptions.interfaceStatus = this.formOptions.interfaceStatus.filter(i => i.id !== deletedSection.id)
      uciData.wireguard_peers = uciData.wireguard_peers.filter(section => {
        return section['.type'] !== `wireguard_${deletedSection.id}`
      })
    }
  }
}
</script>
