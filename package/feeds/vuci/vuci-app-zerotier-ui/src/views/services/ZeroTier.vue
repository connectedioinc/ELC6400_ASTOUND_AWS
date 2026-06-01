<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="zerotier"
    :after-load="loadData"
  >
    <vuci-typed-section
      :title="$t('ZeroTier configuration')"
      :table-actions="['search', 'column-list']"
      :columns="deviceColumns"
      type="instance"
      :uci-data="uciData"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'zerotier/config' }]"
      data-key="zerotier"
      :after-delete="deleteNetworks"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          name="name"
          :uci-section="s"
        />
      </template>
      <template #node_id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="node_id"
          no-write
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('New configuration name')"
          prop="name"
          required
          maxlength="8"
          :rules="v => [v.uciname, validateDuplicate]"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './ZeroTierEdit'

export default {
  provide() {
    return {
      formOptions: this.getFormOptions
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      formOptions: { interfaces: [] },
      deviceColumns: [
        {
          name: 'name',
          label: this.$t('ZeroTier name'),
          help: this.$t('Name of the ZeroTier instance. Used for easier management purpose only.')
        },
        {
          name: 'node_id',
          label: this.$t('Instance node ID'),
          help: this.$t('Value is only available after a successful connection.')
        },
        {
          name: 'enabled',
          label: this.$t('Enabled')
        }
      ],
      formData: {}
    }
  },
  methods: {
    validateDuplicate(val) {
      const instances = this.formData.zerotier.filter(f => f.name === val)
      if (instances.length === 0) return { isValid: true }
      return { isValid: false, message: this.$t("Name '%s' already exists").format(val) }
    },
    deleteNetworks(deletedSection, uciData) {
      uciData.zerotier_networks = uciData.zerotier_networks.filter(section => {
        return section['.type'] !== `network_${deletedSection.id}`
      })
    },
    getFormOptions() {
      return this.formOptions
    },
    loadData(form) {
      const zerotierRequests = form.zerotier.map(section => `/api/zerotier/${section.id}/networks/config`)
      const requests = ['/api/interfaces/config', ...zerotierRequests]
      return this.$axios
        .bulkGet(requests)
        .then(([interfaces, ...zerotier]) => {
          if (!interfaces.success) this.$message.error(this.$t('Failed to load interfaces'))
          this.formOptions.interfaces = interfaces.success ? interfaces.data : []
          const sections = zerotier.reduce((data, response, index) => {
            if (!response.success) {
              response.data = []
              this.$message.error(this.$t('Failed to load %s instance').format(this.formData.zerotier[index].name))
            }
            return data.concat(response.data)
          }, [])
          return { zerotier_networks: sections || [] }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    }
  }
}
</script>
