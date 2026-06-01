<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="user_groups"
    :after-load="loadData"
  >
    <vuci-typed-section
      :title="$t('Allowlisted phone groups for %s management').format(titleExtension)"
      :table-actions="['search', 'column-list']"
      :columns="hostColumns"
      :edit-form="phoneGroupEdit"
      :form-methods="['get', 'delete', 'create']"
      :uci-data="uciData"
      type="phone"
      :endpoints="[{ endpoint: 'recipients/phone_groups/config' }]"
      data-key="groups"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #tel="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="tel"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('Name')"
          :rules="['defaulttype', instanceExists]"
          maxlength="16"
          prop="name"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import phoneGroupEdit from './PhoneGroupEdit'

export default {
  data() {
    return {
      phoneGroupEdit: markRaw(phoneGroupEdit),
      hostColumns: [
        { name: 'name', label: this.$t('Group name') },
        { name: 'tel', label: this.$t('Phone number') }
      ],
      modems: [],
      formData: {}
    }
  },
  computed: {
    titleExtension() {
      return this.modems.every(modem => /^EC25AFFD/.test(modem.version)) ? 'SMS' : 'SMS/Call'
    }
  },
  methods: {
    loadData() {
      return this.$axios
        .get('/api/modems/status')
        .then(({ data }) => {
          this.modems = this.$mobile.parseModems(data)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load modem data'))
        })
    },
    instanceExists(val) {
      const { groups } = this.formData
      const groupExists = groups.some(group => group.name === val)
      if (!groupExists) return { isValid: true }
      return {
        isValid: false,
        message: this.$t("Phone group name '%s' already exists").format(val)
      }
    }
  }
}
</script>
