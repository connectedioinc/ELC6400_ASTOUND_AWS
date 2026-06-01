<template>
  <vuci-form
    v-slot="{ uciData }"
    config="dmvpn;nhrp;network;firewall;ipsec"
    :after-load="loadData"
  >
    <vuci-typed-section
      type="dmvpn"
      :title="$t('DMVPN configuration')"
      :table-actions="['search', 'column-list']"
      :columns="deviceColumns"
      :edit-form="editModal"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dmvpn/config' }]"
      data-key="dmvpn"
      :exception-options="['pre_shared_key']"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #hub_address="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="hub_address"
        />
      </template>
      <template #config_mode="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="config_mode"
          :display-value="loadMode"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="validatePsk(s)"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('New configuration name')"
          prop="id"
          required
          :help="$t('Name of the new DMVPN configuration. Used for easier configurations management purpose only.')"
          rules="uciname"
          maxlength="8"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './DmvpnEdit'

export default {
  provide() {
    return {
      formOptions: this.getFormOptions
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      deviceColumns: [
        { name: 'name', label: this.$t('Tunnel name') },
        { name: 'hub_address', label: this.$t('Hub address') },
        { name: 'config_mode', label: this.$t('Configuration mode') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      formOptions: {
        interfaces: [],
        gre: []
      }
    }
  },
  methods: {
    getFormOptions() {
      return this.formOptions
    },
    loadMode(value) {
      return value.charAt(0).toUpperCase() + value.slice(1)
    },
    loadData() {
      const requests = ['/api/gre/config', '/api/interfaces/config']
      return this.$axios
        .bulkGet(requests)
        .then(([greData, interfaces]) => {
          if (!greData.success) this.$message.error(this.$t('Failed to load gre data'))
          if (!interfaces.success) this.$message.error(this.$t('Failed to load interface data'))
          this.formOptions.interfaces = interfaces.success ? interfaces.data : []
          this.formOptions.gre = greData.success ? greData.data : []
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    validatePsk(self) {
      if (!self.pre_shared_key && self.enabled === '1') {
        self.enabled = '0'
        this.$message.error(this.$t('Missing required option: Pre-shared key'))
      }
    }
  }
}
</script>
