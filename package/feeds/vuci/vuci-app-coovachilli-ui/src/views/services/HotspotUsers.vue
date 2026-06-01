<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="chilli"
    :after-load="loadData"
  >
    <vuci-typed-section
      type="user"
      :uci-data="uciData"
      :title="$t('Local users')"
      :table-actions="['search', 'column-list']"
      :columns="columns"
      :endpoints="[{ endpoint: 'hotspot/users/config' }]"
      data-key="users"
      :exception-options="['password']"
      :edit-form="HotspotUserEdit"
      :add-validate="addSection"
      no-edit-after-create
      :add-title="$t('Add new user')"
    >
      <template #username="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="username"
        />
      </template>
      <template #group="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="group"
          :options="groups"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.username"
          required
          :label="$t('Username')"
          prop="username"
          rules="credentials_validate"
          maxlength="255"
        />
        <tlt-form-item-password
          v-model="addModel.password"
          :label="$t('Password')"
          rules="credentials_validate"
          maxlength="512"
          prop="password"
          required
          can-randomize
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import HotspotUserEdit from './HotspotUserEdit'

export default {
  provide() {
    return {
      groups: this.getGroups
    }
  },
  data() {
    return {
      formData: {},
      columns: [
        { name: 'username', label: this.$t('Username') },
        { name: 'group', label: this.$t('Group') }
      ],
      HotspotUserEdit: markRaw(HotspotUserEdit),
      groups: []
    }
  },
  methods: {
    getGroups() {
      return this.groups
    },
    groupOptionsMapping(groups) {
      return groups.length !== 0 ? groups.map(group => group.name) : ['', this.$t('No groups available')]
    },
    loadData() {
      return this.$axios
        .get('/api/hotspot/groups/config')
        .then(groups => {
          this.groups = this.groupOptionsMapping(groups.data)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load user group data'))
        })
    },
    addSection(addForm) {
      const usernameExists = this.formData.users.some(user => user.username === addForm.username)
      if (!usernameExists) return { valid: true }
      return {
        message: this.$t('User with username %s already exists').format(addForm.username),
        valid: false
      }
    }
  }
}
</script>
