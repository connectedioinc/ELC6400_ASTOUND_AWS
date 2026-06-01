<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="zerotier"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'zerotier/config' }]"
      :name="section.id"
      :title="$utils.getModalTitle($t('instance'), section.name)"
      :uci-data="uciData"
      data-key="zerotier"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Turn this ZeroTier interface on/off.')"
        name="enabled"
      />
      <vuci-form-item-dummy
        :uci-section="s"
        :label="$t('Node ID')"
        :help="$t('Router\'s unique ID for ZeroTier VPN.')"
        name="node_id"
        no-write
      />
    </vuci-named-section>
    <vuci-typed-section
      :type="'network_' + section.id"
      :endpoints="[{ endpoint: `zerotier/${section.id}/networks/config` }]"
      :uci-data="uciData"
      :title="$utils.getModalTitle($t('network'))"
      :table-actions="['search', 'column-list']"
      :help="$t('Here you can configure your network.')"
      :columns="networksColumns"
      :edit-form="editModal"
      data-key="zerotier_networks"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #network_id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="network_id"
          :required="s.enabled !== '0'"
        />
      </template>
      <template #port="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="port"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="self => validateEnable(self)"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('Add new network')"
          prop="name"
          required
          placeholder="Network name"
          maxlength="32"
          :rules="v => [v.uciname, validateDuplicate]"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './ZeroTierNetworksEdit'

export default {
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      networksColumns: [
        { name: 'name', label: this.$t('Network name') },
        { name: 'network_id', label: this.$t('Network ID') },
        { name: 'port', label: this.$t('Port') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      formData: {}
    }
  },
  methods: {
    validateDuplicate(val) {
      const instances = this.formData.zerotier_networks.filter(f => f.name === val)
      if (instances.length === 0) return { isValid: true }
      return { isValid: false, message: this.$t("Name '%s' already exists").format(val) }
    },
    validateEnable(self) {
      const section = self.uciSection
      if (section.enabled === '1' && !section.network_id) {
        section.enabled = '0'
        this.$message.error(this.$t('"Network ID" must be set to enable the network'))
      }
    }
  }
}
</script>
