<template>
  <vuci-form
    v-slot="{ uciData }"
    config="network"
    :after-load="loadData"
  >
    <vuci-typed-section
      type="interface"
      :title="$t('L2TPv3 configuration')"
      :endpoints="[{ endpoint: 'l2tpv3/config' }]"
      :table-actions="['search', 'column-list']"
      :uci-data="uciData"
      :columns="deviceColumns"
      :edit-form="editModal"
      data-key="l2tpdv3"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :readonly="enableReadonly(s)"
          :hints="getEnableHint(s)"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          required
          :label="$t('New configuration name')"
          prop="id"
          :help="$t('Name of the new L2TPV3 configuration. Used for easier configurations management purpose only.')"
          maxlength="8"
          rules="uciname"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './L2tpv3Edit'

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
        { name: 'name', label: this.$t('Name') },
        { name: 'enabled', label: this.$t('Enabled') }
      ]
    }
  },
  methods: {
    getFormOptions() {
      return this.formOptions
    },
    enableReadonly(section) {
      return !(section.tunnel_id && section.session_id && section.peeraddr && section.peer_tunnel_id && section.peer_session_id)
    },
    getEnableHint(section) {
      return this.enableReadonly(section) ? [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    },
    loadData() {
      return this.$axios
        .get('/api/interfaces/config')
        .then(({ data: interfaces }) => {
          this.formOptions = { interfaces }
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load interfaces'))
        })
    }
  }
}
</script>
