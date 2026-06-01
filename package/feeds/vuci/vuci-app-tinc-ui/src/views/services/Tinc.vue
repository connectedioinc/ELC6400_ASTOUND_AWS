<template>
  <vuci-form
    v-slot="{ uciData }"
    config="tinc"
    :after-load="loadHosts"
  >
    <vuci-typed-section
      :title="$t('Tinc configuration')"
      :columns="deviceColumns"
      type="tinc-net"
      :uci-data="uciData"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'tinc/config' }]"
      :table-actions="['column-list', 'search']"
      data-key="tinc"
      :add-validate="onAdd"
      :after-delete="deleteHosts"
    >
      <template #id="{ s }">
        <vuci-form-item-dummy
          name="id"
          :uci-section="s"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          name="enabled"
          :uci-section="s"
          @change="validateEnable"
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
import EditForm from './TincEdit'

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
        {
          name: 'id',
          label: this.$t('Tunnel name'),
          help: this.$t('Name of the tunnel. Used for easier tunnels management purpose only.')
        },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      formOptions: {
        interfaceData: []
      }
    }
  },
  methods: {
    getFormOptions() {
      return this.formOptions
    },
    loadHosts(form) {
      const hostsRequests = form.tinc.map(s => `/api/tinc/${s.id}/hosts/config`)
      const requests = ['/api/interfaces/config', ...hostsRequests]
      return this.$axios
        .bulkGet(requests)
        .then(res => {
          const interfacesResponse = res.shift()
          if (interfacesResponse.success) {
            this.formOptions = {
              interfaceData: interfacesResponse.data
            }
          } else {
            this.$message.error(this.$t('Failed to load network interfaces'))
          }
          const reqError = res.some(x => x.success === false)
          const sections = reqError ? [] : res.flatMap(x => x.data)
          if (reqError) {
            this.$message.error(this.$t('Failed to load Tinc hosts.'))
          }
          return { tinc_hosts: sections }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    onAdd(_, dataSource) {
      if (dataSource.length >= 5) {
        return {
          valid: false,
          message: this.$t('Cannot create more instances. Only 5 instances are allowed.')
        }
      }
      return { valid: true }
    },
    validateEnable(self) {
      const section = self.uciSection
      const requiredEnableOptions = []
      if (!section.privatekeyfile && section.enabled === '1') {
        requiredEnableOptions.push(this.$t('Private key'))
      }
      if (!section.publickeyfile && section.enabled === '1') {
        requiredEnableOptions.push(this.$t('Public key'))
      }
      if (requiredEnableOptions.length === 1) {
        this.$message.error(this.$t('Missing required option: %s').format(requiredEnableOptions))
        self.model = '0'
      }
      if (requiredEnableOptions.length > 1) {
        this.$message.error(this.$t('Missing required options: %s').format(requiredEnableOptions.join(', ')))
        self.model = '0'
      }
    },
    deleteHosts(deletedSection, uciData) {
      uciData.tinc_hosts = uciData.tinc_hosts.filter(section => {
        return section['.type'] !== `tinc-host_${deletedSection.id}`
      })
    }
  }
}
</script>
